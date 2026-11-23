// config.js — Solara Bay constants: world, districts, cars, weapons,
// missions, colors and tuning. Everything the other modules read lives here.
(function () {
  'use strict';

  var SB = window.SB = window.SB || {};

  // ---- world -------------------------------------------------------------
  SB.WORLD_W = 3200;
  SB.WORLD_H = 2400;
  SB.ROAD_W = 56;
  // Vertical roads (x) and horizontal roads (y) of the grid.
  SB.ROADS_X = [400, 800, 1200, 1600, 2000, 2400, 2800];
  SB.ROADS_Y = [300, 600, 900, 1200, 1500, 1800, 2100];
  // Beach: ocean west of x=70, sand 70..190, city starts at 190.
  SB.OCEAN_X = 70;
  SB.SAND_X = 190;

  // ---- districts ---------------------------------------------------------
  // name, rect, base color, label position.
  SB.DISTRICTS = [
    { name: 'Old Town',     x: 220,  y: 80,   w: 940,  h: 480,  color: '#c9a06a', labelX: 690,  labelY: 320 },
    { name: 'Beachfront',   x: 190,  y: 620,  w: 560,  h: 1560, color: '#e8d29a', labelX: 470,  labelY: 1400 },
    { name: 'Downtown',     x: 1240, y: 620,  w: 940,  h: 760,  color: '#8f9bb0', labelX: 1710, labelY: 1000 },
    { name: 'Palm Heights', x: 2220, y: 80,   w: 900,  h: 900,  color: '#a8c686', labelX: 2670, labelY: 540 },
    { name: 'Marina',       x: 800,  y: 1860, w: 900,  h: 460,  color: '#7fb3c8', labelX: 1250, labelY: 2090 },
    { name: 'Portside',     x: 2220, y: 1420, w: 900,  h: 900,  color: '#b08968', labelX: 2670, labelY: 1870 },
  ];

  // Parks: rects drawn as green with trees.
  SB.PARKS = [
    { x: 840,  y: 940,  w: 320, h: 220 },
    { x: 2040, y: 340,  w: 320, h: 220 },
    { x: 1240, y: 1540, w: 320, h: 220 },
    { x: 2440, y: 1000, w: 320, h: 220 },
  ];

  // ---- cars --------------------------------------------------------------
  SB.CAR_MODELS = [
    { id: 'sedan',   name: 'Solano Sedan',  w: 46, h: 22, accel: 0.16, top: 5.2, grip: 0.94, colors: ['#c0392b', '#2c3e50', '#7f8c8d', '#16a085'] },
    { id: 'sports',  name: 'Comet GT',      w: 48, h: 21, accel: 0.24, top: 7.4, grip: 0.90, colors: ['#e74c3c', '#f1c40f', '#e67e22', '#ecf0f1'] },
    { id: 'taxi',    name: 'Bay Cab',       w: 46, h: 22, accel: 0.15, top: 5.0, grip: 0.94, colors: ['#f39c12'] },
    { id: 'van',     name: 'Cargo Van',     w: 54, h: 24, accel: 0.12, top: 4.4, grip: 0.96, colors: ['#95a5a6', '#34495e', '#d5dbdb'] },
    { id: 'truck',   name: 'Hauler',        w: 62, h: 26, accel: 0.10, top: 4.0, grip: 0.97, colors: ['#7b7d7d', '#a04000'] },
    { id: 'coupe',   name: 'Sunset Coupe',  w: 46, h: 21, accel: 0.20, top: 6.4, grip: 0.91, colors: ['#8e44ad', '#2980b9', '#c0392b'] },
    { id: 'police',  name: 'SBPD Interceptor', w: 48, h: 22, accel: 0.22, top: 6.8, grip: 0.90, colors: ['#1a1a2e'] },
  ];
  SB.CAR_BY_ID = {};
  SB.CAR_MODELS.forEach(function (m) { SB.CAR_BY_ID[m.id] = m; });

  // ---- weapons -----------------------------------------------------------
  SB.WEAPONS = [
    { id: 'fists',   name: 'Fists',   damage: 12, rate: 320, range: 34,  spread: 0,    pellets: 1, auto: false, ammo: Infinity, color: '#f5d0a9' },
    { id: 'pistol',  name: 'P9 Pistol', damage: 22, rate: 260, range: 420, spread: 0.04, pellets: 1, auto: false, ammo: 120, color: '#d5dbdb' },
    { id: 'smg',     name: 'K-9 SMG', damage: 13, rate: 90,  range: 380, spread: 0.09, pellets: 1, auto: true,  ammo: 240, color: '#aed6f1' },
    { id: 'shotgun', name: 'Street Sweeper', damage: 14, rate: 700, range: 260, spread: 0.16, pellets: 6, auto: false, ammo: 40, color: '#f0b27a' },
  ];
  SB.WEAPON_BY_ID = {};
  SB.WEAPONS.forEach(function (w) { SB.WEAPON_BY_ID[w.id] = w; });

  // ---- shops / pickups ----------------------------------------------------
  SB.WEAPON_SHOPS = [
    { name: 'Ammu-Bay', x: 1300, y: 700 },
    { name: 'Ammu-Bay', x: 2500, y: 1600 },
  ];
  SB.FOOD_STANDS = [
    { name: 'Taco Sol', x: 500, y: 900 },
    { name: 'Taco Sol', x: 2100, y: 1300 },
    { name: 'Taco Sol', x: 900, y: 2000 },
  ];
  SB.GARAGE = { x: 1700, y: 1550 };
  // 8 hidden packages scattered around the city.
  SB.PACKAGES = [
    { x: 260,  y: 240 }, { x: 760,  y: 1750 }, { x: 1560, y: 320 },
    { x: 2760, y: 760 }, { x: 460,  y: 2150 }, { x: 1960, y: 2060 },
    { x: 2960, y: 1640 }, { x: 1160, y: 1160 },
  ];

  // ---- respect ranks ------------------------------------------------------
  SB.RANKS = [
    { name: 'Nobody',      min: 0 },
    { name: 'Street Kid',  min: 100 },
    { name: 'Hustler',     min: 300 },
    { name: 'Wheelman',    min: 600 },
    { name: 'Enforcer',    min: 1000 },
    { name: 'Bay Legend',  min: 1600 },
  ];

  // ---- missions -----------------------------------------------------------
  // Each mission: id, name, giver, reward, respect, brief, and stages.
  // Stage types: goto (reach a point), kill (defeat N enemies), drive (reach
  // a point in a car), race (hit checkpoints in order), defend (survive a
  // timer while enemies spawn), rescue (reach a person, then return).
  SB.MISSIONS = [
    {
      id: 1, name: 'First Drop', giver: 'Vera Solano', reward: 300, respect: 80,
      brief: 'A package for a client in the Marina. No questions, no stops. Drive it there.',
      stages: [
        { type: 'goto', x: 1250, y: 2090, text: 'Drive to the Marina drop point' },
      ],
      dialogue: [
        'VERA: You drive, kid? Good. A package needs to reach the Marina by sunset.',
        'VERA: No questions. No stops. The client pays in cash.',
      ],
    },
    {
      id: 2, name: 'Hot Wheels', giver: 'Vera Solano', reward: 500, respect: 120,
      brief: 'A Comet GT is parked up in Palm Heights. Take it. Bring it to the garage on 5th.',
      stages: [
        { type: 'steal', x: 2670, y: 540, text: 'Steal the Comet GT in Palm Heights' },
        { type: 'drive', x: 1700, y: 1550, text: 'Deliver the Comet GT to the garage' },
      ],
      dialogue: [
        'VERA: A Comet GT, cherry red, parked outside a mansion in Palm Heights.',
        'VERA: It belongs to a man who owes me money. Take it. Bring it to my garage.',
      ],
    },
    {
      id: 3, name: 'Plaza Showdown', giver: 'Vera Solano', reward: 800, respect: 180,
      brief: 'The Marlow crew is muscling into Old Town. Clear the plaza. All six of them.',
      stages: [
        { type: 'kill', count: 6, x: 690, y: 320, text: 'Clear the Old Town plaza (0/6)' },
      ],
      dialogue: [
        'VERA: The Marlow crew thinks Old Town is theirs now. It is not.',
        'VERA: Six of them in the plaza. Make it loud. Make it final.',
      ],
    },
    {
      id: 4, name: 'Beachfront Rush', giver: 'Vera Solano', reward: 1000, respect: 220,
      brief: 'A street race down the beachfront. Four checkpoints, no cops, no mercy.',
      stages: [
        { type: 'race', checkpoints: [{ x: 470, y: 700 }, { x: 470, y: 1200 }, { x: 470, y: 1750 }, { x: 470, y: 2150 }], text: 'Race the beachfront checkpoints (0/4)' },
      ],
      dialogue: [
        'VERA: Tonight the beachfront belongs to the racers. You are my entry.',
        'VERA: Four checkpoints, top to bottom. Win and the pot is ours.',
      ],
    },
    {
      id: 5, name: 'Dockside Defense', giver: 'Vera Solano', reward: 1200, respect: 260,
      brief: 'Marlow hitmen are coming for the docks. Hold the pier for ninety seconds.',
      stages: [
        { type: 'defend', count: 8, seconds: 90, x: 1250, y: 2090, text: 'Defend the Marina docks' },
      ],
      dialogue: [
        'VERA: My shipment lands at the Marina tonight and Marlow knows it.',
        'VERA: Hold the pier. Ninety seconds. Whatever comes down that dock, stop it.',
      ],
    },
    {
      id: 6, name: 'Midnight Rescue', giver: 'Vera Solano', reward: 1500, respect: 320,
      brief: 'They grabbed my driver Rico and stashed him in a Portside warehouse. Get him out.',
      stages: [
        { type: 'kill', count: 4, x: 2670, y: 1870, text: 'Clear the Portside warehouse guards (0/4)' },
        { type: 'rescue', x: 2670, y: 1870, text: 'Reach Rico and get him out' },
      ],
      dialogue: [
        'VERA: They took Rico. My driver. My friend. Portside warehouse, four guards.',
        'VERA: Bring him home alive and I will owe you more than money.',
      ],
    },
    {
      id: 7, name: 'Highway Heat', giver: 'Vera Solano', reward: 1800, respect: 380,
      brief: 'An ambush on the Downtown strip. Eight gunmen. Then lose the heat and get clear.',
      stages: [
        { type: 'kill', count: 8, x: 1710, y: 1000, text: 'Survive the Downtown ambush (0/8)' },
        { type: 'escape', text: 'Lose the wanted level' },
      ],
      dialogue: [
        'VERA: It is a trap, and you are walking into it on purpose. Downtown strip.',
        'VERA: Eight gunmen. When the shooting stops, the cops come. Lose them.',
      ],
    },
    {
      id: 8, name: 'The Solano Tower', giver: 'Vera Solano', reward: 3000, respect: 500,
      brief: 'Marlow himself, on the top of his tower in Downtown. End this.',
      stages: [
        { type: 'kill', count: 10, x: 1710, y: 1000, text: 'Fight through the tower guards (0/10)' },
        { type: 'boss', x: 1710, y: 1000, text: 'Take down Marlow "Rook" himself' },
      ],
      dialogue: [
        'VERA: Marlow "Rook" built his tower on my city. Tonight it falls.',
        'VERA: Ten guards between you and him. Then it is just you and Rook.',
      ],
    },
  ];

  // ---- colors / tuning ----------------------------------------------------
  SB.COLORS = {
    grass: '#7fae5a', road: '#3a3f4a', roadLine: '#e8d44d', sidewalk: '#9aa0a8',
    sand: '#e6d199', ocean: '#2e7fa8', oceanDeep: '#1f5f86', building: '#b0b7c3',
    buildingRoof: '#8d94a3', park: '#5d9b4a', hudBg: 'rgba(10,14,24,0.72)',
  };
  SB.TUNING = {
    playerSpeed: 3.1, sprintSpeed: 4.6, playerRadius: 13,
    maxWanted: 5, wantedDecayHidden: 0.012, wantedDecayVisible: 0.004,
    copSpawnInterval: 260, heliMinStars: 4, roadblockMinStars: 3,
    pedCount: 26, trafficCount: 16, parkedCount: 22,
    dayLengthSec: 240, startHour: 17.5,
  };
  SB.RADIO_STATIONS = ['SOL 98.5 — Sunset FM', 'BAY 104.2 — Neon Nights', 'WAVE 91.1 — Palm Talk'];
})();
