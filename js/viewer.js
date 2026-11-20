/* ============================================================
   Surtr showcase - model loader, 3D viewer, sprite player.
   Renders the resource pack's block-model JSON (elements, face UVs,
   element rotation, shade / light_emission, animated texture strips)
   with three.js r128.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- data loader (script-tag based, so file:// works) ---------- */
  var SD = (window.SurtrData = {
    models: {}, texs: {}, _wait: {},
    model: function (n, d) { SD.models[n] = d; SD._done("m:" + n); },
    tex: function (n, d) {
      var img = new Image();
      img.onload = function () { d.img = img; SD.texs[n] = d; SD._done("t:" + n); };
      img.src = d.src;
    },
    _done: function (k) { var w = SD._wait[k]; if (w) { w.forEach(function (f) { f(); }); delete SD._wait[k]; } },
    _load: function (key, src, ready) {
      return new Promise(function (resolve, reject) {
        if (ready()) return resolve();
        var first = !SD._wait[key];
        (SD._wait[key] = SD._wait[key] || []).push(resolve);
        if (first) {
          var s = document.createElement("script");
          s.src = src;
          s.onerror = function () { reject(new Error("Could not load " + src)); };
          document.head.appendChild(s);
        }
      });
    },
    getModel: function (n) {
      return SD._load("m:" + n, "data/models/" + n + ".js", function () { return !!SD.models[n]; })
        .then(function () { return SD.models[n]; });
    },
    getTex: function (n) {
      return SD._load("t:" + n, "data/tex/" + n + ".js", function () { return !!SD.texs[n]; })
        .then(function () { return SD.texs[n]; });
    }
  });

  var reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  SD.reduceMotion = reduceMotion;

  /* ---------- frame selection for animated strips ---------- */
  function frameAt(info, timeMs, play) {
    if (!play || !info.frames || info.frames.length < 2) return info.frames ? info.frames[0][0] : 0;
    var total = 0, i;
    for (i = 0; i < info.frames.length; i++) total += info.frames[i][1];
    var t = (timeMs / 50) % total;
    for (i = 0; i < info.frames.length; i++) {
      if (t < info.frames[i][1]) return info.frames[i][0];
      t -= info.frames[i][1];
    }
    return info.frames[0][0];
  }
  SD.frameAt = frameAt;

  /* ---------- geometry ---------- */
  var SHADE = { up: 1, down: 0.5, north: 0.8, south: 0.8, east: 0.6, west: 0.6 };
  var QUAD = {
    north: function (f, t) { return [[t[0], t[1], f[2]], [t[0], f[1], f[2]], [f[0], f[1], f[2]], [f[0], t[1], f[2]]]; },
    south: function (f, t) { return [[f[0], t[1], t[2]], [f[0], f[1], t[2]], [t[0], f[1], t[2]], [t[0], t[1], t[2]]]; },
    east: function (f, t) { return [[t[0], t[1], t[2]], [t[0], f[1], t[2]], [t[0], f[1], f[2]], [t[0], t[1], f[2]]]; },
    west: function (f, t) { return [[f[0], t[1], f[2]], [f[0], f[1], f[2]], [f[0], f[1], t[2]], [f[0], t[1], t[2]]]; },
    up: function (f, t) { return [[f[0], t[1], f[2]], [f[0], t[1], t[2]], [t[0], t[1], t[2]], [t[0], t[1], f[2]]]; },
    down: function (f, t) { return [[f[0], f[1], t[2]], [f[0], f[1], f[2]], [t[0], f[1], f[2]], [t[0], f[1], t[2]]]; }
  };

  function rotatePoint(p, r) {
    var a = (r[0] * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), ax = r[1];
    var x = p[0] - r[2], y = p[1] - r[3], z = p[2] - r[4], nx = x, ny = y, nz = z;
    if (ax === 0) { ny = y * c - z * s; nz = y * s + z * c; }
    else if (ax === 1) { nx = x * c + z * s; nz = -x * s + z * c; }
    else { nx = x * c - y * s; ny = x * s + y * c; }
    return [nx + r[2], ny + r[3], nz + r[4]];
  }

  /* Build one BufferGeometry per texture slot. */
  function buildGeometries(model) {
    var slots = model.tex.map(function () { return { pos: [], uv: [], col: [], idx: [] }; });
    var lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9], faceCount = 0;
    model.el.forEach(function (e) {
      Object.keys(e.u).forEach(function (fname) {
        var fu = e.u[fname], slot = slots[fu[0]];
        var quad = QUAD[fname](e.f, e.t);
        if (e.r) quad = quad.map(function (p) { return rotatePoint(p, e.r); });
        var shade = e.s ? 1 : SHADE[fname];
        var base = slot.pos.length / 3;
        var u1 = fu[1] / 16, v1 = 1 - fu[2] / 16, u2 = fu[3] / 16, v2 = 1 - fu[4] / 16;
        var uvs = [[u1, v1], [u1, v2], [u2, v2], [u2, v1]];
        for (var i = 0; i < 4; i++) {
          var p = quad[i];
          slot.pos.push(p[0] / 16, p[1] / 16, p[2] / 16);
          slot.uv.push(uvs[i][0], uvs[i][1]);
          slot.col.push(shade, shade, shade);
          for (var k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k] / 16); hi[k] = Math.max(hi[k], p[k] / 16); }
        }
        slot.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
        faceCount++;
      });
    });
    return { slots: slots, lo: lo, hi: hi, faces: faceCount };
  }

  function isSoft(name) { return /^aura|halo|pulse/.test(name); }

  /* ---------- 3D viewer ---------- */
  function Viewer(canvas, opts) {
    opts = opts || {};
    var self = this;
    this.canvas = canvas;
    this.strobeAllowed = false;
    this.play = !reduceMotion;
    this.anims = [];
    this.group = null;
    this.visible = true;
    this.token = 0;
    this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, preserveDrawingBuffer: !!opts.preserve });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.01, 200);
    this.controls = null;
    if (!opts.noControls && THREE.OrbitControls) {
      this.controls = new THREE.OrbitControls(this.camera, canvas);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.08;
      this.controls.enablePan = false;
      this.controls.autoRotate = !reduceMotion && opts.autoRotate !== false;
      this.controls.autoRotateSpeed = opts.rotateSpeed || 1.6;
    }
    this.resize();
    if (window.ResizeObserver) new ResizeObserver(function () { self.resize(); }).observe(canvas.parentElement || canvas);
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (en) { self.visible = en[0].isIntersecting; if (self.visible) self.loop(); }, { threshold: 0 }).observe(canvas);
    }
    this.loop = function () {
      if (self._raf || !self.visible) return;
      self._raf = requestAnimationFrame(function frame(now) {
        self._raf = 0;
        if (!self.visible) return;
        self.step(now);
        self.loop();
      });
    };
  }

  Viewer.prototype.resize = function () {
    var p = this.canvas.parentElement || this.canvas;
    var w = Math.max(60, p.clientWidth), h = Math.max(60, p.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.group) this.render();
  };

  Viewer.prototype.clear = function () {
    if (!this.group) return;
    var g = this.group;
    g.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
    });
    this.scene.remove(g);
    this.group = null;
    this.anims = [];
  };

  Viewer.prototype.setModel = function (name, opts) {
    opts = opts || {};
    var self = this, token = ++this.token;
    return SD.getModel(name).then(function (model) {
      return Promise.all(model.tex.map(function (t) { return SD.getTex(t); })).then(function (texInfos) {
        if (token !== self.token) return null;
        self.clear();
        var geo = buildGeometries(model);
        var group = new THREE.Group();
        var anims = [];
        geo.slots.forEach(function (slot, i) {
          if (!slot.idx.length) return;
          var info = texInfos[i], tname = model.tex[i];
          var tex = new THREE.Texture(info.img);
          tex.magFilter = THREE.NearestFilter;
          tex.minFilter = THREE.NearestFilter;
          tex.generateMipmaps = false;
          tex.needsUpdate = true;
          tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
          if (info.n > 1) tex.repeat.set(1, 1 / info.n);
          var soft = isSoft(tname);
          var mat = new THREE.MeshBasicMaterial({
            map: tex, vertexColors: true, transparent: true, alphaTest: soft ? 0.01 : 0.08,
            side: THREE.DoubleSide, depthWrite: !soft
          });
          var g = new THREE.BufferGeometry();
          g.setAttribute("position", new THREE.Float32BufferAttribute(slot.pos, 3));
          g.setAttribute("uv", new THREE.Float32BufferAttribute(slot.uv, 2));
          g.setAttribute("color", new THREE.Float32BufferAttribute(slot.col, 3));
          g.setIndex(slot.idx);
          var mesh = new THREE.Mesh(g, mat);
          mesh.renderOrder = soft ? 2 : 1;
          group.add(mesh);
          anims.push({ tex: tex, info: info });
        });
        self.scene.add(group);
        self.group = group;
        self.anims = anims;
        self.modelInfo = { elements: model.el.length, faces: geo.faces, textures: model.tex.slice(), lo: geo.lo, hi: geo.hi,
          strobe: texInfos.some(function (t) { return t.strobe; }),
          animated: texInfos.some(function (t) { return t.n > 1; }) };
        var c = new THREE.Vector3((geo.lo[0] + geo.hi[0]) / 2, (geo.lo[1] + geo.hi[1]) / 2, (geo.lo[2] + geo.hi[2]) / 2);
        var r = Math.max(0.2, new THREE.Vector3(geo.hi[0] - geo.lo[0], geo.hi[1] - geo.lo[1], geo.hi[2] - geo.lo[2]).length() / 2);
        var vf = (self.camera.fov * Math.PI) / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * self.camera.aspect);
        var dist = (r / Math.sin(Math.min(vf, hf) / 2)) * 0.95;
        var dir = new THREE.Vector3(opts.az != null ? Math.sin(opts.az) : -0.7, opts.el != null ? opts.el : 0.42, opts.az != null ? -Math.cos(opts.az) : -1).normalize();
        self.camera.position.copy(c).addScaledVector(dir, dist);
        self.camera.near = dist / 100; self.camera.far = dist * 20; self.camera.updateProjectionMatrix(); self.camera.lookAt(c);
        if (self.controls) { self.controls.target.copy(c); self.controls.minDistance = dist * 0.25; self.controls.maxDistance = dist * 3; self.controls.update(); }
        self.applyFrame(performance.now());
        self.render();
        self.loop();
        return self.modelInfo;
      });
    });
  };

  Viewer.prototype.applyFrame = function (now) {
    var self = this;
    this.anims.forEach(function (a) {
      if (a.info.n < 2) return;
      var play = self.play && (!a.info.strobe || self.strobeAllowed);
      var idx = SD.frameAt(a.info, now, play);
      a.tex.offset.y = 1 - (idx + 1) / a.info.n;
    });
  };

  Viewer.prototype.render = function () { this.renderer.render(this.scene, this.camera); };

  Viewer.prototype.step = function (now) {
    if (this.controls) this.controls.update();
    this.applyFrame(now);
    this.render();
  };

  Viewer.prototype.setAutoRotate = function (on) { if (this.controls) this.controls.autoRotate = on && !reduceMotion; };

  /* ---------- thumbnails: one shared small renderer, queued ---------- */
  var thumbViewer = null, thumbQueue = Promise.resolve(), thumbCache = {};
  SD.thumb = function (name, opts) {
    var key = name + (opts && opts.key || "");
    if (thumbCache[key]) return thumbCache[key];
    thumbCache[key] = thumbQueue = thumbQueue.then(function () {
      if (!thumbViewer) {
        var wrap = document.createElement("div");
        wrap.style.cssText = "position:fixed;left:-9999px;top:0;width:220px;height:220px";
        var cv = document.createElement("canvas");
        wrap.appendChild(cv); document.body.appendChild(wrap);
        thumbViewer = new Viewer(cv, { noControls: true, preserve: true });
        thumbViewer.visible = false; thumbViewer.play = false;
        thumbViewer.renderer.setPixelRatio(1);
        thumbViewer.renderer.setSize(220, 220, false);
        thumbViewer.camera.aspect = 1; thumbViewer.camera.updateProjectionMatrix();
      }
      return thumbViewer.setModel(name, opts).then(function () {
        thumbViewer.render();
        return thumbViewer.canvas.toDataURL("image/png");
      });
    }).catch(function () { return ""; });
    return thumbCache[key];
  };

  /* ---------- 2D sprite player (item cards, texture strips) ---------- */
  var sprites = [], spriteRaf = 0;
  function spriteLoop(now) {
    spriteRaf = 0;
    var any = false;
    sprites.forEach(function (s) {
      if (!s.visible) return;
      any = true;
      var play = s.play && !reduceMotion;
      var idx = SD.frameAt(s.info, now, play);
      if (idx !== s.last) { s.last = idx; s.draw(idx); }
    });
    if (any) spriteRaf = requestAnimationFrame(spriteLoop);
  }
  function kick() { if (!spriteRaf) spriteRaf = requestAnimationFrame(spriteLoop); }

  /* Draws frame `idx` of the strip, scaled by an integer factor, onto the canvas. */
  SD.sprite = function (canvas, texName, opts) {
    opts = opts || {};
    return SD.getTex(texName).then(function (info) {
      var scale = opts.scale || 3;
      canvas.width = info.fw * scale; canvas.height = info.fh * scale;
      canvas.style.imageRendering = "pixelated";
      var ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      var s = { info: info, last: -1, visible: true, play: opts.play !== false && !(info.strobe && !opts.strobe) };
      s.draw = function (idx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(info.img, 0, idx * info.fh, info.fw, info.fh, 0, 0, canvas.width, canvas.height);
      };
      s.draw(info.frames[0][0]);
      s.last = info.frames[0][0];
      if (window.IntersectionObserver) {
        new IntersectionObserver(function (en) { s.visible = en[0].isIntersecting; if (s.visible) kick(); }, { threshold: 0 }).observe(canvas);
      }
      sprites.push(s);
      kick();
      return s;
    });
  };

  window.SurtrViewer = Viewer;
})();
