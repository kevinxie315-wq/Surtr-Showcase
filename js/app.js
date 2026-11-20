/* ============================================================
   Surtr showcase - page logic.
   ============================================================ */
(function () {
  "use strict";
  var C = window.SURTR, SD = window.SurtrData, M = window.SurtrManifest;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var fmt = function (n) { return n.toLocaleString("en-US"); };
  var ROMAN = ["", "I", "II", "III"];
  var state = { phase: 1 };

  function h(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "class") e.className = attrs[k]; else e.setAttribute(k, attrs[k]);
    });
    if (html != null) e.innerHTML = html;
    return e;
  }
  function set(sel, html) { $(sel).innerHTML = html; }

  /* ================= phase handling ================= */
  var heroViewer = null;
  function setPhase(n) {
    state.phase = n;
    document.documentElement.setAttribute("data-phase", n);
    $$(".phase-switch button").forEach(function (b) { b.setAttribute("aria-checked", String(+b.dataset.phase === n)); });
    renderHero();
    renderPhaseCards();
    renderStats();
    renderRange();
    renderAttacks();
  }

  /* ================= hero ================= */
  var HERO = [
    ["Health", ["4,800", "2,400", "9,600"], ["", "remaining at the start", "refilled"]],
    ["Sword hit", ["500", "700", "1,400"], ["stab and swing", "stab and swing", "stab and swing"]],
    ["Meteor", ["600", "840", "1,680"], ["blast within 8 blocks", "blast within 16 blocks", "blast within 16 blocks"]],
    ["Attacks from", ["44 blocks", "52 blocks", "52 blocks"], ["", "", ""]],
    ["Regeneration", ["4 / s", "24 / s", "48 / s"], ["", "", ""]]
  ];
  function renderHero() {
    var i = state.phase - 1, p = C.phases[i];
    set("#hero-sub", p.name);
    set("#hero-stats", HERO.map(function (r) {
      return "<div><dt>" + r[0] + "</dt><dd>" + r[1][i] + (r[2][i] ? "<small>" + r[2][i] + "</small>" : "") + "</dd></div>";
    }).join(""));
    var name = "head_p" + state.phase;
    var info = M.models[name];
    set("#hero-cap", "Phase " + ROMAN[state.phase] + " head, model <code>surtr:item/" + name + "</code>, " + fmt(info.el) +
      " cuboids. Drag to turn." + (state.phase === 3 ? " Shown still: the real texture flashes." : ""));
    if (!heroViewer) {
      heroViewer = new SurtrViewer($("#hero-canvas"), { rotateSpeed: 1.2 });
    }
    $("#hero-loading").classList.remove("gone");
    heroViewer.setModel(name, { az: -0.55, el: 0.28 }).then(function () { $("#hero-loading").classList.add("gone"); });
  }

  /* ================= summon ================= */
  function ritualSVG() {
    var u = 26, W = 640, H = 330, ox = 30, oy = 300, out = [], cx = 4; // cx: column of the beacon
    function R(x, y, w, hh, fill, extra) { out.push('<rect x="' + (ox + x * u) + '" y="' + (oy - (y + hh) * u) + '" width="' + w * u + '" height="' + hh * u + '" fill="' + fill + '" ' + (extra || "") + "/>"); }
    out.push('<rect x="0" y="' + oy + '" width="' + W + '" height="' + (H - oy) + '" fill="var(--line)" opacity=".5"/>');
    R(cx + 0.35, 5, 0.3, 6, "#7fe9ff", 'opacity=".28"');
    [[0, 0, 9], [1, 1, 7], [2, 2, 5]].forEach(function (t) { R(t[0], t[1], t[2], 1, "#c9ced3", 'stroke="#7d848b" stroke-width="1.5"'); });
    R(cx, 3, 1, 1, "#16151a", 'stroke="#000" stroke-width="1.5"');
    out.push('<rect x="' + (ox + cx * u + 7) + '" y="' + (oy - 4 * u + 7) + '" width="' + (u - 14) + '" height="' + (u - 14) + '" fill="#7fe9ff"/>');
    R(cx, 4, 1, 1, "#e4e4e0", 'stroke="#8d8d88" stroke-width="1.5"');
    var sx = ox + cx * u, sy = oy - 5 * u;
    out.push('<rect x="' + (sx + 4) + '" y="' + (sy + 8) + '" width="6" height="6" fill="#15121a"/><rect x="' + (sx + 16) + '" y="' + (sy + 8) + '" width="6" height="6" fill="#15121a"/><rect x="' + (sx + 9) + '" y="' + (sy + 17) + '" width="8" height="4" fill="#15121a"/>');
    function label(x, y, tx, ty, text) {
      out.push('<polyline points="' + x + "," + y + " " + (tx - 6) + "," + ty + " " + tx + "," + ty + '" fill="none" stroke="var(--dim)" stroke-width="1"/>');
      out.push('<text x="' + (tx + 8) + '" y="' + (ty + 5) + '" style="fill:var(--text);font:500 15px var(--body)">' + text + "</text>");
    }
    label(sx + u, oy - 4.5 * u, 320, oy - 5.2 * u, "Wither skeleton skull");
    label(sx + u, oy - 3.5 * u, 320, oy - 3.6 * u, "Powered beacon (level 1 or more)");
    label(ox + 8 * u, oy - 1.4 * u, 320, oy - 1.7 * u, "Pyramid. One tier is enough for level 1");
    return '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Side view: a stepped pyramid, a beacon on top and a wither skeleton skull on the beacon">' + out.join("") + "</svg>" +
      '<p class="cap">Side view of the ritual. The skull goes directly on top of the beacon.</p>';
  }

  function buildTimeline(sel, items, max, opts) {
    opts = opts || {};
    var box = $(sel), html = '<div class="tl-bar"><div class="tl-fill" style="width:100%"></div>';
    items.forEach(function (it, i) {
      var pct = (it.tick / max) * 100;
      html += '<span class="tl-label" style="left:' + pct + '%">' + it.tick + '</span>';
      html += '<button class="tl-mark" data-i="' + i + '" style="left:' + pct + '%" aria-label="Tick ' + it.tick + ': ' + it.what.replace(/"/g, "") + '"></button>';
    });
    html += "</div><ul class=\"tl-list\">";
    items.forEach(function (it, i) {
      html += '<li data-i="' + i + '"><b>Tick ' + it.tick + "<small>" + (it.tick / 20).toFixed(1).replace(".0", "") + " s</small></b><span>" + it.what + "</span></li>";
    });
    box.innerHTML = html + "</ul>";
    function mark(i) { $$("li", box).forEach(function (l) { l.classList.toggle("on", +l.dataset.i === i); }); }
    $$(".tl-mark", box).forEach(function (b) {
      b.addEventListener("mouseenter", function () { mark(+b.dataset.i); });
      b.addEventListener("focus", function () { mark(+b.dataset.i); });
      b.addEventListener("click", function () { mark(+b.dataset.i); });
    });
  }

  var TF = [
    { tick: 0, what: "Phase II begins. Title “SURTR UNLEASHED”, purple bar. He roars, raises the sword upright and becomes invulnerable. Models grow and change over 2 seconds." },
    { tick: 12, what: "A red ring appears on the ground at exactly 30 blocks from him. Get outside it." },
    { tick: 50, what: "Charge blast: everyone inside the ring takes 1,000 magic damage. The sword drives down." },
    { tick: 58, what: "The ravines start to open, spreading outward over about 60 ticks." },
    { tick: 117, what: "Ravines are finished." },
    { tick: 126, what: "Normal Phase II fight resumes. In Ragnarok mode this tick starts Phase III instead: models swap to black and white, health refills to 9,600, title “RAGNAROK”." },
    { tick: 196, what: "Ragnarok route only: the transformation ends and the Phase III fight starts." }
  ];

  function renderSummon() {
    set("#ritual-art", ritualSVG());
    set("#ritual-req", C.ritual.requirements.map(function (t) { return "<li>" + t + "</li>"; }).join(""));
    set("#ritual-fail", C.ritual.failures.map(function (f) { return "<li>“" + f.msg + "”<em>" + f.when + "</em></li>"; }).join(""));
    set("#ritual-notes", C.ritual.notes.map(function (t) { return "<li>" + t + "</li>"; }).join(""));
    buildTimeline("#spawn-timeline", C.ritual.timeline, 120);
    buildTimeline("#tf-timeline", TF, 200);
  }

  /* ================= fight ================= */
  function renderPhaseCards() {
    set("#phase-cards", "");
    C.phases.forEach(function (p) {
      var b = h("button", { "class": "pcard" + (p.id === state.phase ? " on" : ""), type: "button", "aria-pressed": String(p.id === state.phase) },
        '<div class="roman">' + p.roman + "</div><h3>" + p.name + "</h3><p>" + p.blurb + '</p><p class="when">' + p.trigger + "<br>" + p.bar + "</p>");
      b.addEventListener("click", function () { setPhase(p.id); });
      $("#phase-cards").appendChild(b);
    });
  }

  function renderStats() {
    var cur = state.phase - 1;
    var head = "<thead><tr><th></th>" + [0, 1, 2].map(function (i) { return '<th class="' + (i === cur ? "on" : "") + '">Phase ' + ROMAN[i + 1] + "</th>"; }).join("") + "</tr></thead>";
    var body = C.stats.map(function (r) {
      return "<tr><td>" + r.label + (r.note ? "<small>" + r.note + "</small>" : "") + "</td>" +
        r.v.map(function (v, i) { return '<td class="' + (i === cur ? "on" : "") + '">' + v + "</td>"; }).join("") + "</tr>";
    }).join("");
    set("#stat-table", head + "<tbody>" + body + "</tbody>");
    set("#traits", C.traits.map(function (t) { return "<li><b>" + t.t + "</b><span>" + t.d + "</span></li>"; }).join(""));
  }

  function renderRange() {
    var i = state.phase - 1, S = 3, c = 300, rows = C.ranges, colors = ["#8fd18a", "#ff5d6c", "var(--accent)", "var(--accent2)", "var(--dim)", "var(--dim)"], dashes = ["", "", "", "6 4", "2 5", "10 6"];
    var angles = [-100, -62, -24, 14, 52, 92];
    var svg = ['<svg viewBox="0 0 600 600" role="img" aria-label="Top-down map of Surtr’s distances">'];
    rows.forEach(function (r, k) {
      var rad = r.r[i] * S;
      svg.push('<circle class="ring" cx="' + c + '" cy="' + c + '" r="' + rad + '" stroke="' + colors[k] + '" stroke-dasharray="' + dashes[k] + '"/>');
    });
    if (state.phase >= 2) svg.push('<circle class="ring" cx="' + c + '" cy="' + c + '" r="' + 20 * S + '" stroke="var(--accent2)" stroke-dasharray="1 4" opacity=".0"/>');
    rows.forEach(function (r, k) {
      var a = (angles[k] * Math.PI) / 180, rad = r.r[i] * S, x = c + rad * Math.cos(a), y = c + rad * Math.sin(a);
      svg.push('<text x="' + x + '" y="' + (y + 4) + '" text-anchor="middle">' + r.r[i] + "</text>");
    });
    svg.push('<circle cx="' + c + '" cy="' + c + '" r="' + (6 * (state.phase >= 2 ? 1.2 : 1)) + '" style="fill:var(--accent)"/>');
    svg.push('<text x="' + c + '" y="' + (c + 22) + '" text-anchor="middle">Surtr</text></svg>');
    var legend = '<div class="range-legend">' + rows.map(function (r, k) {
      return '<span><i style="border-color:' + colors[k] + ';border-top-style:' + (dashes[k] ? "dashed" : "solid") + '"></i>' + r.label + " (" + r.r[i] + ")</span>";
    }).join("") + "</div>";
    set("#range-map", svg.join("") + legend);
  }

  /* ================= attacks ================= */
  var KINDS = { all: "All", melee: "Sword", ranged: "Ranged", area: "Area", passive: "Always on", transform: "Phase change" };
  var attackFilter = "all";
  function renderAttacks() {
    var cur = state.phase - 1;
    var chips = $("#attack-filter");
    if (!chips.children.length) {
      Object.keys(KINDS).forEach(function (k) {
        var b = h("button", { "class": "chip", type: "button", "data-k": k, "aria-pressed": String(k === attackFilter) }, KINDS[k]);
        b.addEventListener("click", function () {
          attackFilter = k;
          $$(".chip", chips).forEach(function (c) { c.setAttribute("aria-pressed", String(c.dataset.k === k)); });
          $$(".atk").forEach(function (a) { a.hidden = !(k === "all" || a.dataset.kind === k); });
        });
        chips.appendChild(b);
      });
    }
    var kindName = { melee: "Sword", ranged: "Ranged", area: "Area", passive: "Always on", transform: "Phase change" };
    set("#attack-grid", C.attacks.map(function (a) {
      var avail = a.phases.indexOf(state.phase) >= 0 || (a.id === "charge" && state.phase === 3);
      var has = a.damage.some(function (v) { return v != null; });
      var cells = a.damage.map(function (v, i) {
        return '<div class="' + (i === cur ? "on" : "") + '"><small>Phase ' + ROMAN[i + 1] + "</small><b>" + (v == null ? "–" : fmt(v) + (a.unit ? "<em>" + a.unit + "</em>" : "")) + "</b></div>";
      }).join("");
      var dmg = has ? '<div class="dmg">' + cells + "</div>" : '<p class="dmg-line">No damage number. ' + (a.type === "terrain" ? "It reshapes the terrain." : "It is a real vanilla explosion.") + "</p>";
      if (a.damage2) {
        dmg = '<p class="dmg-line"><b>Direct hit</b></p>' + dmg + '<p class="dmg-line"><b>Area</b> (outer ring)</p><div class="dmg second">' +
          a.damage2.map(function (v, i) { return '<div class="' + (i === cur ? "on" : "") + '"><small>Phase ' + ROMAN[i + 1] + "</small><b>" + fmt(v) + "</b></div>"; }).join("") + "</div>";
      }
      var cv = a.damage[cur];
      var taken = (has && cv != null) ? '<p class="dmg-line">With the full Infernal set: <b>' + (cv * 0.04).toLocaleString("en-US", { maximumFractionDigits: 1 }) + "</b>" + (a.unit ? " " + a.unit : "") + " (4%, calculated)</p>" : "";
      var bar = "";
      var tm = a.timing && a.timing[state.phase === 1 ? 1 : 2];
      if (tm) {
        var e = tm.end, w = (tm.hit[0] / e) * 100, hw = ((tm.hit[1] - tm.hit[0]) / e) * 100;
        bar = '<div><div class="bar" role="img" aria-label="Timeline: wind-up ' + (tm.hit[0] / 20).toFixed(2) + " s, hit window " + ((tm.hit[1] - tm.hit[0]) / 20).toFixed(2) + " s, total " + (e / 20).toFixed(2) + ' s">' +
          '<i class="wind" style="left:0;width:' + w + '%"></i><i class="hit" style="left:' + w + "%;width:" + hw + '%"></i><i class="rec" style="left:' + (w + hw) + "%;width:" + (100 - w - hw) + '%"></i></div>' +
          '<div class="bar-key"><span style="--c:color-mix(in srgb,var(--accent) 28%,var(--bg2))">Wind-up ' + (tm.hit[0] / 20).toFixed(2) + ' s</span><span style="--c:var(--accent)">Can hit ' + ((tm.hit[1] - tm.hit[0]) / 20).toFixed(2) + ' s</span><span style="--c:color-mix(in srgb,var(--dim) 30%,var(--bg2))">Recovery. Total ' + (e / 20).toFixed(2) + " s</span></div></div>";
      }
      return '<article class="atk' + (avail ? "" : " off") + '" data-kind="' + a.kind + '"' + (attackFilter === "all" || attackFilter === a.kind ? "" : " hidden") + ">" +
        "<header><h3>" + a.name + '</h3><span class="kind">' + kindName[a.kind] + (avail ? "" : ", not in Phase " + ROMAN[state.phase]) + "</span></header>" +
        '<p class="pick">' + a.pick + "</p>" + dmg + taken + bar +
        "<ul>" + a.detail.map(function (d) { return "<li>" + d + "</li>"; }).join("") + "</ul>" +
        '<p class="meta"><span>Damage type <code>' + a.type + "</code></span>" + (a.death ? "<span>Death: “…" + a.death + "”</span>" : "") + "<span>Source <code>" + a.src + "</code></span></p></article>";
    }).join(""));
  }

  /* ================= pixel glyphs for armor (drawn here, not from the pack) ================= */
  var PAL = { k: "#16111a", m: "#4a4048", l: "#6d616c", r: "#e0312f", d: "#0d0a0f" };
  var GLYPH = {
    helmet: ["....kkkkkkkk....", "...kmmmmmmmmk...", "..kmlllmmmmmmk..", "..kmmmmmmmmmmk..", "..kmrrrrrrrrmk..", "..kmmmmmmmmmmk..", "..kmmkkkkkkmmk..", "..kmmkddddkmmk..", "..kmmkddddkmmk..", "..kmkkddddkkmk..", "..kkk......kkk.."],
    chestplate: ["..kkk......kkk..", ".kmmmk....kmmmk.", ".kmlmmkkkkmmlmk.", ".kmmmmmmmmmmmmk.", ".kkmmmrrrrmmmkk.", "..kmmmmmmmmmmk..", "..kmmmmrrmmmmk..", "..kmmmmmmmmmmk..", "..kmmmmmmmmmmk..", "..kmmmmrrmmmmk..", "..kmmmmmmmmmmk..", "..kkmmmmmmmmkk..", "....kkkkkkkk...."],
    leggings: ["..kkkkkkkkkkkk..", "..kmmmmmmmmmmk..", "..kmrrrrrrrrmk..", "..kmmmmmmmmmmk..", "..kmmmmkkmmmmk..", "..kmmmk..kmmmk..", "..kmlmk..kmlmk..", "..kmmmk..kmmmk..", "..kmmmk..kmmmk..", "..kmrrk..krrmk..", "..kmmmk..kmmmk..", "..kkkkk..kkkkk.."],
    boots: ["..kkkk....kkkk..", "..kmmk....kmmk..", "..kmrk....krmk..", "..kmmk....kmmk..", "..kmmkkk..kmmkkk", ".kmmmmmk.kmmmmmk", ".kmlmmmk.kmlmmmk", ".kmmmmmk.kmmmmmk", ".kkkkkkk.kkkkkkk"]
  };
  function drawGlyph(cv, id, scale) {
    var rows = GLYPH[id], W = 16, H = 16, ctx;
    cv.width = W * scale; cv.height = H * scale; ctx = cv.getContext("2d");
    var top = Math.floor((H - rows.length) / 2);
    rows.forEach(function (row, y) {
      for (var x = 0; x < row.length; x++) {
        var ch = row[x]; if (ch === "." || ch === " ") continue;
        ctx.fillStyle = PAL[ch]; ctx.fillRect(x * scale, (y + top) * scale, scale, scale);
      }
    });
  }

  /* ================= drops ================= */
  function renderDrops() {
    set("#drops-lead", "On death he gives " + C.drops.xp + ". " + C.drops.chest);
    set("#drop-table", C.drops.rows.map(function (r) {
      return '<div class="drop-row"><span>' + r.item + "</span><b>" + r.chance + '</b><div class="meter"><i style="width:' + (r.p * 100) + '%"></i></div>' + (r.note ? "<small>" + r.note + "</small>" : "") + "</div>";
    }).join(""));
    set("#drop-math", "Any given armor piece is in a chest 43.75% of the time (7 in 16), so you get 1.75 pieces on average. All four pieces in one chest is 1 in 64 (about 1.6%), the same chance as getting Core, Hilt and Blade together. The Eternal Flame is the hard part at 1 in 20.");
  }

  function iconFor(img, model) { SD.thumb(model).then(function (u) { if (u) img.src = u; }); }
  var ITEMS = {
    helmet: { n: "Infernal Helmet", g: "helmet" }, chestplate: { n: "Infernal Chestplate", g: "chestplate" },
    leggings: { n: "Infernal Leggings", g: "leggings" }, boots: { n: "Infernal Boots", g: "boots" },
    core: { n: "Blazing Nuclear Core", m: "sa_core" }, hilt: { n: "Inferno Hilt", m: "sa_hilt_3d" },
    blade: { n: "Inactive Magma Blade", m: "sa_blade_3d" }, flame: { n: "Eternal Flame", m: "sa_flame" }
  };
  var ARMOR_IDS = ["helmet", "chestplate", "leggings", "boots"];

  // The exact rolls of sa/drop_place.mcfunction
  function rollChest(rnd) {
    var out = [], g = Math.floor(rnd() * 4);
    ARMOR_IDS.forEach(function (id, i) { if (i === g || rnd() < 0.25) out.push(id); });
    if (rnd() < 0.25) out.push("core");
    if (rnd() < 0.25) out.push("hilt");
    if (rnd() < 0.25) out.push("blade");
    if (rnd() < 0.05) out.push("flame");
    return out;
  }

  var inv = {}, kills = 0;
  function simTally() {
    var have = function (id) { return inv[id] || 0; };
    var setOK = ARMOR_IDS.every(function (id) { return have(id) > 0; });
    var sum = Math.min(have("core"), have("hilt"), have("blade"));
    var txt = "Kills: <b>" + kills + "</b>. Armor " + ARMOR_IDS.filter(function (i) { return have(i) > 0; }).length + "/4" + (setOK ? " (full set!)" : "") +
      ". Core " + have("core") + ", Hilt " + have("hilt") + ", Blade " + have("blade") + ", Flame " + have("flame") +
      (sum > 0 ? ". You can forge Sumarbrander" + (have("flame") > 0 ? " and ascend it to the Godslayer." : ".") : ".");
    set("#sim-tally", txt);
  }
  function renderSim() {
    $("#sim-kill").addEventListener("click", function () {
      kills++;
      var items = rollChest(Math.random), chest = $("#sim-chest");
      chest.innerHTML = "";
      items.forEach(function (id) {
        inv[id] = (inv[id] || 0) + 1;
        var it = ITEMS[id], slot = h("div", { "class": "slot pop" + (id === "flame" ? " rare" : "") });
        var cv = h("canvas"); slot.appendChild(cv); slot.appendChild(h("span", null, it.n));
        chest.appendChild(slot);
        if (it.g) drawGlyph(cv, it.g, 3); else { var im = h("img", { "class": "ico", alt: "" }); slot.replaceChild(im, cv); iconFor(im, it.m); }
      });
      simTally();
    });
    $("#sim-reset").addEventListener("click", function () {
      inv = {}; kills = 0;
      set("#sim-chest", '<p class="empty">The chest is empty. Defeat Surtr to open it.</p>');
      simTally();
    });
    simTally();
    setTimeout(monteCarlo, 60);
  }

  function monteCarlo() {
    var N = 10000, goals = [
      ["All four armor pieces", function (s) { return ARMOR_IDS.every(function (i) { return s[i]; }); }],
      ["Sumarbrander (Core, Hilt, Blade)", function (s) { return s.core && s.hilt && s.blade; }],
      ["Godslayer (also the Eternal Flame)", function (s) { return s.core && s.hilt && s.blade && s.flame; }],
      ["Everything", function (s) { return ARMOR_IDS.every(function (i) { return s[i]; }) && s.core && s.hilt && s.blade && s.flame; }]
    ];
    var res = goals.map(function () { return []; });
    for (var n = 0; n < N; n++) {
      var s = {}, k = 0, done = goals.map(function () { return 0; }), left = goals.length;
      while (left && k < 5000) {
        k++; rollChest(Math.random).forEach(function (id) { s[id] = 1; });
        goals.forEach(function (g, j) { if (!done[j] && g[1](s)) { done[j] = k; left--; } });
      }
      done.forEach(function (d, j) { res[j].push(d || 5000); });
    }
    var rows = goals.map(function (g, j) {
      var r = res[j].sort(function (a, b) { return a - b; });
      var mean = r.reduce(function (a, b) { return a + b; }, 0) / N;
      return "<tr><td>" + g[0] + "</td><td>" + mean.toFixed(1) + "</td><td>" + r[Math.floor(N * 0.5)] + "</td><td>" + r[Math.floor(N * 0.9)] + "</td></tr>";
    });
    set("#mc-table", "<thead><tr><th>To collect</th><th>Average</th><th>Half by</th><th>9 in 10 by</th></tr></thead><tbody>" + rows.join("") + "</tbody>");
  }

  /* ================= items ================= */
  function renderItems() {
    var A = C.armor;
    set("#armor",
      '<div><div class="armor-pieces">' + A.pieces.map(function (p) {
        return '<div class="apiece"><canvas data-g="' + p.id + '" aria-hidden="true"></canvas><div><b>' + p.name + "</b><small>" + p.base + ", redstone trim, " + p.pattern + " pattern</small></div></div>";
      }).join("") + "</div>" +
      '<ul class="notes mt-s">' + A.common.map(function (t) { return "<li>" + t + "</li>"; }).join("") + "</ul>" +
      '<p class="small">' + A.taken + "</p></div>" +
      "<div><h4 style=\"margin-top:0\">Full set bonus (all four pieces)</h4><dl class=\"kv\">" +
      A.bonuses.map(function (b) { return "<dt>" + b.k + "</dt><dd>" + b.v + "</dd>"; }).join("") + "</dl>" +
      '<ul class="notes mt-s"><li>' + A.pulse + "</li><li>" + A.halo + "</li></ul></div>");
    $$("#armor canvas[data-g]").forEach(function (cv) { drawGlyph(cv, cv.dataset.g, 5); });

    set("#components", C.components.map(function (c) {
      return '<article class="comp"><div class="art"><img class="ico" data-m="' + c.model + '" alt=""></div><h4>' + c.name + '</h4><p><span class="chance">' + c.chance + "</span> drop chance. Base item " + c.base + ".</p><p>" + c.d +
        '</p><button class="link-btn" data-lab="' + c.model + '">View the 3D model</button></article>';
    }).join(""));
    $$("#components img[data-m]").forEach(function (im) { iconFor(im, im.dataset.m); });

    // swords
    var tabs = $("#sword-tabs"), swordViewer = null, cur = 0;
    function pick(i) {
      cur = i;
      $$("button", tabs).forEach(function (b, j) { b.setAttribute("aria-selected", String(i === j)); });
      var s = C.swords[i];
      set("#sword-note", s.note);
      if (!swordViewer) swordViewer = new SurtrViewer($("#sword-canvas"), { rotateSpeed: 1.4 });
      swordViewer.setModel(s.model, { az: -0.5, el: 0.15 });
    }
    C.swords.forEach(function (s, i) {
      var b = h("button", { role: "tab", type: "button", "aria-selected": "false" }, s.name); b.addEventListener("click", function () { pick(i); }); tabs.appendChild(b);
    });
    set("#sword-stats", C.swordStats.map(function (r) { return "<dt>" + r.k + "</dt><dd>" + r.v + "</dd>"; }).join(""));
    var lazy = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { pick(0); lazy.disconnect(); } }, { rootMargin: "300px" });
    lazy.observe($("#sword-canvas"));

    set("#abilities", C.abilities.map(function (a) {
      return '<article class="ab"><h4>' + a.name + '</h4><div class="ctl">' + a.control + "</div><p>" + a.d + "</p><ul>" + a.facts.map(function (f) { return "<li>" + f + "</li>"; }).join("") + "</ul>" +
        '<div class="cds"><div><small>Sumarbrander</small><b>' + a.cd[0] + ' s</b></div><div><small>Godslayer</small><b>' + a.cd[1] + " s</b></div></div></article>";
    }).join(""));
    set("#enemy-note", C.enemyNote);

    var ICON = { core: "sa_core", hilt: "sa_hilt_3d", blade: "sa_blade_3d", flame: "sa_flame", sumarbrander: "sa_sumar", godslayer: "sa_godsumar" };
    var NAME = { core: "Core", hilt: "Hilt", blade: "Blade", flame: "Eternal Flame", sumarbrander: "Sumarbrander", godslayer: "Godslayer" };
    set("#forge", C.forge.map(function (f) {
      var left = f.from.map(function (id) { return '<div class="mini"><img class="ico" data-m="' + ICON[id] + '" alt="">' + NAME[id] + "</div>"; }).join('<span class="plus">+</span>');
      return '<div class="forge-row">' + left + '<span class="arrow">→</span><div class="mini"><img class="ico" data-m="' + ICON[f.to] + '" alt="">' + NAME[f.to] + '</div><div class="txt"><span class="prompt">' + f.prompt + "</span><br>" + f.d + "</div></div>";
    }).join(""));
    $$("#forge img[data-m]").forEach(function (im) { iconFor(im, im.dataset.m); });
  }

  /* ================= model lab ================= */
  var labViewer = null, labName = null, labButtons = {};
  var FRIENDLY = {};
  C.parts.forEach(function (p) { [1, 2, 3].forEach(function (n) { FRIENDLY[p.id + "_p" + n] = { name: p.name + ", Phase " + ROMAN[n], role: p.role }; }); });
  C.otherModels.forEach(function (o) { FRIENDLY[o.id] = { name: o.name, role: o.role }; });

  function labSelect(name) {
    if (!M.models[name]) return;
    labName = name;
    Object.keys(labButtons).forEach(function (k) { labButtons[k].forEach(function (b) { b.setAttribute("aria-pressed", String(k === name)); }); });
    var f = FRIENDLY[name] || { name: name, role: "" };
    $("#lab-name").textContent = f.name; $("#lab-role").textContent = f.role;
    $("#lab-loading").textContent = "Loading…"; $("#lab-loading").classList.remove("gone");
    if (!labViewer) {
      labViewer = new SurtrViewer($("#lab-canvas"));
      $("#lab-rotate").addEventListener("change", function (e) { labViewer.setAutoRotate(e.target.checked); });
      $("#lab-anim").addEventListener("change", function (e) { labViewer.play = e.target.checked; });
      $("#lab-strobe").addEventListener("change", function (e) { labViewer.strobeAllowed = e.target.checked; });
    }
    labViewer.setAutoRotate($("#lab-rotate").checked);
    labViewer.play = $("#lab-anim").checked && !SD.reduceMotion;
    if (SD.reduceMotion) $("#lab-anim").checked = false;
    labViewer.strobeAllowed = false; $("#lab-strobe").checked = false;
    labViewer.setModel(name, { az: -0.6, el: 0.3 }).then(function (info) {
      if (!info) return;
      $("#lab-loading").classList.add("gone");
      var meta = [["Model", "<code>surtr:item/" + name + "</code>"], ["Cuboids", fmt(info.elements)], ["Faces", fmt(info.faces)],
        ["Textures", info.textures.join(", ")], ["Animated", info.animated ? "Yes" : "No"], ["Flashes", info.strobe ? "Yes (Phase III)" : "No"]];
      set("#lab-meta", meta.map(function (r) { return "<dt>" + r[0] + "</dt><dd>" + r[1] + "</dd>"; }).join(""));
      $("#lab-strobe-wrap").hidden = !info.strobe; $("#lab-warn").hidden = !info.strobe;
    });
  }
  window.openInLab = function (name) { labSelect(name); $("#models").scrollIntoView({ behavior: SD.reduceMotion ? "auto" : "smooth" }); };

  var thumbObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      thumbObs.unobserve(en.target);
      var name = en.target.dataset.model;
      SD.thumb(name).then(function (url) {
        if (!url) return;
        var holder = en.target.querySelector(".im") || en.target, old = holder.querySelector(".ph");
        var img = new Image(); img.src = url; img.alt = "";
        if (old) old.remove();
        holder.appendChild(img);
      });
    });
  }, { rootMargin: "200px" });

  function reg(name, btn) { (labButtons[name] = labButtons[name] || []).push(btn); btn.dataset.model = name; thumbObs.observe(btn); btn.addEventListener("click", function () { labSelect(name); }); }

  function renderLab() {
    set("#model-count", Object.keys(M.models).length);
    var pt = $("#part-table");
    pt.appendChild(h("div", { "class": "part-row head" }, "<span>Part</span><span>Phase I</span><span>Phase II</span><span>Phase III</span>"));
    C.parts.forEach(function (p) {
      var row = h("div", { "class": "part-row" }, "<div><b>" + p.name + "</b><small>" + p.role + "</small></div>");
      [1, 2, 3].forEach(function (n) {
        var name = p.id + "_p" + n;
        var b = h("button", { "class": "thumb" + (M.models[name] ? "" : " na"), type: "button", "aria-pressed": "false", "aria-label": p.name + ", Phase " + ROMAN[n] }, '<span class="ph">…</span>');
        row.appendChild(b);
        if (M.models[name]) reg(name, b);
      });
      pt.appendChild(row);
    });
    var groups = {}, order = [];
    C.otherModels.forEach(function (o) { if (!M.models[o.id]) return; if (!groups[o.group]) { groups[o.group] = []; order.push(o.group); } groups[o.group].push(o); });
    order.forEach(function (g) {
      var wrap = h("div", { "class": "other-group" }, "<h3>" + g + "</h3>"), grid = h("div", { "class": "thumb-grid" });
      groups[g].forEach(function (o) {
        var b = h("button", { "class": "tcard", type: "button", "aria-pressed": "false" }, '<div class="im"><span class="ph" style="color:var(--dim);font-size:.7rem">…</span></div><span>' + o.name + "</span>");
        grid.appendChild(b); reg(o.id, b);
      });
      wrap.appendChild(grid); $("#other-models").appendChild(wrap);
    });
    labSelect("sword_p1");
    $("#lab-viewer").addEventListener("click", function () {});
    document.addEventListener("click", function (e) { var t = e.target.closest("[data-lab]"); if (t) window.openInLab(t.dataset.lab); });
  }

  /* ================= reference ================= */
  function renderReference() {
    set("#mc-ver", C.meta.mc.replace("Java ", ""));
    set("#dp-fmt", C.meta.dpFormat); set("#rp-fmt", C.meta.rpFormat);
    set("#cmd-table", C.commands.map(function (r) { return "<tr><td><code>" + r.c + "</code></td><td>" + r.d + "</td></tr>"; }).join(""));
    set("#cfg-table", "<thead><tr><th>Score</th><th>Default</th><th></th></tr></thead><tbody>" + C.config.map(function (r) { return "<tr><td><code>" + r.k + "</code></td><td>" + r.v + "</td><td>" + r.d + "</td></tr>"; }).join("") + "</tbody>");
    set("#death-list", C.deaths.map(function (d) { return "<li>“" + d.text.replace("%1$s", "Steve") + "”<em><code>death.attack." + d.id + "</code></em></li>"; }).join(""));
    set("#sound-table", "<tbody>" + C.sounds.map(function (s) { return "<tr><td><code>surtr:" + s[0] + "</code></td><td>" + s[1] + "</td></tr>"; }).join("") + "</tbody>");
  }

  /* ================= boot ================= */
  $$(".phase-switch button").forEach(function (b) { b.addEventListener("click", function () { setPhase(+b.dataset.phase); }); });
  renderSummon();
  renderDrops();
  renderSim();
  renderItems();
  renderReference();
  renderLab();
  setPhase(1);
  var q = /[?&]phase=([123])/.exec(location.search);
  if (q) setPhase(+q[1]);
})();
