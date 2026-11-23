// entities.js — Solara Bay entities: player, cars, pedestrians, police,
// helicopter. Creation helpers and movement/steering; the main loop in
// main.js calls the update helpers here.
(function () {
  'use strict';
  var SB = window.SB = window.SB || {};

  SB.makePlayer = function (x, y) {
    return {
      kind: 'player', x: x, y: y, angle: 0, speed: 0,
      health: 100, armor: 0, cash: 250, wanted: 0,
      weapon: 'pistol', ammo: { fists: Infinity, pistol: 120, smg: 240, shotgun: 40 },
      owned: { fists: true, pistol: true, smg: false, shotgun: false },
      inCar: null, dead: false, busted: false, hidden: false,
      respect: 0, packages: 0, kills: 0, lastShot: 0, muzzle: 0,
    };
  };

  SB.makeCar = function (modelId, x, y, angle, color, opts) {
    var model = SB.CAR_BY_ID[modelId];
    var c = {
      kind: 'car', model: modelId, x: x, y: y, angle: angle || 0,
      speed: 0, steer: 0, color: color || model.colors[0],
      health: 100, driver: null, // 'player' | 'traffic' | 'police' | 'mission' | null (parked)
      target: null, // traffic: {x,y,vertical,dir}
      smoke: 0, dead: false, police: modelId === 'police',
    };
    if (opts) for (var k in opts) c[k] = opts[k];
    return c;
  };

  SB.makePed = function (x, y, opts) {
    var p = {
      kind: 'ped', x: x, y: y, angle: 0, speed: 0,
      health: 50, state: 'walk', // walk | flee | fight | dead
      target: null, tx: x, ty: y, wait: 0,
      color: '#888888', shirt: '#888888', armed: false, enemy: false,
      boss: false, name: '', shootCd: 0, inCar: null,
    };
    if (opts) for (var k in opts) p[k] = opts[k];
    return p;
  };

  SB.makeHeli = function (x, y) {
    return { kind: 'heli', x: x, y: y, angle: 0, height: 120, shootCd: 0, active: false };
  };

  // ---- car physics --------------------------------------------------------
  // Drive a car one step: throttle -1..1, steer -1..1. Returns nothing.
  SB.driveCar = function (car, throttle, steer, dt) {
    var model = SB.CAR_BY_ID[car.model];
    var maxSpeed = model.top * (car.health < 40 ? 0.6 : 1);
    car.speed += throttle * model.accel * dt * 60 * 0.16;
    if (throttle === 0) car.speed *= Math.pow(0.985, dt * 60);
    if (car.speed > maxSpeed) car.speed = maxSpeed;
    if (car.speed < -maxSpeed * 0.45) car.speed = -maxSpeed * 0.45;
    var turn = steer * 0.045 * (car.speed / model.top) * dt * 60;
    car.angle += turn;
    car.x += Math.cos(car.angle) * car.speed * dt * 60 * 0.55;
    car.y += Math.sin(car.angle) * car.speed * dt * 60 * 0.55;
    // Stay in the world (bounce off the edges, ocean stops cars).
    if (car.x < SB.SAND_X + 20) { car.x = SB.SAND_X + 20; car.speed *= -0.3; }
    if (car.x > SB.WORLD_W - 20) { car.x = SB.WORLD_W - 20; car.speed *= -0.3; }
    if (car.y < 20) { car.y = 20; car.speed *= -0.3; }
    if (car.y > SB.WORLD_H - 20) { car.y = SB.WORLD_H - 20; car.speed *= -0.3; }
    if (car.health < 45) car.smoke = 1;
  };

  // Steer a car toward a target point (used by traffic and police AI).
  // Returns {throttle, steer}.
  SB.steerToward = function (car, tx, ty) {
    var want = SB.angleTo(car.x, car.y, tx, ty);
    var diff = SB.angleDiff(car.angle, want);
    var steer = SB.clamp(diff * 2.2, -1, 1);
    var throttle = Math.abs(diff) > 1.6 ? -0.5 : 1;
    if (SB.dist(car.x, car.y, tx, ty) < 40) throttle = 0.4;
    return { throttle: throttle, steer: steer };
  };

  // ---- traffic ------------------------------------------------------------
  // Give a traffic car its next waypoint: along its current road, turning at
  // intersections sometimes.
  SB.nextTrafficTarget = function (car, rng) {
    var snap = SB.snapToRoad(car.x, car.y);
    var dir = rng() < 0.5 ? 1 : -1;
    if (snap.vertical) {
      var ny = car.y + dir * SB.rand(rng, 200, 500);
      // Sometimes turn onto a horizontal road at the nearest intersection.
      if (rng() < 0.3) {
        var ry = SB.nearestRoadY(car.y);
        return { x: car.x + (rng() < 0.5 ? 1 : -1) * SB.rand(rng, 150, 400), y: ry, vertical: false };
      }
      return { x: snap.x, y: SB.clamp(ny, 60, SB.WORLD_H - 60), vertical: true };
    }
    if (rng() < 0.3) {
      var rx = SB.nearestRoadX(car.x);
      return { x: rx, y: car.y + (rng() < 0.5 ? 1 : -1) * SB.rand(rng, 150, 400), vertical: true };
    }
    var nx = car.x + dir * SB.rand(rng, 200, 500);
    return { x: SB.clamp(nx, SB.SAND_X + 60, SB.WORLD_W - 60), y: snap.y, vertical: false };
  };

  // Move a traffic car toward its target; pick a new target when close.
  SB.updateTrafficCar = function (car, rng, dt) {
    if (!car.target || SB.dist(car.x, car.y, car.target.x, car.target.y) < 50) {
      car.target = SB.nextTrafficTarget(car, rng);
    }
    var ctl = SB.steerToward(car, car.target.x, car.target.y);
    SB.driveCar(car, ctl.throttle, ctl.steer, dt);
  };

  // ---- pedestrians --------------------------------------------------------
  // Pick a nearby sidewalk stroll target for a pedestrian.
  SB.nextPedTarget = function (ped, rng) {
    var a = rng() * Math.PI * 2;
    var d = SB.rand(rng, 80, 260);
    return {
      x: SB.clamp(ped.x + Math.cos(a) * d, SB.SAND_X + 10, SB.WORLD_W - 10),
      y: SB.clamp(ped.y + Math.sin(a) * d, 10, SB.WORLD_H - 10),
    };
  };

  // Walk a pedestrian toward its target; idle a moment when it arrives.
  SB.updatePed = function (ped, rng, dt, danger) {
    if (ped.state === 'dead') return;
    if (ped.state === 'flee' && danger) {
      var away = SB.angleTo(danger.x, danger.y, ped.x, ped.y);
      ped.angle = away;
      ped.x += Math.cos(away) * 2.6 * dt * 60 * 0.55;
      ped.y += Math.sin(away) * 2.6 * dt * 60 * 0.55;
      ped.x = SB.clamp(ped.x, SB.SAND_X + 6, SB.WORLD_W - 6);
      ped.y = SB.clamp(ped.y, 6, SB.WORLD_H - 6);
      return;
    }
    if (ped.wait > 0) { ped.wait -= dt; return; }
    var d = SB.dist(ped.x, ped.y, ped.tx, ped.ty);
    if (d < 12) {
      ped.wait = SB.rand(rng, 1, 4);
      var t = SB.nextPedTarget(ped, rng);
      ped.tx = t.x; ped.ty = t.y;
      return;
    }
    var a = SB.angleTo(ped.x, ped.y, ped.tx, ped.ty);
    ped.angle = a;
    var sp = ped.state === 'fight' ? 1.9 : 1.1;
    ped.x += Math.cos(a) * sp * dt * 60 * 0.55;
    ped.y += Math.sin(a) * sp * dt * 60 * 0.55;
  };

  // ---- police -------------------------------------------------------------
  // Chase steering for an interceptor: aim at the player, ram when close.
  SB.updatePoliceCar = function (car, player, dt) {
    var px = player.inCar ? player.inCar.x : player.x;
    var py = player.inCar ? player.inCar.y : player.y;
    var ctl = SB.steerToward(car, px, py);
    SB.driveCar(car, ctl.throttle, ctl.steer, dt);
  };

  // Helicopter hovers above the player and drifts to stay over them.
  SB.updateHeli = function (heli, player, dt) {
    var px = player.inCar ? player.inCar.x : player.x;
    var py = player.inCar ? player.inCar.y : player.y;
    var a = SB.angleTo(heli.x, heli.y, px, py);
    var d = SB.dist(heli.x, heli.y, px, py);
    var sp = SB.clamp(d * 0.02, 0, 3.2);
    heli.x += Math.cos(a) * sp * dt * 60 * 0.55;
    heli.y += Math.sin(a) * sp * dt * 60 * 0.55;
    heli.angle += dt * 1.5;
  };

  // Rank name for a respect total.
  SB.rankName = function (respect) {
    var name = SB.RANKS[0].name;
    for (var i = 0; i < SB.RANKS.length; i++) {
      if (respect >= SB.RANKS[i].min) name = SB.RANKS[i].name;
    }
    return name;
  };
})();
