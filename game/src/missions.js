// missions.js — mission state machine for Solara Bay.
// Missions are data in config.js (SB.MISSIONS); this module runs them:
// start, advance stages, spawn mission enemies/cars, track dialogue.
(function () {
  'use strict';
  var SB = window.SB = window.SB || {};

  // Fresh mission runtime state.
  SB.newMissionState = function () {
    return {
      index: 0,            // next mission to start (0-based into SB.MISSIONS)
      active: null,        // { def, stage, kills, timer, ... } or null
      dialogue: null,      // { lines, i } while a dialogue box is up
      completed: [],       // mission ids finished
      toast: null,         // { text, until } objective toast
      raceCp: 0,
    };
  };

  SB.missionDef = function (state) {
    return SB.MISSIONS[state.index] || null;
  };

  SB.setToast = function (state, text, seconds) {
    state.toast = { text: text, until: performance.now() / 1000 + (seconds || 4) };
  };

  SB.startMission = function (state, game) {
    var def = SB.missionDef(state);
    if (!def || state.active) return false;
    state.active = {
      def: def, stage: 0, kills: 0, timer: 0, spawned: false,
      bossSpawned: false, raceCp: 0, targetCar: null, escaped: false,
    };
    state.dialogue = { lines: def.dialogue.slice(), i: 0 };
    SB.setToast(state, 'MISSION: ' + def.name + ' — ' + def.brief, 6);
    if (game && game.audio) game.audio.play('mission');
    return true;
  };

  SB.currentStage = function (state) {
    if (!state.active) return null;
    return state.active.def.stages[state.active.stage] || null;
  };

  SB.objectiveText = function (state) {
    var st = SB.currentStage(state);
    if (!st) return state.active ? state.active.def.name : 'Press N to start the next mission';
    var text = st.text;
    if (st.type === 'kill') text = text.replace(/\(\d+\/\d+\)/, '(' + state.active.kills + '/' + st.count + ')');
    if (st.type === 'race') text = text.replace(/\(\d+\/\d+\)/, '(' + state.active.raceCp + '/' + st.checkpoints.length + ')');
    if (st.type === 'defend') text = 'Defend the Marina docks — ' + Math.ceil(st.seconds - state.active.timer) + 's left (' + state.active.kills + '/' + st.count + ' down)';
    return text;
  };

  // Advance to the next stage, or complete the mission.
  SB.advanceStage = function (state, game) {
    var m = state.active;
    if (!m) return;
    m.stage++;
    m.kills = 0; m.timer = 0; m.spawned = false; m.raceCp = 0;
    if (m.stage >= m.def.stages.length) SB.completeMission(state, game);
    else SB.setToast(state, 'New objective: ' + SB.objectiveText(state), 4);
  };

  SB.completeMission = function (state, game) {
    var m = state.active;
    if (!m) return;
    var def = m.def;
    state.completed.push(def.id);
    state.index++;
    state.active = null;
    if (game) {
      game.player.cash += def.reward;
      game.player.respect += def.respect;
      SB.setToast(state, 'MISSION COMPLETE: ' + def.name + '  +$' + def.reward + '  +' + def.respect + ' respect', 6);
      if (game.audio) game.audio.play('missionDone');
    }
  };

  SB.failMission = function (state, game) {
    if (!state.active) return;
    SB.setToast(state, 'MISSION FAILED: ' + state.active.def.name + ' — press N to retry', 6);
    state.active = null;
    if (game) {
      // Clear mission enemies.
      game.peds = game.peds.filter(function (p) { return !p.enemy; });
    }
  };

  // Spawn the enemies for a kill/boss stage around a point.
  SB.spawnMissionEnemies = function (game, x, y, count, opts) {
    opts = opts || {};
    var rng = game.rng;
    for (var i = 0; i < count; i++) {
      var a = rng() * Math.PI * 2;
      var d = SB.rand(rng, 90, 260);
      var ped = SB.makePed(
        SB.clamp(x + Math.cos(a) * d, SB.SAND_X + 20, SB.WORLD_W - 20),
        SB.clamp(y + Math.sin(a) * d, 20, SB.WORLD_H - 20),
        {
          enemy: true, armed: true, state: 'fight',
          health: opts.boss ? 300 : 60,
          shirt: SB.pick(rng, ['#7b2d26', '#5b2c6f', '#1a5276', '#7e5109']),
          name: opts.boss ? 'Rook' : 'Marlow gunman',
          boss: !!opts.boss,
        }
      );
      game.peds.push(ped);
    }
  };

  // Spawn the target sports car for mission 2.
  SB.spawnMissionCar = function (game, x, y) {
    var car = SB.makeCar('sports', x, y, 0, '#e74c3c', { driver: null });
    car.missionCar = true;
    game.cars.push(car);
    return car;
  };

  // Per-frame mission logic: stage checks, spawning, timers.
  SB.updateMission = function (state, game, dt) {
    var m = state.active;
    if (!m) return;
    var st = SB.currentStage(state);
    if (!st) return;
    var p = game.player;
    var px = p.inCar ? p.inCar.x : p.x;
    var py = p.inCar ? p.inCar.y : p.y;

    if (st.type === 'goto' || st.type === 'drive') {
      if (SB.dist(px, py, st.x, st.y) < 60) SB.advanceStage(state, game);
    } else if (st.type === 'steal') {
      if (!m.targetCar) {
        m.targetCar = SB.spawnMissionCar(game, st.x, st.y);
        SB.setToast(state, 'The red Comet GT is parked in Palm Heights', 5);
      }
      if (p.inCar === m.targetCar) SB.advanceStage(state, game);
    } else if (st.type === 'kill') {
      if (!m.spawned) {
        SB.spawnMissionEnemies(game, st.x, st.y, st.count, {});
        m.spawned = true;
      }
      if (m.kills >= st.count) SB.advanceStage(state, game);
    } else if (st.type === 'boss') {
      if (!m.bossSpawned) {
        SB.spawnMissionEnemies(game, st.x, st.y, 1, { boss: true });
        m.bossSpawned = true;
      }
      if (m.kills >= 1) SB.advanceStage(state, game);
    } else if (st.type === 'race') {
      if (!m.spawned) {
        m.spawned = true;
        SB.setToast(state, 'Race! Hit the checkpoints in order — get in a car!', 5);
      }
      var cp = st.checkpoints[m.raceCp];
      if (cp && SB.dist(px, py, cp.x, cp.y) < 70) {
        m.raceCp++;
        if (game.audio) game.audio.play('checkpoint');
        if (m.raceCp >= st.checkpoints.length) SB.advanceStage(state, game);
        else SB.setToast(state, 'Checkpoint ' + m.raceCp + '/' + st.checkpoints.length, 2.5);
      }
    } else if (st.type === 'defend') {
      m.timer += dt;
      if (!m.spawned) {
        SB.spawnMissionEnemies(game, st.x, st.y, 4, {});
        m.spawned = true;
        m.nextWave = 20;
      }
      if (m.timer > (m.nextWave || 9999) && m.kills < st.count) {
        SB.spawnMissionEnemies(game, st.x, st.y, 4, {});
        m.nextWave = (m.nextWave || 20) + 25;
      }
      if (m.kills >= st.count && m.timer >= 20) SB.advanceStage(state, game);
      else if (m.timer >= st.seconds) {
        if (m.kills >= st.count) SB.advanceStage(state, game);
        else SB.failMission(state, game);
      }
    } else if (st.type === 'rescue') {
      if (m.kills >= 0 && SB.dist(px, py, st.x, st.y) < 70) {
        SB.setToast(state, 'Rico is safe! Get him back to Vera — mission complete', 4);
        SB.advanceStage(state, game);
      }
    } else if (st.type === 'escape') {
      if (p.wanted <= 0) SB.advanceStage(state, game);
    }
  };

  // Register a kill for the active mission stage, if it counts.
  SB.registerKill = function (state, ped) {
    var m = state.active;
    if (!m) return;
    var st = SB.currentStage(state);
    if (!st) return;
    if ((st.type === 'kill' || st.type === 'defend') && ped.enemy) m.kills++;
    if (st.type === 'boss' && ped.boss) m.kills++;
    if (st.type === 'rescue' && ped.enemy) {
      // Guards cleared first (stage 0 was the kill stage); rescue stage
      // only needs the player to reach Rico.
    }
  };
})();
