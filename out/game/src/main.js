// main.js — Solara Bay game state, main loop, updates (player, traffic,
// police AI, missions, wanted decay, save/load) and the deterministic
// screenshot mode (?shot= & ?seed= stage one frozen scene and render it).
(function () {
  'use strict';
  var SB = window.SB = window.SB || {};

  var SAVE_KEY = 'solara-bay-save-v1';

  function spawnCity(game) {
    var rng = game.rng;
    // Parked cars on roadsides.
    for (var i = 0; i < SB.TUNING.parkedCount; i++) {
      var rx = SB.pick(rng, SB.ROADS_X);
      var ry = SB.pick(rng, SB.ROADS_Y);
      var vertical = rng() < 0.5;
      var x = vertical ? rx + (rng() < 0.5 ? -38 : 38) : SB.rand(rng, SB.SAND_X + 100, SB.WORLD_W - 100);
      var y = vertical ? SB.rand(rng, 100, SB.WORLD_H - 100) : ry + (rng() < 0.5 ? -38 : 38);
      if (SB.buildingAt(game.world, x, y, 20)) continue;
      var model = SB.pick(rng, ['sedan', 'sedan', 'coupe', 'van', 'sports', 'taxi']);
      var m = SB.CAR_BY_ID[model];
      game.cars.push(SB.makeCar(model, x, y, vertical ? (rng() < 0.5 ? 0 : Math.PI) : (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2), m.colors[Math.floor(rng() * m.colors.length)], { driver: null }));
    }
    // Traffic.
    for (var t = 0; t < SB.TUNING.trafficCount; t++) {
      var snap = SB.snapToRoad(SB.rand(rng, 300, SB.WORLD_W - 100), SB.rand(rng, 100, SB.WORLD_H - 100));
      var model2 = SB.pick(rng, ['sedan', 'sedan', 'taxi', 'van', 'coupe']);
      var m2 = SB.CAR_BY_ID[model2];
      var car = SB.makeCar(model2, snap.x, snap.y, snap.vertical ? 0 : Math.PI / 2, m2.colors[Math.floor(rng() * m2.colors.length)], { driver: 'traffic' });
      car.target = SB.nextTrafficTarget(car, rng);
      game.cars.push(car);
    }
    // Pedestrians.
    var shirts = ['#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#e67e22', '#16a085', '#d4ac0d', '#7f8c8d'];
    for (var p = 0; p < SB.TUNING.pedCount; p++) {
      var ped = SB.makePed(SB.rand(rng, SB.SAND_X + 30, SB.WORLD_W - 30), SB.rand(rng, 30, SB.WORLD_H - 30), { shirt: shirts[p % shirts.length] });
      var tgt = SB.nextPedTarget(ped, rng);
      ped.tx = tgt.x; ped.ty = tgt.y;
      game.peds.push(ped);
    }
  }

  function newGame(seed) {
    var rng = SB.makeRng(seed);
    var game = {
      seed: seed,
      rng: rng,
      world: SB.buildWorld(seed),
      player: SB.makePlayer(1600, 1200), // road intersection downtown: never inside a building
      cars: [],
      peds: [],
      combat: SB.newCombatState(),
      missions: SB.newMissionState(),
      audio: SB.makeAudio(),
      heli: SB.makeHeli(1710, 1000),
      camera: { x: 0, y: 0 },
      clock: 0,
      hour: SB.TUNING.startHour,
      screen: 'title', // title | play | pause | wasted | busted
      showMap: false,
      frozen: false,
      hasSave: false,
      saveInfo: null,
      copTimer: 0,
      sirenTimer: 0,
      lastCrime: 0,
      bustedTimer: 0,
      collectedPackages: {},
      shotMode: null,
    };
    spawnCity(game);
    return game;
  }

  // ---- save / load ---------------------------------------------------------
  function saveGame(game) {
    try {
      var p = game.player;
      var data = {
        x: p.inCar ? p.inCar.x : p.x, y: p.inCar ? p.inCar.y : p.y,
        health: p.health, armor: p.armor, cash: p.cash, respect: p.respect,
        weapon: p.weapon, ammo: p.ammo, owned: p.owned,
        missions: game.missions.index, completed: game.missions.completed,
        packages: game.player.packages, collectedPackages: game.collectedPackages,
        hour: game.hour,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      SB.setToast(game.missions, 'Game saved', 2.5);
      return true;
    } catch (e) { return false; }
  }

  function loadSave(game) {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      var d = JSON.parse(raw);
      var p = game.player;
      p.x = d.x; p.y = d.y; p.health = d.health; p.armor = d.armor;
      p.cash = d.cash; p.respect = d.respect; p.weapon = d.weapon;
      p.ammo = d.ammo; p.owned = d.owned; p.packages = d.packages || 0;
      game.missions.index = d.missions || 0;
      game.missions.completed = d.completed || [];
      game.collectedPackages = d.collectedPackages || {};
      game.hour = d.hour || SB.TUNING.startHour;
      game.screen = 'play';
      return true;
    } catch (e) { return false; }
  }

  function readSaveInfo(game) {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      var d = JSON.parse(raw);
      game.hasSave = true;
      game.saveInfo = { cash: d.cash, missions: (d.completed || []).length, packages: d.packages || 0 };
    } catch (e) { /* no save */ }
  }

  // ---- player --------------------------------------------------------------
  function movePlayer(game, dt) {
    var p = game.player;
    var input = SB.input;
    var mx = (input.down('KeyA') || input.down('ArrowLeft') ? -1 : 0) + (input.down('KeyD') || input.down('ArrowRight') ? 1 : 0);
    var my = (input.down('KeyW') || input.down('ArrowUp') ? -1 : 0) + (input.down('KeyS') || input.down('ArrowDown') ? 1 : 0);
    // Aim follows the mouse.
    var wx = input.mouse.x + game.camera.x;
    var wy = input.mouse.y + game.camera.y;
    p.angle = SB.angleTo(p.x, p.y, wx, wy);

    if (p.inCar) {
      var car = p.inCar;
      var throttle = (input.down('KeyW') || input.down('ArrowUp') ? 1 : 0) + (input.down('KeyS') || input.down('ArrowDown') ? -0.7 : 0);
      var steer = (input.down('KeyA') || input.down('ArrowLeft') ? -1 : 0) + (input.down('KeyD') || input.down('ArrowRight') ? 1 : 0);
      if (car.speed < 0) steer = -steer;
      SB.driveCar(car, throttle, steer, dt);
      p.x = car.x; p.y = car.y; p.angle = car.angle;
      if (Math.abs(car.speed) > 3 && game.rng() < 0.05) game.audio.play('engine');
      return;
    }

    var sprint = input.down('ShiftLeft') || input.down('ShiftRight');
    var speed = (sprint ? SB.TUNING.sprintSpeed : SB.TUNING.playerSpeed) * dt * 60 * 0.55;
    var len = Math.sqrt(mx * mx + my * my);
    if (len > 0) {
      var nx = p.x + (mx / len) * speed;
      var ny = p.y + (my / len) * speed;
      // Axis-separated movement with building collision.
      if (!SB.buildingAt(game.world, nx, p.y, SB.TUNING.playerRadius)) p.x = nx;
      if (!SB.buildingAt(game.world, p.x, ny, SB.TUNING.playerRadius)) p.y = ny;
      p.x = SB.clamp(p.x, SB.SAND_X + 4, SB.WORLD_W - 8);
      p.y = SB.clamp(p.y, 8, SB.WORLD_H - 8);
      if (SB.isInOcean(p.x)) p.x = SB.OCEAN_X + 4;
    }
  }

  function tryEnterExitCar(game) {
    var p = game.player;
    if (p.inCar) {
      var car = p.inCar;
      p.inCar = null;
      car.driver = null;
      // Step out to the side.
      p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 30;
      p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 30;
      p.x = SB.clamp(p.x, 8, SB.WORLD_W - 8);
      p.y = SB.clamp(p.y, 8, SB.WORLD_H - 8);
      game.audio.play('carEnter');
      return;
    }
    var best = null, bd = 70;
    for (var i = 0; i < game.cars.length; i++) {
      var c = game.cars[i];
      if (c.dead || c.driver === 'police') continue;
      var d = SB.dist(p.x, p.y, c.x, c.y);
      if (d < bd) { bd = d; best = c; }
    }
    if (best) {
      if (best.driver === 'traffic') SB.addWanted(game, 0.5); // carjacking in the open
      best.driver = 'player';
      p.inCar = best;
      p.x = best.x; p.y = best.y;
      game.audio.play('carEnter');
    }
  }

  // ---- police ---------------------------------------------------------------
  function policeCount(game) {
    var n = 0;
    for (var i = 0; i < game.cars.length; i++) if (game.cars[i].police && game.cars[i].driver === 'police' && !game.cars[i].dead) n++;
    return n;
  }

  function spawnPolice(game) {
    var p = game.player;
    var px = p.inCar ? p.inCar.x : p.x;
    var py = p.inCar ? p.inCar.y : p.y;
    var a = game.rng() * Math.PI * 2;
    var d = 420;
    var car = SB.makeCar('police', SB.clamp(px + Math.cos(a) * d, SB.SAND_X + 60, SB.WORLD_W - 60), SB.clamp(py + Math.sin(a) * d, 60, SB.WORLD_H - 60), a, '#1a1a2e', { driver: 'police' });
    var snap = SB.snapToRoad(car.x, car.y);
    car.x = snap.x; car.y = snap.y;
    game.cars.push(car);
  }

  function updatePolice(game, dt) {
    var p = game.player;
    var wanted = Math.floor(p.wanted);
    // Spawn interceptors up to the wanted level.
    if (wanted >= 1) {
      game.copTimer -= dt;
      if (game.copTimer <= 0 && policeCount(game) < wanted + 1) {
        spawnPolice(game);
        game.copTimer = SB.TUNING.copSpawnInterval / 60;
      }
    }
    // Sirens.
    game.sirenTimer -= dt;
    if (wanted >= 1 && game.sirenTimer <= 0) {
      game.audio.play('siren');
      game.sirenTimer = 2.2;
    }
    // Helicopter at 4+ stars.
    game.heli.active = wanted >= SB.TUNING.heliMinStars;
    if (game.heli.active) {
      SB.updateHeli(game.heli, p, dt);
      game.heli.shootCd -= dt;
      if (game.heli.shootCd <= 0) {
        SB.copShoot(game, game.heli.x, game.heli.y);
        game.heli.shootCd = 1.6;
      }
    }
    // Chase + ram + busted check.
    var px = p.inCar ? p.inCar.x : p.x;
    var py = p.inCar ? p.inCar.y : p.y;
    var nearestCop = Infinity;
    for (var i = 0; i < game.cars.length; i++) {
      var car = game.cars[i];
      if (!car.police || car.driver !== 'police' || car.dead) continue;
      SB.updatePoliceCar(car, p, dt);
      var d = SB.dist(car.x, car.y, px, py);
      if (d < nearestCop) nearestCop = d;
      // Ram damage.
      if (d < 30) {
        if (p.inCar) SB.damageCar(game, p.inCar, 6 * dt * 60 * 0.1 + 0.4);
        else {
          game.bustedTimer += dt;
          if (game.bustedTimer > 1.2) {
            p.busted = true;
            game.screen = 'busted';
            game.audio.play('wasted');
          }
        }
      }
      // Despawn far-away cops when the heat is off.
      if (wanted === 0 && d > 900) {
        game.cars.splice(i, 1);
        i--;
      }
    }
    if (nearestCop > 60) game.bustedTimer = 0;
    // Wanted decay: hidden (no cop nearby, no recent crime) cools faster.
    if (wanted > 0) {
      var hidden = nearestCop > 500 && (performance.now() / 1000 - game.lastCrime) > 6;
      p.hidden = hidden;
      p.wanted = SB.clamp(p.wanted - (hidden ? SB.TUNING.wantedDecayHidden : SB.TUNING.wantedDecayVisible) * dt * 60, 0, 5);
      if (p.wanted < 0.2) p.wanted = 0;
    }
  }

  // ---- per-frame update ------------------------------------------------------
  function update(game, dt) {
    var p = game.player;
    var input = SB.input;
    game.clock += dt;
    game.hour += dt / SB.TUNING.dayLengthSec * 24;
    if (game.hour >= 24) game.hour -= 24;
    if (p.muzzle > 0) p.muzzle -= dt * 60;

    // Dialogue blocks the world until dismissed.
    if (game.missions.dialogue) {
      if (input.wasPressed('Enter') || input.wasPressed('NumpadEnter')) {
        var dlg = game.missions.dialogue;
        dlg.i++;
        if (dlg.i >= dlg.lines.length) game.missions.dialogue = null;
      }
      input.endFrame();
      return;
    }

    // Global keys.
    if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
      if (game.screen === 'play') game.screen = 'pause';
      else if (game.screen === 'pause') game.screen = 'play';
    }
    if (input.wasPressed('KeyM')) game.showMap = !game.showMap;
    if (input.wasPressed('F5')) saveGame(game);
    if (input.wasPressed('KeyR')) {
      var station = game.audio.nextStation();
      SB.setToast(game.missions, 'Radio: ' + station, 2.5);
    }
    if (game.screen !== 'play') { input.endFrame(); return; }

    if (input.wasPressed('KeyN')) {
      if (!game.missions.active) {
        if (SB.missionDef(game.missions)) SB.startMission(game.missions, game);
        else SB.setToast(game.missions, 'All missions complete — you are a Bay Legend!', 5);
      }
    }
    if (input.wasPressed('KeyE')) tryEnterExitCar(game);

    // Weapons.
    var wkeys = ['Digit1', 'Digit2', 'Digit3', 'Digit4'];
    for (var wi = 0; wi < wkeys.length; wi++) {
      if (input.wasPressed(wkeys[wi])) {
        var wid = SB.WEAPONS[wi].id;
        if (p.owned[wid]) { p.weapon = wid; }
      }
    }
    if (input.wasPressed('KeyQ')) {
      var owned = SB.WEAPONS.filter(function (w) { return p.owned[w.id]; });
      var idx = owned.findIndex(function (w) { return w.id === p.weapon; });
      p.weapon = owned[(idx + 1) % owned.length].id;
    }

    // Shooting.
    if (!p.inCar) {
      if (p.weapon === 'fists') {
        if (input.mouse.clicked) SB.playerPunch(game);
      } else if (input.mouse.down || input.mouse.clicked) {
        var wx = input.mouse.x + game.camera.x;
        var wy = input.mouse.y + game.camera.y;
        SB.playerShoot(game, wx, wy);
      }
    }

    movePlayer(game, dt);

    // Traffic + pedestrians.
    for (var i = 0; i < game.cars.length; i++) {
      var car = game.cars[i];
      if (car.dead || car.driver === 'player' || car.driver === 'police') continue;
      if (car.driver === 'traffic') SB.updateTrafficCar(car, game.rng, dt);
    }
    // Car-car bumps: slow push-apart so traffic does not stack.
    for (var a = 0; a < game.cars.length; a++) {
      for (var b = a + 1; b < game.cars.length; b++) {
        var c1 = game.cars[a], c2 = game.cars[b];
        if (c1.dead || c2.dead) continue;
        var d = SB.dist(c1.x, c1.y, c2.x, c2.y);
        if (d < 34 && d > 0.01) {
          var push = (34 - d) / 2;
          var ang = SB.angleTo(c2.x, c2.y, c1.x, c1.y);
          c1.x += Math.cos(ang) * push; c1.y += Math.sin(ang) * push;
          c2.x -= Math.cos(ang) * push; c2.y -= Math.sin(ang) * push;
          c1.speed *= 0.8; c2.speed *= 0.8;
          if (Math.abs(c1.speed) > 3 || Math.abs(c2.speed) > 3) {
            SB.damageCar(game, c1, 2);
            SB.damageCar(game, c2, 2);
          }
        }
      }
    }
    // Player car vs building: stop.
    if (p.inCar) {
      var pc = p.inCar;
      if (SB.buildingAt(game.world, pc.x, pc.y, 10)) {
        pc.x -= Math.cos(pc.angle) * Math.abs(pc.speed) * 2;
        pc.y -= Math.sin(pc.angle) * Math.abs(pc.speed) * 2;
        SB.damageCar(game, pc, 3);
        pc.speed *= -0.4;
      }
    }

    // Pedestrians: flee danger, wander otherwise.
    var danger = null;
    if (game.combat.bullets.length > 0) danger = { x: p.x, y: p.y };
    for (var pi = 0; pi < game.peds.length; pi++) {
      var ped = game.peds[pi];
      if (ped.state === 'dead') continue;
      if (ped.enemy) {
        // Enemy AI: close in and shoot.
        var pdx = p.inCar ? p.inCar.x : p.x;
        var pdy = p.inCar ? p.inCar.y : p.y;
        var pd = SB.dist(ped.x, ped.y, pdx, pdy);
        ped.angle = SB.angleTo(ped.x, ped.y, pdx, pdy);
        if (pd > 260) {
          ped.x += Math.cos(ped.angle) * 1.9 * dt * 60 * 0.55;
          ped.y += Math.sin(ped.angle) * 1.9 * dt * 60 * 0.55;
        } else {
          ped.shootCd -= dt;
          if (ped.shootCd <= 0) {
            SB.enemyShoot(game, ped);
            ped.shootCd = ped.boss ? 0.9 : 1.5;
          }
        }
      } else {
        SB.updatePed(ped, game.rng, dt, danger);
      }
    }

    SB.updateBullets(game, dt);

    // Explosions age out.
    for (var ei = game.combat.explosions.length - 1; ei >= 0; ei--) {
      game.combat.explosions[ei].life -= dt;
      if (game.combat.explosions[ei].life <= 0) game.combat.explosions.splice(ei, 1);
    }

    // Hidden packages.
    for (var gi = 0; gi < SB.PACKAGES.length; gi++) {
      if (game.collectedPackages[gi]) continue;
      var pkg = SB.PACKAGES[gi];
      if (SB.dist(p.x, p.y, pkg.x, pkg.y) < 26) {
        game.collectedPackages[gi] = true;
        p.packages++;
        p.cash += 100;
        p.respect += 20;
        SB.setToast(game.missions, 'Hidden package found! +$100  (' + p.packages + '/8)', 4);
        game.audio.play('pickup');
      }
    }

    // Weapon shops: buy with E nearby (cheap ammo top-up), food heals.
    if (input.wasPressed('KeyE')) {
      // (E already handled car entry above; shops only when on foot and no car near.)
    }
    for (var si = 0; si < SB.WEAPON_SHOPS.length; si++) {
      var shop = SB.WEAPON_SHOPS[si];
      if (!p.inCar && SB.dist(p.x, p.y, shop.x, shop.y) < 46) {
        if (!p.owned.smg && p.cash >= 400) { p.owned.smg = true; p.cash -= 400; SB.setToast(game.missions, 'Bought K-9 SMG — $400 (press 3)', 3); }
        else if (!p.owned.shotgun && p.cash >= 600) { p.owned.shotgun = true; p.cash -= 600; SB.setToast(game.missions, 'Bought Street Sweeper — $600 (press 4)', 3); }
        else if (p.ammo[p.weapon] !== Infinity && p.cash >= 50) { p.cash -= 50; p.ammo[p.weapon] += 60; SB.setToast(game.missions, 'Ammo restocked — $50', 2); }
      }
    }
    for (var fi = 0; fi < SB.FOOD_STANDS.length; fi++) {
      var food = SB.FOOD_STANDS[fi];
      if (!p.inCar && SB.dist(p.x, p.y, food.x, food.y) < 40 && p.health < 100 && p.cash >= 10) {
        p.cash -= 10;
        p.health = Math.min(100, p.health + 25);
        SB.setToast(game.missions, 'Taco Sol: +25 HP — $10', 2);
        game.audio.play('pickup');
      }
    }
    // Garage: park a car to store it (simple: repairs current car free).
    if (p.inCar && SB.dist(p.inCar.x, p.inCar.y, SB.GARAGE.x, SB.GARAGE.y) < 70) {
      if (p.inCar.health < 100) { p.inCar.health = 100; SB.setToast(game.missions, 'Garage: car repaired', 2); }
    }

    SB.updateMission(game.missions, game, dt);
    updatePolice(game, dt);

    // Death / busted.
    if (p.dead && game.screen === 'play') game.screen = 'wasted';

    // Camera follows the player.
    var vw = game.viewW, vh = game.viewH;
    var cx = (p.inCar ? p.inCar.x : p.x) - vw / 2;
    var cy = (p.inCar ? p.inCar.y : p.y) - vh / 2;
    game.camera.x = SB.clamp(cx, -40, SB.WORLD_W - vw + 40);
    game.camera.y = SB.clamp(cy, -40, SB.WORLD_H - vh + 40);

    input.endFrame();
  }

  // ---- boot ------------------------------------------------------------------
  function boot() {
    var canvas = document.getElementById('game');
    var ctx = canvas.getContext('2d');
    SB.input.attach(canvas);

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    var params = new URLSearchParams(window.location.search);
    var shot = params.get('shot');
    var seed = parseInt(params.get('seed') || '20261123', 10) || 20261123;

    var game = newGame(seed);
    game.viewW = canvas.width;
    game.viewH = canvas.height;
    readSaveInfo(game);

    if (shot && SB.STAGE_FNS[shot]) {
      // Deterministic screenshot mode: stage one frozen scene and render it.
      game.shotMode = shot;
      game.frozen = true;
      SB.STAGE_FNS[shot](game);
      game.viewW = canvas.width;
      game.viewH = canvas.height;
    }

    // Unlock audio on first interaction.
    window.addEventListener('pointerdown', function () { game.audio.unlock(); game.audio.startRadio(); }, { once: true });
    window.addEventListener('keydown', function () { game.audio.unlock(); }, { once: true });

    var last = performance.now();
    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      game.viewW = canvas.width;
      game.viewH = canvas.height;

      if (!game.frozen) {
        if (game.screen === 'title') {
          game.clock += dt;
          if (SB.input.wasPressed('Enter') || SB.input.wasPressed('NumpadEnter')) {
            game.screen = 'play';
            SB.setToast(game.missions, 'Press N to start your first mission for Vera Solano', 6);
            game.audio.startRadio();
          } else if (SB.input.wasPressed('KeyC') && game.hasSave) {
            loadSave(game);
          }
          SB.input.endFrame();
        } else if (game.screen === 'wasted' || game.screen === 'busted') {
          if (SB.input.wasPressed('Enter') || SB.input.wasPressed('NumpadEnter')) {
            // Restart from save, or fresh if none.
            var ng = newGame(game.seed);
            ng.viewW = game.viewW; ng.viewH = game.viewH;
            ng.audio = game.audio;
            readSaveInfo(ng);
            loadSave(ng);
            ng.screen = 'play';
            game = ng;
          }
          SB.input.endFrame();
        } else {
          update(game, dt);
        }
      }

      // Render.
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (game.screen === 'title') {
        SB.renderTitle(game, ctx, canvas.width, canvas.height);
      } else {
        SB.render(game, ctx, canvas.width, canvas.height);
        if (game.screen === 'play' || game.screen === 'pause') SB.renderHUD(game, ctx, canvas.width, canvas.height);
        if (game.showMap && game.screen === 'play') SB.renderFullMap(game, ctx, canvas.width, canvas.height);
        if (game.screen === 'pause') SB.renderPause(game, ctx, canvas.width, canvas.height);
        if (game.screen === 'wasted') SB.renderEnd(game, ctx, canvas.width, canvas.height, 'wasted');
        if (game.screen === 'busted') SB.renderEnd(game, ctx, canvas.width, canvas.height, 'busted');
        SB.renderDialogue(game, ctx, canvas.width, canvas.height);
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
