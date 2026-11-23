// render.js — canvas renderer for Solara Bay: city, roads, buildings,
// beach, cars, pedestrians, player, effects, HUD, minimap, title/pause/
// wasted/busted screens and dialogue boxes.
(function () {
  'use strict';
  var SB = window.SB = window.SB || {};

  // Draw the world inside the camera view. `game` carries world, entities,
  // camera, clock and mission state.
  SB.render = function (game, ctx, W, H) {
    var cam = game.camera;
    var clock = game.clock;
    // Sky-tinted ground base.
    ctx.fillStyle = SB.COLORS.grass;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(-cam.x, -cam.y);

    var view = { x0: cam.x - 40, y0: cam.y - 40, x1: cam.x + W + 40, y1: cam.y + H + 40 };

    // Ocean + beach on the west edge.
    ctx.fillStyle = SB.COLORS.oceanDeep;
    ctx.fillRect(view.x0, view.y0, Math.max(0, SB.OCEAN_X - view.x0), view.y1 - view.y0);
    ctx.fillStyle = SB.COLORS.ocean;
    ctx.fillRect(Math.max(view.x0, 0), view.y0, Math.max(0, SB.OCEAN_X - Math.max(view.x0, 0)), view.y1 - view.y0);
    // Animated wave lines.
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    for (var wy = Math.floor(view.y0 / 90) * 90; wy < view.y1; wy += 90) {
      ctx.beginPath();
      ctx.moveTo(10, wy + Math.sin(clock * 1.4 + wy) * 4);
      ctx.quadraticCurveTo(35, wy + 8, 62, wy + Math.sin(clock * 1.4 + wy + 2) * 4);
      ctx.stroke();
    }
    ctx.fillStyle = SB.COLORS.sand;
    ctx.fillRect(SB.OCEAN_X, view.y0, SB.SAND_X - SB.OCEAN_X, view.y1 - view.y0);

    // District ground tints.
    for (var di = 0; di < SB.DISTRICTS.length; di++) {
      var d = SB.DISTRICTS[di];
      if (d.x > view.x1 || d.x + d.w < view.x0 || d.y > view.y1 || d.y + d.h < view.y0) continue;
      ctx.fillStyle = d.color;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(d.x, d.y, d.w, d.h);
      ctx.globalAlpha = 1;
    }

    // Parks.
    for (var pi = 0; pi < SB.PARKS.length; pi++) {
      var pk = SB.PARKS[pi];
      ctx.fillStyle = SB.COLORS.park;
      ctx.fillRect(pk.x, pk.y, pk.w, pk.h);
    }

    // Roads.
    ctx.fillStyle = SB.COLORS.road;
    SB.ROADS_X.forEach(function (rx) { ctx.fillRect(rx - SB.ROAD_W / 2, 0, SB.ROAD_W, SB.WORLD_H); });
    SB.ROADS_Y.forEach(function (ry) { ctx.fillRect(0, ry - SB.ROAD_W / 2, SB.WORLD_W, SB.ROAD_W); });
    // Centre dashes.
    ctx.strokeStyle = SB.COLORS.roadLine;
    ctx.lineWidth = 3;
    ctx.setLineDash([22, 26]);
    SB.ROADS_X.forEach(function (rx) {
      ctx.beginPath(); ctx.moveTo(rx, 0); ctx.lineTo(rx, SB.WORLD_H); ctx.stroke();
    });
    SB.ROADS_Y.forEach(function (ry) {
      ctx.beginPath(); ctx.moveTo(0, ry); ctx.lineTo(SB.WORLD_W, ry); ctx.stroke();
    });
    ctx.setLineDash([]);

    // District labels.
    ctx.fillStyle = 'rgba(20,26,40,0.55)';
    ctx.font = 'bold 26px Arial, sans-serif';
    ctx.textAlign = 'center';
    SB.DISTRICTS.forEach(function (dd) {
      if (dd.labelX < view.x0 || dd.labelX > view.x1 || dd.labelY < view.y0 || dd.labelY > view.y1) return;
      ctx.fillText(dd.name.toUpperCase(), dd.labelX, dd.labelY);
    });

    // Trees.
    var trees = game.world.trees;
    for (var ti = 0; ti < trees.length; ti++) {
      var t = trees[ti];
      if (t.x < view.x0 || t.x > view.x1 || t.y < view.y0 || t.y > view.y1) continue;
      ctx.fillStyle = t.palm ? '#2e7d32' : '#3e7d3a';
      ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6d4c41';
      ctx.beginPath(); ctx.arc(t.x, t.y, 3, 0, Math.PI * 2); ctx.fill();
    }

    // Buildings (with a simple drop shadow for a 2.5D feel).
    var bl = game.world.buildings;
    for (var bi = 0; bi < bl.length; bi++) {
      var b = bl[bi];
      if (b.x + b.w < view.x0 || b.x > view.x1 || b.y + b.h < view.y0 || b.y > view.y1) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
      ctx.fillStyle = b.hue;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x + 5, b.y + 5, b.w - 10, b.h - 10);
      // Roof details: a few lit windows / vents.
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      for (var wnd = 0; wnd < 3; wnd++) {
        ctx.fillRect(b.x + 10 + wnd * ((b.w - 20) / 3), b.y + 10, 8, 6);
      }
      if (b.height >= 3) {
        ctx.fillStyle = 'rgba(20,26,40,0.8)';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('▲'.repeat(Math.min(b.height, 6)), b.x + 8, b.y + b.h - 8);
      }
    }

    // Hidden packages (sparkling).
    for (var gi = 0; gi < SB.PACKAGES.length; gi++) {
      var pkg = SB.PACKAGES[gi];
      if (game.collectedPackages[gi]) continue;
      if (pkg.x < view.x0 || pkg.x > view.x1 || pkg.y < view.y0 || pkg.y > view.y1) continue;
      var pulse = 0.6 + 0.4 * Math.sin(clock * 4 + gi);
      ctx.fillStyle = 'rgba(241,196,15,' + pulse + ')';
      ctx.beginPath(); ctx.arc(pkg.x, pkg.y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7d6608';
      ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
      ctx.fillText('$', pkg.x, pkg.y + 4);
    }

    // Mission markers: objective ring + flag.
    var stage = SB.currentStage(game.missions);
    if (stage && stage.x !== undefined && stage.y !== undefined) {
      var bob = Math.sin(clock * 3) * 4;
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(stage.x, stage.y, 26 + bob * 0.4, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.moveTo(stage.x, stage.y - 34 + bob);
      ctx.lineTo(stage.x + 12, stage.y - 26 + bob);
      ctx.lineTo(stage.x, stage.y - 18 + bob);
      ctx.closePath(); ctx.fill();
      ctx.fillRect(stage.x - 1, stage.y - 34 + bob, 2, 26);
    }
    // Race checkpoints.
    if (stage && stage.type === 'race') {
      stage.checkpoints.forEach(function (cp, ci) {
        var done = ci < game.missions.active.raceCp;
        ctx.strokeStyle = done ? '#2ecc71' : '#e67e22';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(cp.x, cp.y, 34, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = done ? '#2ecc71' : '#e67e22';
        ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center';
        ctx.fillText(String(ci + 1), cp.x, cp.y + 6);
      });
    }

    // Cars.
    game.cars.forEach(function (car) { SB.drawCar(ctx, car, clock); });
    // Pedestrians.
    game.peds.forEach(function (ped) { SB.drawPed(ctx, ped); });
    // Player (on foot only; in a car the car is drawn with the player inside).
    if (!game.player.inCar) SB.drawPlayer(ctx, game.player);
    // Helicopter shadow + body.
    var heli = game.heli;
    if (heli.active) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(heli.x + 30, heli.y + 40, 26, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.translate(heli.x, heli.y);
      ctx.rotate(heli.angle);
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(34, 0); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath(); ctx.ellipse(heli.x, heli.y, 20, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath(); ctx.arc(heli.x + 12, heli.y, 4, 0, Math.PI * 2); ctx.fill();
      // Searchlight cone.
      var ppx = game.player.inCar ? game.player.inCar.x : game.player.x;
      var ppy = game.player.inCar ? game.player.inCar.y : game.player.y;
      ctx.strokeStyle = 'rgba(255,255,180,0.35)';
      ctx.lineWidth = 26;
      ctx.beginPath(); ctx.moveTo(heli.x, heli.y); ctx.lineTo(ppx, ppy); ctx.stroke();
    }

    // Bullets and particles.
    game.combat.bullets.forEach(function (b) {
      ctx.strokeStyle = '#ffe27a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(b.x - Math.cos(b.angle) * 12, b.y - Math.sin(b.angle) * 12);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });
    game.combat.particles.forEach(function (pt) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.max);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    });
    ctx.globalAlpha = 1;
    game.combat.explosions.forEach(function (ex) {
      var k = 1 - ex.life / ex.maxLife;
      ctx.globalAlpha = Math.max(0, ex.life / ex.maxLife);
      ctx.fillStyle = '#e67e22';
      ctx.beginPath(); ctx.arc(ex.x, ex.y, ex.r + k * ex.max, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath(); ctx.arc(ex.x, ex.y, (ex.r + k * ex.max) * 0.6, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Muzzle flash.
    if (game.player.muzzle > 0) {
      var mx = game.player.inCar ? game.player.inCar.x : game.player.x;
      var my = game.player.inCar ? game.player.inCar.y : game.player.y;
      ctx.fillStyle = 'rgba(255,220,100,0.9)';
      ctx.beginPath();
      ctx.arc(mx + Math.cos(game.player.angle) * 24, my + Math.sin(game.player.angle) * 24, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Golden-hour tint by time of day.
    var tint = SB.dayTint(game.hour);
    if (tint) {
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, W, H);
    }

    // Vignette.
    var vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  };

  // Day-cycle tint: golden hour in the evening, darker at night.
  SB.dayTint = function (hour) {
    if (hour >= 17 && hour < 19) return 'rgba(255,140,40,0.10)';
    if (hour >= 19 && hour < 20.5) return 'rgba(255,90,40,0.16)';
    if (hour >= 20.5 || hour < 5.5) return 'rgba(10,10,50,0.22)';
    if (hour >= 5.5 && hour < 7) return 'rgba(255,170,90,0.10)';
    return null;
  };

  SB.drawCar = function (ctx, car, clock) {
    if (car.dead) {
      // Burnt wreck.
      ctx.save();
      ctx.translate(car.x, car.y);
      ctx.rotate(car.angle);
      ctx.fillStyle = '#222';
      ctx.fillRect(-24, -11, 48, 22);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(-24, -11, 48, 22);
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-22, -9, 46, 22);
    var model = SB.CAR_BY_ID[car.model];
    var w = model.w, h = model.h;
    // Body.
    ctx.fillStyle = car.color;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 6);
    ctx.fill();
    // Cabin + windshield.
    ctx.fillStyle = 'rgba(30,40,60,0.9)';
    ctx.beginPath();
    ctx.roundRect(-w * 0.18, -h / 2 + 3, w * 0.34, h - 6, 3);
    ctx.fill();
    ctx.fillStyle = 'rgba(180,220,255,0.7)';
    ctx.fillRect(w * 0.16, -h / 2 + 4, 5, h - 8);
    // Headlights.
    ctx.fillStyle = '#fff8c0';
    ctx.fillRect(w / 2 - 2, -h / 2 + 2, 3, 4);
    ctx.fillRect(w / 2 - 2, h / 2 - 6, 3, 4);
    // Police livery.
    if (car.police) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(-w * 0.3, -h / 2, w * 0.24, h);
      ctx.fillStyle = '#2980b9';
      ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center';
      ctx.fillText('SBPD', 0, 3);
      // Light bar flashing.
      var flash = Math.floor(clock * 6) % 2 === 0;
      ctx.fillStyle = flash ? '#ff2d2d' : '#2d6bff';
      ctx.fillRect(-6, -h / 2 - 2, 5, 4);
      ctx.fillStyle = flash ? '#2d6bff' : '#ff2d2d';
      ctx.fillRect(1, -h / 2 - 2, 5, 4);
    }
    // Damage smoke.
    if (car.health < 45) {
      ctx.fillStyle = 'rgba(120,120,120,0.5)';
      ctx.beginPath();
      ctx.arc(-w / 2 + 4, 0, 6 + Math.sin(clock * 9) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Mission target car marker.
    if (car.missionCar) {
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(car.x, car.y, 34, 0, Math.PI * 2); ctx.stroke();
    }
  };

  SB.drawPed = function (ctx, ped) {
    if (ped.state === 'dead') {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(ped.x, ped.y, 12, 6, ped.angle, 0, Math.PI * 2); ctx.fill();
      return;
    }
    ctx.save();
    ctx.translate(ped.x, ped.y);
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(0, 3, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(ped.angle);
    // Body.
    ctx.fillStyle = ped.shirt;
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
    // Head.
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath(); ctx.arc(4, 0, 5, 0, Math.PI * 2); ctx.fill();
    // Gun if armed.
    if (ped.armed) {
      ctx.fillStyle = '#222';
      ctx.fillRect(8, -2, 10, 3);
    }
    ctx.restore();
    if (ped.boss) {
      ctx.fillStyle = '#e74c3c';
      ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
      ctx.fillText('ROOK', ped.x, ped.y - 18);
      // Boss health bar.
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(ped.x - 22, ped.y - 14, 44, 5);
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(ped.x - 22, ped.y - 14, 44 * Math.max(0, ped.health / 300), 5);
    } else if (ped.enemy) {
      ctx.fillStyle = '#ff6b6b';
      ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
      ctx.fillText('!', ped.x, ped.y - 15);
    }
  };

  SB.drawPlayer = function (ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 4, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(p.angle);
    // Jacket + head.
    ctx.fillStyle = '#1f8a4c';
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f0c8a0';
    ctx.beginPath(); ctx.arc(5, 0, 6, 0, Math.PI * 2); ctx.fill();
    // Weapon in hand.
    var w = SB.WEAPON_BY_ID[p.weapon];
    if (p.weapon !== 'fists') {
      ctx.fillStyle = w.color;
      ctx.fillRect(8, -2, p.weapon === 'shotgun' ? 18 : 13, 4);
    }
    ctx.restore();
    // Aim line (short, subtle).
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x + Math.cos(p.angle) * 16, p.y + Math.sin(p.angle) * 16);
    ctx.lineTo(p.x + Math.cos(p.angle) * 34, p.y + Math.sin(p.angle) * 34);
    ctx.stroke();
  };

  // ---- HUD ---------------------------------------------------------------
  SB.renderHUD = function (game, ctx, W, H) {
    var p = game.player;
    var pad = 14;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // Top-left: health / armor bars + cash.
    ctx.fillStyle = SB.COLORS.hudBg;
    ctx.beginPath(); ctx.roundRect(pad, pad, 250, 74, 8); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('SOLARA BAY', pad + 12, pad + 20);
    // Health.
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(pad + 12, pad + 28, 150, 10);
    ctx.fillStyle = p.health > 30 ? '#2ecc71' : '#e74c3c';
    ctx.fillRect(pad + 12, pad + 28, 150 * Math.max(0, p.health / 100), 10);
    ctx.fillStyle = '#fff';
    ctx.font = '11px Arial';
    ctx.fillText('HP ' + Math.ceil(p.health), pad + 168, pad + 37);
    // Armor.
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(pad + 12, pad + 44, 150, 10);
    ctx.fillStyle = '#3498db';
    ctx.fillRect(pad + 12, pad + 44, 150 * Math.max(0, p.armor / 100), 10);
    ctx.fillStyle = '#fff';
    ctx.fillText('ARMOR ' + Math.ceil(p.armor), pad + 168, pad + 53);
    // Cash + respect.
    ctx.fillStyle = '#2ecc71';
    ctx.font = 'bold 15px Arial';
    ctx.fillText('$' + p.cash.toLocaleString('en-US'), pad + 12, pad + 70 - 2);
    ctx.fillStyle = '#f1c40f';
    ctx.font = '12px Arial';
    ctx.fillText(SB.rankName(p.respect) + '  •  ' + p.respect + ' respect', pad + 96, pad + 68);

    // Top-right: wanted stars + clock + district.
    ctx.fillStyle = SB.COLORS.hudBg;
    ctx.beginPath(); ctx.roundRect(W - pad - 210, pad, 210, 74, 8); ctx.fill();
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    var stars = '';
    for (var s = 0; s < 5; s++) stars += s < Math.floor(p.wanted) ? '★' : '☆';
    ctx.fillStyle = p.wanted >= 3 ? '#ff5b5b' : '#ffd94d';
    ctx.fillText(stars, W - pad - 105, pad + 28);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px Arial';
    var hh = Math.floor(game.hour), mm = Math.floor((game.hour - hh) * 60);
    ctx.fillText((hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm, W - pad - 105, pad + 50);
    ctx.font = '12px Arial';
    ctx.fillStyle = '#cfe3ff';
    ctx.fillText(SB.districtAt(p.inCar ? p.inCar.x : p.x, p.inCar ? p.inCar.y : p.y), W - pad - 105, pad + 68);

    // Mission objective, under the health box.
    var obj = SB.objectiveText(game.missions);
    ctx.fillStyle = SB.COLORS.hudBg;
    ctx.beginPath(); ctx.roundRect(pad, pad + 84, 320, 30, 8); ctx.fill();
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'left';
    var label = game.missions.active ? '◆ ' + game.missions.active.def.name + ': ' : '◆ ';
    ctx.fillText(label + obj, pad + 12, pad + 104);

    // Weapon + ammo, bottom-left.
    var w = SB.WEAPON_BY_ID[p.weapon];
    ctx.fillStyle = SB.COLORS.hudBg;
    ctx.beginPath(); ctx.roundRect(pad, H - pad - 52, 210, 52, 8); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(w.name, pad + 12, H - pad - 30);
    ctx.font = '12px Arial';
    ctx.fillStyle = '#cfe3ff';
    ctx.fillText(p.ammo[p.weapon] === Infinity ? '∞ ammo' : p.ammo[p.weapon] + ' rounds  •  [1-4 / Q]', pad + 12, H - pad - 12);

    // Radio, bottom-centre.
    ctx.fillStyle = SB.COLORS.hudBg;
    var radioText = '♪ ' + game.audio.stationName() + '  [R]';
    ctx.font = '12px Arial';
    var rw = ctx.measureText(radioText).width + 24;
    ctx.beginPath(); ctx.roundRect(W / 2 - rw / 2, H - pad - 30, rw, 30, 8); ctx.fill();
    ctx.fillStyle = '#ffd94d';
    ctx.textAlign = 'center';
    ctx.fillText(radioText, W / 2, H - pad - 11);

    // Toast (objective updates).
    var toast = game.missions.toast;
    if (toast && performance.now() / 1000 < toast.until) {
      ctx.font = 'bold 15px Arial';
      var tw = ctx.measureText(toast.text).width + 28;
      ctx.fillStyle = 'rgba(10,14,24,0.85)';
      ctx.beginPath(); ctx.roundRect(W / 2 - tw / 2, 108, tw, 34, 8); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(toast.text, W / 2, 130);
    }

    // Controls hint, bottom-right.
    ctx.fillStyle = 'rgba(10,14,24,0.6)';
    ctx.font = '11px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('WASD move • E car • Click shoot • N mission • M map • P pause', W - pad, H - pad - 4);

    SB.renderMinimap(game, ctx, W, H);
  };

  // Live minimap, bottom-right corner.
  SB.renderMinimap = function (game, ctx, W, H) {
    var mw = 190, mh = 142;
    var x0 = W - mw - 14, y0 = H - mh - 46;
    var sx = mw / SB.WORLD_W, sy = mh / SB.WORLD_H;
    ctx.fillStyle = 'rgba(10,14,24,0.8)';
    ctx.beginPath(); ctx.roundRect(x0 - 4, y0 - 4, mw + 8, mh + 8, 8); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, y0, mw, mh); ctx.clip();
    ctx.fillStyle = '#274b2f';
    ctx.fillRect(x0, y0, mw, mh);
    ctx.fillStyle = '#2e7fa8';
    ctx.fillRect(x0, y0, SB.OCEAN_X * sx, mh);
    ctx.fillStyle = '#e6d199';
    ctx.fillRect(x0 + SB.OCEAN_X * sx, y0, (SB.SAND_X - SB.OCEAN_X) * sx, mh);
    ctx.fillStyle = '#555b66';
    SB.ROADS_X.forEach(function (rx) { ctx.fillRect(x0 + rx * sx - 1, y0, 2, mh); });
    SB.ROADS_Y.forEach(function (ry) { ctx.fillRect(x0, y0 + ry * sy - 1, mw, 2); });
    // Mission marker.
    var stage = SB.currentStage(game.missions);
    if (stage && stage.x !== undefined) {
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath(); ctx.arc(x0 + stage.x * sx, y0 + stage.y * sy, 4, 0, Math.PI * 2); ctx.fill();
    }
    // Police (red) and player (green).
    game.cars.forEach(function (car) {
      if (!car.police) return;
      ctx.fillStyle = '#ff5b5b';
      ctx.fillRect(x0 + car.x * sx - 2, y0 + car.y * sy - 2, 4, 4);
    });
    var p = game.player;
    var px = p.inCar ? p.inCar.x : p.x, py = p.inCar ? p.inCar.y : p.y;
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath(); ctx.arc(x0 + px * sx, y0 + py * sy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
    // North marker.
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
    ctx.fillText('N', x0 + mw / 2, y0 - 8 + 4);
  };

  // Full-screen map (M key).
  SB.renderFullMap = function (game, ctx, W, H) {
    ctx.fillStyle = 'rgba(8,12,22,0.88)';
    ctx.fillRect(0, 0, W, H);
    var mw = Math.min(W - 80, 900), mh = mw * (SB.WORLD_H / SB.WORLD_W);
    var x0 = (W - mw) / 2, y0 = (H - mh) / 2;
    var sx = mw / SB.WORLD_W, sy = mh / SB.WORLD_H;
    ctx.fillStyle = '#3d6b35';
    ctx.fillRect(x0, y0, mw, mh);
    ctx.fillStyle = '#2e7fa8';
    ctx.fillRect(x0, y0, SB.OCEAN_X * sx, mh);
    ctx.fillStyle = '#e6d199';
    ctx.fillRect(x0 + SB.OCEAN_X * sx, y0, (SB.SAND_X - SB.OCEAN_X) * sx, mh);
    SB.DISTRICTS.forEach(function (d) {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(x0 + d.x * sx, y0 + d.y * sy, d.w * sx, d.h * sy);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
      ctx.fillText(d.name.toUpperCase(), x0 + d.labelX * sx, y0 + d.labelY * sy);
    });
    ctx.fillStyle = '#555b66';
    SB.ROADS_X.forEach(function (rx) { ctx.fillRect(x0 + rx * sx - 1.5, y0, 3, mh); });
    SB.ROADS_Y.forEach(function (ry) { ctx.fillRect(x0, y0 + ry * sy - 1.5, mw, 3); });
    var p = game.player;
    var px = p.inCar ? p.inCar.x : p.x, py = p.inCar ? p.inCar.y : p.y;
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath(); ctx.arc(x0 + px * sx, y0 + py * sy, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px Arial'; ctx.textAlign = 'center';
    ctx.fillText('SOLARA BAY — press M to close', W / 2, y0 - 16);
    ctx.font = '13px Arial';
    ctx.fillText('Garage ◆  Weapon shops ◆  Food stands ◆  Packages: ' + p.packages + '/8', W / 2, y0 + mh + 24);
  };

  // ---- screens ------------------------------------------------------------
  SB.renderTitle = function (game, ctx, W, H) {
    // Sunset gradient backdrop.
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1b2a52');
    g.addColorStop(0.55, '#c65d3b');
    g.addColorStop(1, '#f2a65a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // Sun.
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath(); ctx.arc(W * 0.72, H * 0.32, 64, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,217,77,0.3)';
    ctx.beginPath(); ctx.arc(W * 0.72, H * 0.32, 92, 0, Math.PI * 2); ctx.fill();
    // Ocean strip.
    ctx.fillStyle = '#2e7fa8';
    ctx.fillRect(0, H * 0.72, W, H * 0.28);
    ctx.fillStyle = '#e6d199';
    ctx.fillRect(0, H * 0.70, W, H * 0.02);
    // Palm silhouettes.
    ctx.fillStyle = '#1d2b1f';
    for (var i = 0; i < 7; i++) {
      var px = W * (0.06 + i * 0.15);
      ctx.fillRect(px, H * 0.62, 6, H * 0.1);
      ctx.beginPath(); ctx.arc(px + 3, H * 0.60, 26, 0, Math.PI * 2); ctx.fill();
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 84px Arial, sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 18;
    ctx.fillText('SOLARA BAY', W / 2, H * 0.30);
    ctx.shadowBlur = 0;
    ctx.font = '22px Arial';
    ctx.fillStyle = '#ffe9b0';
    ctx.fillText('An open-world crime story  •  Sun, sand, and sirens', W / 2, H * 0.30 + 38);
    var blink = Math.sin(game.clock * 3) > -0.2;
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = blink ? '#fff' : 'rgba(255,255,255,0.4)';
    ctx.fillText('Press ENTER to play' + (game.hasSave ? '   •   Press C to Continue' : ''), W / 2, H * 0.52);
    ctx.font = '14px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText('WASD move  •  Mouse aim  •  Click shoot  •  E enter car  •  N start mission  •  F5 quick save', W / 2, H * 0.60);
    ctx.fillText('8 story missions for Vera Solano  •  6 districts  •  0–5 star wanted system', W / 2, H * 0.64);
    if (game.hasSave) {
      ctx.fillStyle = '#ffd94d';
      ctx.font = 'bold 14px Arial';
      ctx.fillText('Save found: $' + game.saveInfo.cash + '  •  ' + game.saveInfo.missions + ' missions done  •  ' + game.saveInfo.packages + '/8 packages', W / 2, H * 0.70 - 8);
    }
  };

  SB.renderPause = function (game, ctx, W, H) {
    ctx.fillStyle = 'rgba(8,12,22,0.72)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 52px Arial';
    ctx.fillText('PAUSED', W / 2, H / 2 - 40);
    ctx.font = '16px Arial';
    ctx.fillStyle = '#cfe3ff';
    ctx.fillText('P / Esc to resume   •   F5 quick save   •   M map', W / 2, H / 2 + 4);
    ctx.fillText('Missions completed: ' + game.missions.completed.length + '/8   •   Cash $' + game.player.cash, W / 2, H / 2 + 30);
  };

  SB.renderEnd = function (game, ctx, W, H, kind) {
    ctx.fillStyle = kind === 'wasted' ? 'rgba(60,0,0,0.82)' : 'rgba(0,20,60,0.82)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 72px Arial';
    ctx.fillText(kind === 'wasted' ? 'WASTED' : 'BUSTED', W / 2, H / 2 - 20);
    ctx.font = '18px Arial';
    ctx.fillStyle = '#ffd94d';
    ctx.fillText(kind === 'wasted' ? 'The Bay claims another driver.' : 'The SBPD finally caught up with you.', W / 2, H / 2 + 18);
    ctx.fillStyle = '#fff';
    ctx.font = '16px Arial';
    ctx.fillText('Press ENTER to restart from your last save', W / 2, H / 2 + 52);
  };

  // Dialogue box at the bottom of the screen.
  SB.renderDialogue = function (game, ctx, W, H) {
    var dlg = game.missions.dialogue;
    if (!dlg) return;
    var line = dlg.lines[dlg.i];
    ctx.fillStyle = 'rgba(8,12,22,0.88)';
    ctx.beginPath(); ctx.roundRect(60, H - 150, W - 120, 92, 10); ctx.fill();
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 15px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('VERA SOLANO', 84, H - 118);
    ctx.fillStyle = '#fff';
    ctx.font = '16px Arial';
    // Simple word wrap.
    var words = line.split(' ');
    var row = '', y = H - 92;
    for (var i = 0; i < words.length; i++) {
      var test = row ? row + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > W - 170 && row) {
        ctx.fillText(row, 84, y);
        row = words[i];
        y += 22;
      } else row = test;
    }
    ctx.fillText(row, 84, y);
    ctx.fillStyle = '#cfe3ff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('ENTER to continue', W - 84, H - 72);
  };
})();
