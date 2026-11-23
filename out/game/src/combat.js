// combat.js — weapons, shooting, bullets, damage, explosions, and the
// wanted level's reactions to crimes in Solara Bay.
(function () {
  'use strict';
  var SB = window.SB = window.SB || {};

  SB.newCombatState = function () {
    return { bullets: [], particles: [], flashes: [], explosions: [] };
  };

  // Fire the player's current weapon toward (tx,ty). Returns true if a shot
  // was fired (ammo and cooldown permitting).
  SB.playerShoot = function (game, tx, ty) {
    var p = game.player;
    var w = SB.WEAPON_BY_ID[p.weapon];
    var now = performance.now();
    if (now - p.lastShot < w.rate) return false;
    if (p.ammo[p.weapon] <= 0) {
      if (game.audio) game.audio.play('empty');
      p.lastShot = now;
      return false;
    }
    p.lastShot = now;
    p.muzzle = 4;
    if (p.ammo[p.weapon] !== Infinity) p.ammo[p.weapon]--;
    var ox = p.inCar ? p.inCar.x : p.x;
    var oy = p.inCar ? p.inCar.y : p.y;
    var base = SB.angleTo(ox, oy, tx, ty);
    for (var i = 0; i < w.pellets; i++) {
      var a = base + (game.rng() - 0.5) * 2 * w.spread;
      game.combat.bullets.push({
        x: ox, y: oy, angle: a, speed: 13, damage: w.damage,
        range: w.range, fromPlayer: true, life: 0,
      });
    }
    if (game.audio) game.audio.play(w.id === 'shotgun' ? 'shotgun' : w.id === 'smg' ? 'smg' : w.id === 'fists' ? 'punch' : 'shot');
    // Firing in public draws attention.
    SB.addWanted(game, p.inCar ? 0.1 : 0.25);
    // Nearby pedestrians flee.
    SB.scarePeds(game, ox, oy, 320);
    return true;
  };

  // Enemy ped shoots at the player.
  SB.enemyShoot = function (game, ped) {
    var p = game.player;
    var px = p.inCar ? p.inCar.x : p.x;
    var py = p.inCar ? p.inCar.y : p.y;
    var a = SB.angleTo(ped.x, ped.y, px, py) + (game.rng() - 0.5) * 0.22;
    game.combat.bullets.push({
      x: ped.x, y: ped.y, angle: a, speed: 11, damage: ped.boss ? 14 : 8,
      range: 460, fromPlayer: false, life: 0,
    });
    ped.muzzle = 3;
    if (game.audio) game.audio.play('eshot');
  };

  // A cop on foot (or the heli) shoots at the player.
  SB.copShoot = function (game, x, y) {
    var p = game.player;
    var px = p.inCar ? p.inCar.x : p.x;
    var py = p.inCar ? p.inCar.y : p.y;
    var a = SB.angleTo(x, y, px, py) + (game.rng() - 0.5) * 0.3;
    game.combat.bullets.push({
      x: x, y: y, angle: a, speed: 11, damage: 7,
      range: 420, fromPlayer: false, life: 0,
    });
  };

  // Move bullets, resolve hits against peds, cars, buildings and the player.
  SB.updateBullets = function (game, dt) {
    var c = game.combat;
    var p = game.player;
    var step = dt * 60;
    for (var i = c.bullets.length - 1; i >= 0; i--) {
      var b = c.bullets[i];
      b.x += Math.cos(b.angle) * b.speed * step * 0.55;
      b.y += Math.sin(b.angle) * b.speed * step * 0.55;
      b.life += b.speed * step * 0.55;
      var hit = false;
      if (b.life > b.range || b.x < 0 || b.y < 0 || b.x > SB.WORLD_W || b.y > SB.WORLD_H) hit = true;
      else if (SB.buildingAt(game.world, b.x, b.y, 0)) hit = true;
      if (!hit && b.fromPlayer) {
        // Hit enemy or civilian peds.
        for (var j = 0; j < game.peds.length; j++) {
          var ped = game.peds[j];
          if (ped.state === 'dead') continue;
          if (SB.dist(b.x, b.y, ped.x, ped.y) < 14) {
            SB.damagePed(game, ped, b.damage);
            hit = true;
            break;
          }
        }
        // Hit cars (not the player's own).
        if (!hit) {
          for (var k = 0; k < game.cars.length; k++) {
            var car = game.cars[k];
            if (car === p.inCar || car.dead) continue;
            if (SB.dist(b.x, b.y, car.x, car.y) < 26) {
              SB.damageCar(game, car, b.damage);
              hit = true;
              break;
            }
          }
        }
      }
      if (!hit && !b.fromPlayer) {
        var px = p.inCar ? p.inCar.x : p.x;
        var py = p.inCar ? p.inCar.y : p.y;
        var pr = p.inCar ? 26 : 13;
        if (SB.dist(b.x, b.y, px, py) < pr) {
          if (p.inCar) SB.damageCar(game, p.inCar, b.damage * 0.7);
          else SB.damagePlayer(game, b.damage);
          hit = true;
        }
      }
      if (hit) {
        c.particles.push({ x: b.x, y: b.y, vx: (game.rng() - 0.5) * 3, vy: (game.rng() - 0.5) * 3, life: 0.3, max: 0.3, color: '#f5c542', size: 3 });
        c.bullets.splice(i, 1);
      }
    }
    // Particles.
    for (var pi = c.particles.length - 1; pi >= 0; pi--) {
      var pt = c.particles[pi];
      pt.x += pt.vx; pt.y += pt.vy; pt.life -= dt;
      if (pt.life <= 0) c.particles.splice(pi, 1);
    }
  };

  SB.damagePed = function (game, ped, dmg) {
    ped.health -= dmg;
    if (ped.health <= 0) {
      ped.state = 'dead';
      game.player.kills++;
      if (ped.enemy) {
        SB.registerKill(game.missions, ped);
        game.player.cash += 25;
      } else {
        // Killing a civilian is a crime.
        SB.addWanted(game, 1);
        SB.scarePeds(game, ped.x, ped.y, 400);
      }
      if (game.audio) game.audio.play('thud');
    } else if (!ped.enemy) {
      ped.state = 'flee';
      SB.scarePeds(game, ped.x, ped.y, 300);
    }
  };

  SB.damagePlayer = function (game, dmg) {
    var p = game.player;
    if (p.dead) return;
    var absorbed = Math.min(p.armor, dmg);
    p.armor -= absorbed;
    p.health -= (dmg - absorbed);
    if (game.audio) game.audio.play('hurt');
    if (p.health <= 0) {
      p.health = 0;
      p.dead = true;
      if (game.audio) game.audio.play('wasted');
    }
  };

  SB.damageCar = function (game, car, dmg) {
    car.health -= dmg;
    if (car.health <= 0 && !car.dead) {
      car.dead = true;
      SB.explode(game, car.x, car.y, 90);
      // A wrecked car under the player hurts them.
      if (game.player.inCar === car) {
        game.player.inCar = null;
        SB.damagePlayer(game, 35);
      }
    }
  };

  // Explosion: particles, damage in radius, sound.
  SB.explode = function (game, x, y, radius) {
    var c = game.combat;
    c.explosions.push({ x: x, y: y, r: 8, max: radius, life: 0.5, maxLife: 0.5 });
    for (var i = 0; i < 26; i++) {
      var a = game.rng() * Math.PI * 2;
      var sp = SB.rand(game.rng, 1, 6);
      c.particles.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: SB.rand(game.rng, 0.3, 0.8), max: 0.8,
        color: SB.pick(game.rng, ['#f39c12', '#e74c3c', '#f5c542', '#7f8c8d']), size: SB.rand(game.rng, 3, 7),
      });
    }
    var p = game.player;
    var px = p.inCar ? p.inCar.x : p.x;
    var py = p.inCar ? p.inCar.y : p.y;
    if (SB.dist(x, y, px, py) < radius && !p.inCar) SB.damagePlayer(game, 30);
    for (var j = 0; j < game.peds.length; j++) {
      var ped = game.peds[j];
      if (ped.state !== 'dead' && SB.dist(x, y, ped.x, ped.y) < radius) SB.damagePed(game, ped, 80);
    }
    for (var k = 0; k < game.cars.length; k++) {
      var car = game.cars[k];
      if (!car.dead && SB.dist(x, y, car.x, car.y) < radius + 20) SB.damageCar(game, car, 60);
    }
    if (game.audio) game.audio.play('explosion');
    SB.addWanted(game, 0.5);
  };

  // Raise the wanted level (0..5), clamped.
  SB.addWanted = function (game, amount) {
    var p = game.player;
    p.wanted = SB.clamp(p.wanted + amount, 0, SB.TUNING.maxWanted);
    if (p.wanted >= 1) p.hidden = false;
  };

  // Make nearby pedestrians flee from a point.
  SB.scarePeds = function (game, x, y, radius) {
    for (var i = 0; i < game.peds.length; i++) {
      var ped = game.peds[i];
      if (ped.state === 'dead' || ped.enemy) continue;
      if (SB.dist(x, y, ped.x, ped.y) < radius) ped.state = 'flee';
    }
  };

  // Melee punch: short range, hits the nearest ped or car in front.
  SB.playerPunch = function (game) {
    var p = game.player;
    var now = performance.now();
    var w = SB.WEAPON_BY_ID.fists;
    if (now - p.lastShot < w.rate) return;
    p.lastShot = now;
    if (game.audio) game.audio.play('punch');
    var ox = p.x + Math.cos(p.angle) * 22;
    var oy = p.y + Math.sin(p.angle) * 22;
    for (var i = 0; i < game.peds.length; i++) {
      var ped = game.peds[i];
      if (ped.state !== 'dead' && SB.dist(ox, oy, ped.x, ped.y) < 22) {
        SB.damagePed(game, ped, w.damage);
        return;
      }
    }
    for (var j = 0; j < game.cars.length; j++) {
      var car = game.cars[j];
      if (!car.dead && SB.dist(ox, oy, car.x, car.y) < 30) {
        SB.damageCar(game, car, w.damage * 0.5);
        return;
      }
    }
  };
})();
