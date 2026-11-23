// shots.js — staging for the four deterministic screenshot scenes.
// Each function places cars, pedestrians and police, and sets cash, health,
// wanted level and mission stage, then leaves the world frozen for render.
(function () {
  'use strict';
  var SB = window.SB = window.SB || {};

  function baseScene(game) {
    // Clear dynamic entities; keep the world itself.
    game.cars = [];
    game.peds = [];
    game.combat.bullets = [];
    game.combat.particles = [];
    game.combat.explosions = [];
    game.player.cash = 2450;
    game.player.health = 100;
    game.player.armor = 60;
    game.player.respect = 420;
    game.player.wanted = 0;
    game.hour = 17.8; // golden hour
  }

  function parkRow(game, x, y, angle, models) {
    for (var i = 0; i < models.length; i++) {
      var m = SB.CAR_BY_ID[models[i]];
      game.cars.push(SB.makeCar(models[i], x + i * 0, y + i * 62, angle, m.colors[i % m.colors.length], { driver: null }));
    }
  }

  function crowd(game, x, y, n, rng) {
    var shirts = ['#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#e67e22', '#16a085'];
    for (var i = 0; i < n; i++) {
      var px = x + SB.rand(rng, -160, 160);
      var py = y + SB.rand(rng, -120, 120);
      var ped = SB.makePed(px, py, { shirt: shirts[i % shirts.length] });
      ped.tx = px; ped.ty = py;
      game.peds.push(ped);
    }
  }

  // Title screen.
  SB.stageStart = function (game) {
    baseScene(game);
    game.screen = 'title';
    game.hasSave = false;
  };

  // Player driving a red sports car down the beachfront road, mission 1 active.
  SB.stageDrive = function (game) {
    baseScene(game);
    game.screen = 'play';
    var car = SB.makeCar('sports', 470, 1200, Math.PI / 2, '#e74c3c', { driver: 'player' });
    game.cars.push(car);
    game.player.inCar = car;
    game.player.x = car.x; game.player.y = car.y;
    game.player.angle = Math.PI / 2;
    // Traffic ahead and behind on the beachfront road.
    game.cars.push(SB.makeCar('sedan', 470, 950, Math.PI / 2, '#2c3e50', { driver: 'traffic', target: { x: 470, y: 300, vertical: true } }));
    game.cars.push(SB.makeCar('taxi', 470, 1500, -Math.PI / 2, '#f39c12', { driver: 'traffic', target: { x: 470, y: 2100, vertical: true } }));
    game.cars.push(SB.makeCar('coupe', 430, 700, Math.PI / 2, '#2980b9', { driver: 'traffic', target: { x: 430, y: 300, vertical: true } }));
    // Parked cars along the beach.
    parkRow(game, 340, 1000, Math.PI / 2, ['sedan', 'van', 'coupe']);
    // Pedestrians on the beach and sidewalk.
    crowd(game, 260, 1150, 6, game.rng);
    crowd(game, 560, 1400, 5, game.rng);
    // Mission 1 active, stage 0.
    game.missions.index = 0;
    game.missions.active = { def: SB.MISSIONS[0], stage: 0, kills: 0, timer: 0, spawned: true, bossSpawned: false, raceCp: 0, targetCar: null };
    SB.setToast(game.missions, 'MISSION: First Drop — Drive to the Marina drop point', 9999);
    game.camera.x = car.x - 640;
    game.camera.y = car.y - 360;
  };

  // 3-star police chase downtown with interceptors.
  SB.stageChase = function (game) {
    baseScene(game);
    game.screen = 'play';
    game.player.wanted = 3;
    var car = SB.makeCar('sports', 1710, 1000, 0, '#f1c40f', { driver: 'player' });
    game.cars.push(car);
    game.player.inCar = car;
    game.player.x = car.x; game.player.y = car.y;
    game.player.angle = 0;
    // Three interceptors closing in.
    var c1 = SB.makeCar('police', 1560, 1000, 0, '#1a1a2e', { driver: 'police' });
    var c2 = SB.makeCar('police', 1860, 940, Math.PI, '#1a1a2e', { driver: 'police' });
    var c3 = SB.makeCar('police', 1710, 1180, -Math.PI / 2, '#1a1a2e', { driver: 'police' });
    game.cars.push(c1, c2, c3);
    // Traffic scattering.
    game.cars.push(SB.makeCar('sedan', 1600, 1200, Math.PI / 2, '#7f8c8d', { driver: 'traffic', target: { x: 1600, y: 1500, vertical: true } }));
    game.cars.push(SB.makeCar('van', 1900, 1120, 0, '#95a5a6', { driver: 'traffic', target: { x: 2400, y: 1120, vertical: false } }));
    // Fleeing pedestrians.
    crowd(game, 1500, 900, 5, game.rng);
    game.peds.forEach(function (p) { p.state = 'flee'; });
    // Roadblock hint: two police cars angled across the road ahead.
    game.cars.push(SB.makeCar('police', 2050, 985, Math.PI / 2, '#1a1a2e', { driver: null }));
    game.cars.push(SB.makeCar('police', 2050, 1035, Math.PI / 2, '#1a1a2e', { driver: null }));
    game.hour = 18.6;
    game.camera.x = car.x - 640;
    game.camera.y = car.y - 360;
  };

  // On-foot shootout at the Old Town plaza, mission 3 in progress, wanted 2.
  SB.stageMission = function (game) {
    baseScene(game);
    game.screen = 'play';
    game.player.wanted = 2;
    game.player.x = 690;
    game.player.y = 480;
    game.player.angle = SB.angleTo(690, 480, 690, 320);
    game.player.weapon = 'smg';
    game.player.inCar = null;
    game.player.muzzle = 4;
    // Mission 3 active, 2 of 6 down.
    game.missions.index = 2;
    game.missions.active = { def: SB.MISSIONS[2], stage: 0, kills: 2, timer: 0, spawned: true, bossSpawned: false, raceCp: 0, targetCar: null };
    // Four armed gunmen in the plaza + two already down.
    var spots = [[620, 300], [760, 290], [700, 350], [640, 380]];
    spots.forEach(function (s, i) {
      var ped = SB.makePed(s[0], s[1], { enemy: true, armed: true, state: 'fight', shirt: '#7b2d26', name: 'Marlow gunman' });
      ped.angle = SB.angleTo(s[0], s[1], 690, 480);
      game.peds.push(ped);
    });
    var dead1 = SB.makePed(720, 330, { enemy: true, armed: true, state: 'dead', shirt: '#5b2c6f' });
    var dead2 = SB.makePed(660, 300, { enemy: true, armed: true, state: 'dead', shirt: '#1a5276' });
    game.peds.push(dead1, dead2);
    // A couple of muzzle-flash bullets mid-air for action.
    game.combat.bullets.push({ x: 690, y: 420, angle: -Math.PI / 2, speed: 13, damage: 13, range: 380, fromPlayer: true, life: 0 });
    game.combat.bullets.push({ x: 660, y: 360, angle: Math.PI / 2, speed: 11, damage: 8, range: 460, fromPlayer: false, life: 0 });
    // Parked cars and a crowd at the plaza edge.
    parkRow(game, 560, 560, 0, ['sedan', 'coupe']);
    crowd(game, 900, 500, 5, game.rng);
    game.hour = 18.2;
    SB.setToast(game.missions, 'MISSION: Plaza Showdown — Clear the plaza (2/6)', 9999);
    game.camera.x = 690 - 640;
    game.camera.y = 380 - 360;
  };

  SB.STAGE_FNS = { start: SB.stageStart, drive: SB.stageDrive, chase: SB.stageChase, mission: SB.stageMission };
})();
