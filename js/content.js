/* ============================================================
   Surtr showcase - content.
   Every number below was read from the datapack source (v2.7);
   the function or file it came from is noted in `src`.
   Values are listed per phase as [Phase I, Phase II, Phase III].
   ============================================================ */
window.SURTR = {
  meta: {
    version: "2.7",
    mc: "Java 1.21.9 – 1.21.11",
    dpFormat: "88–94",
    rpFormat: "69–75"
  },

  phases: [
    {
      id: 1, roman: "I", name: "Lord of Flame and Hell",
      trigger: "Starts when Surtr lands, 5.8 seconds after the summon.",
      bar: "Red bar. Title card “SURTR”.",
      blurb: "Molten red and orange models. He walks slowly, swings his sword and fires meteors at anyone who keeps their distance."
    },
    {
      id: 2, roman: "II", name: "Unleashed",
      trigger: "Starts when his health drops to 50% (2,400 of 4,800). Health is not refilled.",
      bar: "Purple bar. Title card “SURTR UNLEASHED – The flame turns black”.",
      blurb: "Crimson models, 1.2× larger. Adds a back halo, the heat pulse, meteors twice the size and the ravine attack. Everything hits 1.4× harder and 1.3× faster."
    },
    {
      id: 3, roman: "III", name: "Ragnarok",
      trigger: "Only through Ragnarok mode (/function surtr:togglerag) or /function surtr:force_p3. It does not start on its own from a normal fight.",
      bar: "White bar. Title card “RAGNAROK – The end of all things”.",
      blurb: "Black models with white stripes and a white aura. Health is refilled to 9,600 and everything else is doubled again."
    }
  ],

  /* ---------- boss stat rows ---------- */
  stats: [
    { label: "Health", v: ["4,800", "2,400 left, then 0", "9,600 (refilled)"], src: "summon_core, phase3_start" },
    { label: "Health regeneration", v: ["4 per second", "24 per second", "48 per second"], src: "pool_update", note: "Only while he is walking or attacking, not during transformations." },
    { label: "Hitbox resistance", v: ["Resistance III", "Resistance III", "Resistance I"], src: "mks_*, swap_p3", note: "Lower resistance means he takes roughly twice as much per hit." },
    { label: "Size", v: ["1×", "1.2×", "1.2×"], src: "swap_p2" },
    { label: "Damage multiplier", v: ["1×", "1.4×", "2.8×"], src: "blade_dmg_*", note: "Phase III doubles Phase II." },
    { label: "Walking speed", v: ["2.5 blocks/s", "2.5 blocks/s", "5 blocks/s"], src: "seek_p1, seek_p2", note: "Doubles when the target is more than 90 blocks away." },
    { label: "Starts attacking within", v: ["44 blocks", "52 blocks", "52 blocks"], src: "seek_p1, seek_p2" },
    { label: "Stops walking within", v: ["20 blocks", "24 blocks", "24 blocks"], src: "seek_p1, seek_p2", note: "Measured horizontally." },
    { label: "Pause between attacks", v: ["0.7 s", "0.5 s", "0.25 s"], src: "attack_end, st_seek" },
    { label: "Stab or swing length", v: ["2.9 s", "2.25 s", "2.25 s"], src: "stab_p1, stab_p2" },
    { label: "Meteor rain every", v: ["7 s", "7 s", "3.5 s"], src: "presence" },
    { label: "Meteor cannon wait", v: ["6 s", "6 s", "3 s"], src: "seek_p1, seek_p2" },
    { label: "Heat pulse", v: ["Not used", "Every 10 s", "Every 10 s"], src: "pulse_clock" }
  ],

  /* ---------- passive traits ---------- */
  traits: [
    { t: "Targets the nearest player", d: "Any non-spectator player within 400 blocks. He re-picks the nearest one every tick.", src: "target_pick" },
    { t: "Slows everything near him", d: "Movement and flying speed −50% for every non-creative, non-spectator entity within 50 blocks. Players wearing the full Infernal set are immune.", src: "slow_apply" },
    { t: "Burns dropped items", d: "Every item entity within 30 blocks is deleted.", src: "presence, burn_item" },
    { t: "Smashes the world", d: "Everything in a 25 × 25 column around his feet, up to 62 blocks tall, is destroyed every 4 ticks. His sword also destroys every block it touches, containers included. Bedrock, barrier and command blocks survive. Blocks below his feet are never touched.", src: "path_clear, sword_smash_*" },
    { t: "Holds the beacon’s height", d: "He does not follow your height. He stays at the level where the beacon stood and hovers over ravines.", src: "ground" },
    { t: "Own music", d: "Pigstep loops for every player within 500 blocks (track length setting: 2,961 ticks). Replace boss.music in sounds.json for your own track.", src: "audio, sounds.json" },
    { t: "Roars", d: "Every 20 to 50 seconds for all players within 500 blocks.", src: "roar" },
    { t: "Incompatible with Jormungandr", d: "If a warden tagged jorm_head is alive, the ritual fails with “The Serpent still stirs. The flame will not answer.”", src: "ritual_go2" }
  ],

  /* ---------- the summon ---------- */
  ritual: {
    requirements: [
      "A beacon that is powered: it must have at least level 1, so a pyramid beneath it.",
      "A wither skeleton skull placed directly on top of the beacon.",
      "The skull must be placed by a player. Placing it is what starts the check.",
      "The beacon must be within 7 blocks of the player in every direction (a 15 × 15 × 15 search around them).",
      "Surtr must not already be active.",
      "No Jormungandr (warden tagged jorm_head) may be alive."
    ],
    failures: [
      { msg: "The beacon is not powered. Surtr stirs, but the flame has no fuel.", when: "Beacon level is 0." },
      { msg: "Surtr already walks this world.", when: "A Surtr fight is already running." },
      { msg: "The Serpent still stirs. The flame will not answer.", when: "A Jormungandr head is alive." }
    ],
    timeline: [
      { tick: 0, what: "The beacon and the skull vanish (no lava). Surtr’s brain appears 260 blocks above the beacon. Spawn and roar sounds play for everyone within 300 blocks, a fire beam and rumbling start.", p: 0 },
      { tick: 30, what: "His jaw opens.", p: 0.27 },
      { tick: 40, what: "He roars at everyone within 500 blocks.", p: 0.36 },
      { tick: 104, what: "The sword starts smashing the ground beneath him, point-down.", p: 0.9 },
      { tick: 110, what: "He lands. Title card, a stomp and the crash: a real explosion of power 60 at the sword tip (44 blocks ahead).", p: 0.95 },
      { tick: 116, what: "The fight begins. His first attack comes after a 3-second cooldown.", p: 1 }
    ],
    notes: [
      "The fall is a constant acceleration from 260 blocks to the ground in exactly 110 ticks (5.5 seconds).",
      "Admin shortcut: /function surtr:summon_here spawns him at your feet without the ritual.",
      "Ragnarok mode (/function surtr:togglerag, off by default): he lands and immediately transforms, carves the ravines and enters Phase III."
    ]
  },

  /* ---------- attacks ---------- */
  attacks: [
    {
      id: "stab", name: "Sword stab", kind: "melee", phases: [1, 2, 3],
      pick: "Chosen 40% of the time (rolls 1 and 2 of 5).",
      damage: [500, 700, 1400], type: "surtr:blade",
      death: "was cleaved by Surtr’s flaming sword",
      detail: [
        "He locks onto you at the start, raises the sword, then lunges forward and thrusts. Charge particles show the wind-up.",
        "Every body segment along the blade can hit. Each entity is hit once per attack.",
        "He moves 4 blocks forward during the lunge in Phase I and 4.8 in Phase II and III, and stomps on the hit."
      ],
      timing: { // ticks
        1: { windup: 28, hit: [28, 40], end: 58 },
        2: { windup: 22, hit: [22, 31], end: 45 }
      },
      src: "stab_p1, stab_p2, blade_dmg_p1, blade_dmg_p2"
    },
    {
      id: "swing", name: "Sword swing", kind: "melee", phases: [1, 2, 3],
      pick: "Chosen 40% of the time (rolls 3 and 4 of 5).",
      damage: [500, 700, 1400], type: "surtr:blade",
      death: "was cleaved by Surtr’s flaming sword",
      detail: [
        "A wide overhead arc. His arm is re-aimed 8 ticks before the blade lands, so sprinting sideways at the last moment does not dodge it by itself.",
        "Same damage and hit rules as the stab."
      ],
      timing: {
        1: { windup: 32, hit: [32, 40], end: 58 },
        2: { windup: 25, hit: [25, 31], end: 45 }
      },
      src: "swing_p1, swing_p2"
    },
    {
      id: "slam", name: "Ground slam", kind: "melee", phases: [1, 2, 3],
      pick: "Chosen 20% of the time (roll 5 of 5).",
      damage: [600, 840, 1680], damage2: [400, 560, 1120], type: "surtr:blade",
      death: "was cleaved by Surtr’s flaming sword",
      detail: [
        "The sword hits the ground and a shockwave runs along a straight line in front of him, through eight impact points.",
        "A direct hit takes the top damage within 3.5 blocks of a point (4.2 in Phase II and III). Anything else within 7 blocks (8.4) takes the lower damage. Targets are knocked back for 10 ticks.",
        "The line reaches 44 blocks in Phase I and 52.8 in Phase II and III."
      ],
      timing: {
        1: { windup: 37, hit: [37, 38], end: 61 },
        2: { windup: 29, hit: [29, 30], end: 48 }
      },
      src: "slam_p1, slam_p2, slam_direct_*, slam_area_*"
    },
    {
      id: "melt", name: "Melt aura", kind: "passive", phases: [1, 2, 3],
      pick: "Always on while he is alive and not dying.",
      damage: [40, 56, 112], unit: "per tick", type: "surtr:melt",
      death: "melted into slag in Surtr’s presence",
      detail: [
        "Every non-ignored entity inside a box around each of his body segments takes this damage every tick. That is 800 per second in Phase I.",
        "The boxes are 7 to 15 blocks wide in Phase I (8 to 18 in Phase II and III) and cover legs, hips, torso, head and arms."
      ],
      src: "melt, melt_p1, melt_p2, melt_hit"
    },
    {
      id: "pulse", name: "Heat pulse", kind: "area", phases: [2, 3],
      pick: "Every 10 seconds from Phase II.",
      damage: [null, 280, 560], type: "surtr:pulse",
      death: "was scorched away by Surtr’s heat pulse",
      detail: [
        "A ring of heat expands outward from his feet over 8 ticks and reaches 20 blocks.",
        "Each entity is hit once, then slowed by an extra 20% for 5 seconds (stacks with the aura)."
      ],
      src: "pulse_clock, pulse_r1 to pulse_r8, pulse_hit"
    },
    {
      id: "rain", name: "Meteor rain", kind: "ranged", phases: [1, 2, 3],
      pick: "Every 7 seconds (3.5 in Phase III), on every player within 500 blocks.",
      damage: [600, 840, 1680], type: "surtr:meteor",
      death: "was crushed by a falling meteor",
      detail: [
        "10 meteors per player per volley, falling from 52 blocks up (62 in Phase II and III) and landing within about 14 blocks of the player.",
        "Blast damage within 8 blocks (16 in Phase II and III). Terrain is destroyed within 5 blocks (9). A meteor hit slows you an extra 20% for 3 seconds.",
        "The rain pauses if more than 300 meteors are already in the air."
      ],
      src: "rain_fire, rain_player, boom_p1, boom_p2, met_hit_*"
    },
    {
      id: "cannon", name: "Meteor cannon", kind: "ranged", phases: [1, 2, 3],
      pick: "When the target stays 60 or more blocks away and out of sword range for 6 seconds (3 in Phase III).",
      damage: [600, 840, 1680], type: "surtr:meteor",
      death: "was crushed by a falling meteor",
      detail: [
        "His left hand is a meteor cannon. A 66-tick sequence: brace (arm swings up), charge (barrel locks on, three rising sounds), then 5 volleys of 4 meteors at ticks 24, 30, 36, 42 and 48, with recoil each time. 20 meteors per sequence.",
        "Meteors leave from the muzzle, 24 blocks along the barrel (30 in Phase II and III), and scatter around the target.",
        "The cannon is skipped if more than 240 meteors are already in the air."
      ],
      src: "burst, cannon_tick, cannon_fire, cannon_dims"
    },
    {
      id: "charge", name: "Charge blast", kind: "transform", phases: [2],
      pick: "Once, during the Phase II transformation. In Ragnarok mode it happens too.",
      damage: [null, 1000, 1000], type: "minecraft:magic",
      death: "(vanilla magic damage)",
      detail: [
        "Ticks 12 to 49 of the transformation draw a red ring on the ground at exactly 30 blocks from Surtr. At tick 50 everyone inside the ring takes 1,000 magic damage.",
        "It is not multiplied in Phase III because it only happens while he changes form."
      ],
      src: "ravine_ring, ravine_charge_blast"
    },
    {
      id: "ravine", name: "Ravines", kind: "transform", phases: [2],
      pick: "Once, right after the charge blast (tick 58 of the transformation).",
      damage: [null, null, null], type: "terrain",
      detail: [
        "Surtr drives the sword into the ground and eight ravines split the land: four straight ones along the compass directions and four diagonal ones. They break every block except bedrock and end portal frames, from the bedrock layer (y −64) up to 12 blocks above Surtr. A lava pool fills y −63 to −61.",
        "The spread is 12 × 12 chunks: ±96 blocks along the cross arms and ±73 per axis along the diagonals. It finishes by tick 117 so the next phase can start on time.",
        "The whole area is force-loaded from the start of the transformation to the end. The ravine fills assume the overworld height (y −64)."
      ],
      src: "ravine_start, rv_c_*, rv_d_*, tags/block/ravine_break"
    },
    {
      id: "crash", name: "Crash landing", kind: "transform", phases: [1],
      pick: "Once, when he lands from the summon.",
      damage: [null, null, null], type: "explosion",
      death: "was incinerated by a crashing fireball",
      detail: [
        "A real vanilla explosion of power 60, 60 times a ghast fireball. Damage reaches around 120 blocks and terrain destruction runs dozens of blocks, with a big lag spike. It respects the mobGriefing rule.",
        "His hitboxes are shielded so it never hurts him. Change the power live with /scoreboard players set #crash_power surtr_cfg 30."
      ],
      src: "fire_big, boom_fire, landing"
    }
  ],

  /* range map rings: [Phase I, Phase II, Phase III] in blocks */
  ranges: [
    { label: "Stops walking", r: [20, 24, 24], cls: "walk" },
    { label: "Items burn, charge blast", r: [30, 30, 30], cls: "burn" },
    { label: "Starts attacking", r: [44, 52, 52], cls: "attack" },
    { label: "Slow aura", r: [50, 50, 50], cls: "slow" },
    { label: "Cannon wakes beyond", r: [60, 60, 60], cls: "cannon" },
    { label: "Speed doubles beyond", r: [90, 90, 90], cls: "fast" }
  ],

  /* ---------- drops ---------- */
  drops: {
    xp: "6 experience orbs of 2,000 each (12,000 XP)",
    chest: "When the death sequence ends (140 ticks after his health reaches 0), a chest named “Spoils of Surtr” appears on an obsidian pedestal on the surface where he fell. Everyone within 400 blocks is told in chat.",
    rows: [
      { item: "Armor piece (one of four, picked at random)", chance: "100%", p: 1, note: "One piece is always guaranteed." },
      { item: "Each of the other three armor pieces", chance: "25%", p: 0.25, note: "Rolled separately." },
      { item: "Blazing Nuclear Core", chance: "25%", p: 0.25 },
      { item: "Inferno Hilt", chance: "25%", p: 0.25 },
      { item: "Inactive Magma Blade", chance: "25%", p: 0.25 },
      { item: "Eternal Flame", chance: "5%", p: 0.05, note: "1 in 20." }
    ]
  },

  /* ---------- items ---------- */
  armor: {
    pieces: [
      { id: "helmet", name: "Infernal Ragnarok Helmet", base: "Netherite Helmet", pattern: "Flow" },
      { id: "chestplate", name: "Infernal Ragnarok Chestplate", base: "Netherite Chestplate", pattern: "Dune" },
      { id: "leggings", name: "Infernal Ragnarok Leggings", base: "Netherite Leggings", pattern: "Tide" },
      { id: "boots", name: "Infernal Ragnarok Boots", base: "Netherite Boots", pattern: "Eye" }
    ],
    common: [
      "Netherite base with a redstone trim, epic rarity, unbreakable.",
      "Carries the Infernal Ward enchantment: +5 protection against Surtr’s damage types and vanilla magic on each piece, but only while you wear the full set."
    ],
    bonuses: [
      { k: "Speed", v: "III" },
      { k: "Jump Boost", v: "II" },
      { k: "Regeneration", v: "XV" },
      { k: "Saturation", v: "X" },
      { k: "Resistance", v: "IV" },
      { k: "Fire Resistance", v: "Yes" },
      { k: "Strength", v: "III" },
      { k: "Max health", v: "+180 (200 total, 100 hearts)" },
      { k: "Knockback", v: "None (resistance +1.0)" },
      { k: "Slowness", v: "Cleared, immune to Surtr’s aura and slows" },
      { k: "Magic damage", v: "−96% (Resistance IV 80% and the enchantment 80%)" }
    ],
    pulse: "Magmatic Pulse: every 5 seconds, 100 magic damage and Slowness 255 for 2 seconds to every enemy within 12 blocks, with a shockwave ring.",
    halo: "Surtr’s own back halo (backhalo_p2) follows your torso, anchored behind it. It turns with your body with a 45° deadzone rather than your head.",
    taken: "Damage you take from each of his attacks with the full set, as calculated from the two reductions (0.2 × 0.2 = 4% of the original). Not measured in game."
  },

  components: [
    { id: "core", name: "Blazing Nuclear Core", base: "nether_star", model: "sa_core", sprite: "sa_core", chance: "25%", d: "A component of Sumarbrander. Max stack 1, fire-proof." },
    { id: "hilt", name: "Inferno Hilt", base: "blaze_rod", model: "sa_hilt_3d", sprite: "sa_hilt", chance: "25%", d: "A component of Sumarbrander. Flat sprite in menus, 3D model in hand." },
    { id: "blade", name: "Inactive Magma Blade", base: "iron_ingot", model: "sa_blade_3d", sprite: "sa_blade", chance: "25%", d: "A component of Sumarbrander. Flat sprite in menus, 3D model in hand." },
    { id: "flame", name: "Eternal Flame", base: "blaze_powder", model: "sa_flame", sprite: "sa_flame", chance: "5%", d: "Carry it with Sumarbrander to ascend it into the Godslayer. Halves all cooldowns." }
  ],

  swords: [
    { id: "sumarbrander", name: "Sumarbrander", model: "sa_sumar", sprite: "sa_sumar", cd: [200, 100, 40], note: "Forged from Core + Hilt + Blade." },
    { id: "godslayer", name: "Godslayer Sumarbrander", model: "sa_godsumar", sprite: "sa_godsumar", cd: [100, 50, 20], note: "Ascended from Sumarbrander + Eternal Flame. Half cooldowns." }
  ],

  swordStats: [
    { k: "Base item", v: "Carrot on a stick (used to detect right clicks)" },
    { k: "Attack damage", v: "50 (1 base + 49)" },
    { k: "Attack speed", v: "1.6 per second (−2.4)" },
    { k: "Reach", v: "+3 blocks" },
    { k: "Enchantment", v: "Magma Edge: ignores armor completely" },
    { k: "Wide swipe", v: "25 magic damage to every enemy within 4 blocks of a point 2.5 blocks in front of your eyes" },
    { k: "Durability", v: "Unbreakable and fire-proof" },
    { k: "Strength", v: "Stacks with the effect from the armor" }
  ],

  abilities: [
    {
      id: "dance", name: "Sword Dance", control: "Right click",
      cd: [40, 20],
      d: "Dash 15 blocks forward (three steps a tick for 5 ticks, one block each), cutting through everything within 5 blocks of your path. Each enemy is hit once.",
      facts: ["400 magic damage", "Slowness 255 for 5 s", "Resistance V for 1 s while dashing", "Stops at blocks you cannot pass"]
    },
    {
      id: "flurry", name: "Flurry", control: "Sneak + left click",
      cd: [100, 50],
      d: "Slashes play across a dome around you for 5 seconds. Every 5 ticks, each enemy within 8 blocks takes 5 hits of 25.",
      facts: ["125 per burst, 20 bursts", "Up to 2,500 per enemy", "8 block radius", "While sneaking an invisible entity catches your clicks. Stand up to hit normally."]
    },
    {
      id: "bifrost", name: "Bifrost", control: "Sneak + right click",
      cd: [200, 100],
      d: "Every enemy within 100 blocks gets a white halo circle laid under it (one huge one under Surtr), glows and is ensnared for 3 seconds. Then a rainbow beam strikes each of them.",
      facts: ["500 magic damage", "100 block radius", "Slowness 255 and glowing; mobs lose their AI", "Surtr freezes in place while it charges"]
    }
  ],

  forge: [
    { from: ["core", "hilt", "blade"], to: "sumarbrander", prompt: "[ FORGE SUMARBRANDER ]", d: "Carry all three. The prompt appears in chat, click it to consume them." },
    { from: ["sumarbrander", "flame"], to: "godslayer", prompt: "[ ASCEND TO GODSLAYER ]", d: "Carry Sumarbrander and the Eternal Flame. The prompt appears in chat, click it to consume both." }
  ],

  enemyNote: "Abilities hit mobs in the surtr:sa_enemy tag (hostile vanilla mobs, bosses, modded mobs you add), Surtr’s hitboxes, and Jormungandr parts. Players are never targeted.",

  /* ---------- models ---------- */
  parts: [
    { id: "pillar", name: "Pillar", role: "Lower body and legs (display 0)" },
    { id: "pelvis", name: "Pelvis", role: "Hips (display 1)" },
    { id: "chest", name: "Chest", role: "Torso with shoulder plates (display 2)" },
    { id: "head", name: "Head", role: "Skull, brow and horns (display 3)" },
    { id: "jaw", name: "Jaw", role: "Lower jaw, hinged (display 4)" },
    { id: "flame", name: "Flame crown", role: "Crown above the head (display 5)" },
    { id: "rupper", name: "Right upper arm", role: "Sword arm shoulder (display 6)" },
    { id: "rfore", name: "Right forearm", role: "Sword arm forearm (display 7)" },
    { id: "rhand", name: "Right hand", role: "Armoured fist gripping the sword (display 8)" },
    { id: "sword", name: "Sword", role: "The blade he fights with (display 9)" },
    { id: "lupper", name: "Left upper arm", role: "Cannon arm shoulder (display 10)" },
    { id: "lfore", name: "Cannon", role: "Left forearm, the meteor cannon (display 11)" },
    { id: "backhalo", name: "Back halo", role: "Sunburst disc behind the torso, from Phase II (display 12)" }
  ],

  otherModels: [
    { id: "meteor", name: "Meteor", role: "Phase I meteor (rain and cannon)", group: "Meteors" },
    { id: "meteor_p2", name: "Meteor, Phase II", role: "Crimson meteor", group: "Meteors" },
    { id: "meteor_p3", name: "Meteor, Phase III", role: "Black meteor with white stripes", group: "Meteors" },
    { id: "sa_core", name: "Blazing Nuclear Core", role: "Drop, breathing glow", group: "Items" },
    { id: "sa_hilt_3d", name: "Inferno Hilt (in hand)", role: "Drop, 3D hand model of sa_hilt", group: "Items" },
    { id: "sa_blade_3d", name: "Inactive Magma Blade (in hand)", role: "Drop, 3D hand model of sa_blade", group: "Items" },
    { id: "sa_flame", name: "Eternal Flame", role: "Drop, magma brazier with flame planes", group: "Items" },
    { id: "sa_sumar", name: "Sumarbrander", role: "Forged sword, about 405 stacked cuboids", group: "Items" },
    { id: "sa_godsumar", name: "Godslayer Sumarbrander", role: "Ascended sword, roaring magma", group: "Items" },
    { id: "sa_pulse_ring", name: "Magmatic Pulse ring", role: "Shockwave from the armor pulse", group: "Effects" },
    { id: "sa_bif_circle", name: "Bifrost circle", role: "White halo laid under Bifrost targets", group: "Effects" },
    { id: "sa_hilt", name: "Inferno Hilt (flat)", role: "Flat sprite used in menus", group: "Flat items" },
    { id: "sa_blade", name: "Inactive Magma Blade (flat)", role: "Flat sprite used in menus", group: "Flat items" }
  ],

  /* ---------- reference ---------- */
  commands: [
    { c: "/function surtr:summon_here", d: "Summon Surtr at your feet, no ritual." },
    { c: "/function surtr:remove", d: "Remove everything Surtr-related: boss, hitboxes, models, meteors, blasts, fireballs, slow effects, boss bar, music." },
    { c: "/function surtr:kill", d: "Same as remove." },
    { c: "/function surtr:slay", d: "Set his health to 0 so the death sequence runs." },
    { c: "/function surtr:force_p2", d: "Start Phase II (works when he is between attacks)." },
    { c: "/function surtr:force_p3", d: "Start Phase III (from Phase II, between attacks)." },
    { c: "/function surtr:togglerag", d: "Ragnarok mode: next Surtr lands straight into the ravine attack and Phase III." },
    { c: "/function surtr:debug", d: "Prints state. Expect 24 hitboxes and 12 displays (13 with the back halo)." },
    { c: "/function surtr:toggle_flip", d: "Fix models that face backwards (kill and summon again)." },
    { c: "/function surtr:toggle_jaw", d: "Fix a mirrored jaw." },
    { c: "/function surtr:toggle_roll", d: "Fix the sword’s roll in the ready stance." },
    { c: "/function surtr:toggle_hand", d: "Flip which side the fingers wrap the sword grip." },
    { c: "/function surtr:toggle_pool", d: "Switch the lava pool between full sphere and partial." },
    { c: "/function surtr:sa/give_all", d: "Give yourself every drop: four armor pieces, Core, Hilt, Blade, Flame, Sumarbrander and Godslayer." }
  ],

  config: [
    { k: "#hpmax surtr_cfg", v: "4800", d: "Health pool." },
    { k: "#crash_power surtr_cfg", v: "60", d: "Explosion power of the landing crash." },
    { k: "#music_len surtr_cfg", v: "2961", d: "Music length in ticks, set to your track’s length." },
    { k: "#roar_min / #roar_var surtr_cfg", v: "400 / 600", d: "Roars every 400 to 1000 ticks." },
    { k: "#rag surtr_cfg", v: "0", d: "Ragnarok mode, use togglerag." }
  ],

  deaths: [
    { id: "surtr_melt", text: "%1$s melted into slag in Surtr’s presence" },
    { id: "surtr_blade", text: "%1$s was cleaved by Surtr’s flaming sword" },
    { id: "surtr_meteor", text: "%1$s was crushed by a falling meteor" },
    { id: "surtr_pulse", text: "%1$s was scorched away by Surtr’s heat pulse" },
    { id: "surtr_blast", text: "%1$s was incinerated by a crashing fireball" },
    { id: "surtr_golem", text: "%1$s was smashed by a Magma Golem (unused: golems were removed in v2.0)" }
  ],

  sounds: [
    ["boss.music", "Pigstep"], ["boss.roar", "Ender dragon growl, pitch 0.5"], ["boss.spawn", "Wither spawn"],
    ["boss.rumble", "Explosion, pitch 0.4"], ["boss.swing", "Sweep attack"], ["boss.stab", "Warden attack impact"],
    ["boss.slam", "Explosion, pitch 0.5"], ["boss.meteor_launch", "Blaze shoot"], ["boss.meteor_hit", "Explosion, pitch 0.8"],
    ["boss.pulse", "Warden sonic boom"], ["boss.phase2", "Wither break block"], ["boss.death", "Wither death"],
    ["boss.step", "Warden and iron golem steps"], ["boss.sizzle", "Lava extinguish"]
  ]
};
