SURTR SHOWCASE SITE
===================
Open index.html in a browser. No server, build step or internet connection is needed
(three.js and the two fonts are bundled). It also works when uploaded to any static host
(GitHub Pages, Netlify, a plain web server).

What is on the page
  - Summoning: ritual requirements, failure messages, tick-by-tick spawn timeline
  - The fight: three phases, stat table, distance map, always-on behaviours, transformation timeline
  - Attacks: every attack with damage per phase, timings, damage types and death messages
  - Drops: chest chances, a loot simulator using the datapack's own rolls, kills-to-collect table
  - Items: armor set, components, both swords (3D), abilities and cooldowns, forging
  - Model lab: all 51 models from the resource pack rendered live in 3D, with texture animation
  - Reference: install, admin commands, settings, death messages, sound events

Tip: add ?phase=2 or ?phase=3 to the URL to open the page in that phase.

Folders
  index.html, css/, js/      the site itself. Numbers and text live in js/content.js
  data/                      models and textures generated from the resource pack
  vendor/, fonts/            three.js r128 and the Pirata One and Hanken Grotesk fonts
  tools/build_data.py        regenerates data/ from a resource pack zip:
        python3 tools/build_data.py path/to/Surtr_Resource_Pack_vX.zip

Updating for a new version
  1. Run tools/build_data.py on the new resource pack.
  2. Edit js/content.js for any changed numbers. Each entry names the datapack function
     it was read from (the "src" fields).
  3. New part names go in the `parts` / `otherModels` lists in js/content.js.

Notes
  - Phase III textures flash. The site shows them still unless the visitor ticks
    "Allow flashing" in the model lab, and it respects prefers-reduced-motion.
  - The datapack author states the packs were not playtested in game, so the figures
    are what the code says, not measured behaviour.
  - The armor glyphs on the page are small pixel drawings made for this site, not
    textures from the pack (the pack has no armor art).
