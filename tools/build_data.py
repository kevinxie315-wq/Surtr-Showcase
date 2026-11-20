#!/usr/bin/env python3
"""
Surtr showcase - data builder.

Reads the resource pack (zip or folder) and writes the web-ready model/texture data
that the site loads on demand:

    data/index.js            manifest of every model (name, element count, bounding box, textures)
    data/models/<name>.js    one compact model per file
    data/tex/<name>.js       one texture per file (base64 PNG + animation info)

Usage:
    python3 tools/build_data.py path/to/Surtr_Resource_Pack_v2_7.zip [output_dir]

The data files are plain <script> payloads (not fetch()ed JSON) so the site also works
when index.html is opened straight from disk (file://).
"""
import base64
import json
import os
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def r3(x):
    v = round(float(x), 3)
    return int(v) if v == int(v) else v


class Pack:
    """Tiny abstraction over a zip file or an unpacked folder."""

    def __init__(self, path):
        self.zip = zipfile.ZipFile(path) if path.lower().endswith(".zip") else None
        self.root = None if self.zip else path

    def names(self, prefix):
        if self.zip:
            return [n for n in self.zip.namelist() if n.startswith(prefix) and not n.endswith("/")]
        out = []
        for d, _, files in os.walk(os.path.join(self.root, prefix)):
            for f in files:
                out.append(os.path.relpath(os.path.join(d, f), self.root).replace(os.sep, "/"))
        return out

    def read(self, name):
        if self.zip:
            return self.zip.read(name)
        with open(os.path.join(self.root, name), "rb") as fh:
            return fh.read()

    def exists(self, name):
        if self.zip:
            return name in self.zip.namelist()
        return os.path.exists(os.path.join(self.root, name))


AXES = {"x": 0, "y": 1, "z": 2}
FACES = ["north", "south", "east", "west", "up", "down"]


def convert_model(raw):
    d = json.loads(raw)
    tex_map = d.get("textures", {})
    used = []
    elements = []
    src_elements = d.get("elements", [])
    if not src_elements and "layer0" in tex_map:
        # Flat "item/handheld" sprite: draw it as a thin card so it can be shown in the viewer.
        src_elements = [{
            "from": [0, 0, 7.5], "to": [16, 16, 8.5],
            "faces": {"north": {"uv": [0, 0, 16, 16], "texture": "#layer0"},
                      "south": {"uv": [16, 0, 0, 16], "texture": "#layer0"}},
        }]
    for e in src_elements:
        o = {"f": [r3(v) for v in e["from"]], "t": [r3(v) for v in e["to"]]}
        if "rotation" in e:
            rot = e["rotation"]
            o["r"] = [r3(rot["angle"]), AXES[rot["axis"]]] + [r3(v) for v in rot["origin"]]
        flags = 0
        if e.get("shade") is False:
            flags |= 1
        if e.get("light_emission", 0) > 0:
            flags |= 2
        if flags:
            o["s"] = flags
        faces = {}
        for fname, face in e["faces"].items():
            tkey = face["texture"].lstrip("#")
            if tkey not in used:
                used.append(tkey)
            faces[fname] = [used.index(tkey)] + [r3(v) for v in face["uv"]]
        o["u"] = faces
        elements.append(o)
    tex_names = []
    for k in used:
        ref = tex_map[k]
        tex_names.append(ref.split("/")[-1])
    return {"tex": tex_names, "el": elements}


def bbox(model):
    lo = [1e9] * 3
    hi = [-1e9] * 3
    for e in model["el"]:
        for i in range(3):
            lo[i] = min(lo[i], e["f"][i], e["t"][i])
            hi[i] = max(hi[i], e["f"][i], e["t"][i])
    return [r3(v) for v in lo], [r3(v) for v in hi]


def convert_texture(pack, name):
    png = pack.read(f"assets/surtr/textures/item/{name}.png")
    # read PNG size from the IHDR chunk (bytes 16..24)
    w = int.from_bytes(png[16:20], "big")
    h = int.from_bytes(png[20:24], "big")
    meta_path = f"assets/surtr/textures/item/{name}.png.mcmeta"
    fw, fh, frames = w, w, None
    if pack.exists(meta_path):
        anim = json.loads(pack.read(meta_path)).get("animation", {})
        fw = anim.get("width", w)
        fh = anim.get("height", anim.get("width", w))
        count = max(1, h // fh)
        ft = anim.get("frametime", 1)
        if "frames" in anim:
            frames = []
            for fr in anim["frames"]:
                if isinstance(fr, int):
                    frames.append([fr, ft])
                else:
                    frames.append([fr["index"], fr.get("time", ft)])
        else:
            frames = [[i, ft] for i in range(count)]
    else:
        fh = h
        frames = [[0, 1]]
    return {
        "src": "data:image/png;base64," + base64.b64encode(png).decode("ascii"),
        "w": w, "h": h, "fw": fw, "fh": fh,
        "n": max(1, h // fh),
        "frames": frames,
        # the phase-3 art flashes between bright and dim (see the resource pack README)
        "strobe": name.endswith("_p3") or "_p3" in name,
    }


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    pack = Pack(sys.argv[1])
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, "data")
    os.makedirs(os.path.join(out, "models"), exist_ok=True)
    os.makedirs(os.path.join(out, "tex"), exist_ok=True)

    manifest = {}
    needed_tex = set()
    for path in sorted(pack.names("assets/surtr/models/item/")):
        name = os.path.basename(path)[:-5]
        model = convert_model(pack.read(path))
        lo, hi = bbox(model)
        manifest[name] = {"el": len(model["el"]), "tex": model["tex"], "lo": lo, "hi": hi}
        needed_tex.update(model["tex"])
        payload = json.dumps(model, separators=(",", ":"))
        with open(os.path.join(out, "models", name + ".js"), "w") as fh:
            fh.write(f'SurtrData.model({json.dumps(name)},{payload});\n')

    tex_info = {}
    for name in sorted(needed_tex):
        t = convert_texture(pack, name)
        tex_info[name] = {k: t[k] for k in ("w", "h", "fw", "fh", "n", "strobe")}
        with open(os.path.join(out, "tex", name + ".js"), "w") as fh:
            fh.write(f'SurtrData.tex({json.dumps(name)},{json.dumps(t, separators=(",", ":"))});\n')

    # The 2D sprites used for item cards come straight from the textures too
    for name in ["sa_core", "sa_hilt", "sa_blade", "sa_flame", "sa_sumar", "sa_godsumar", "sa_pulse", "sa_bif_halo"]:
        if name not in tex_info and pack.exists(f"assets/surtr/textures/item/{name}.png"):
            t = convert_texture(pack, name)
            tex_info[name] = {k: t[k] for k in ("w", "h", "fw", "fh", "n", "strobe")}
            with open(os.path.join(out, "tex", name + ".js"), "w") as fh:
                fh.write(f'SurtrData.tex({json.dumps(name)},{json.dumps(t, separators=(",", ":"))});\n')

    with open(os.path.join(out, "index.js"), "w") as fh:
        fh.write("window.SurtrManifest=" + json.dumps({"models": manifest, "tex": tex_info}, separators=(",", ":")) + ";\n")
    print(f"{len(manifest)} models, {len(tex_info)} textures written to {out}")


if __name__ == "__main__":
    main()
