// audio.js — procedural WebAudio sound effects and three radio stations
// for Solara Bay. Everything is synthesized; nothing is loaded. All calls
// are guarded so the game never crashes when audio is unavailable.
(function () {
  'use strict';
  var SB = window.SB = window.SB || {};

  SB.makeAudio = function () {
    var ctx = null;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    } catch (e) { ctx = null; }

    var master = null;
    if (ctx) {
      try {
        master = ctx.createGain();
        master.gain.value = 0.35;
        master.connect(ctx.destination);
      } catch (e) { master = null; }
    }

    var radio = {
      station: 0, timer: null, nodes: [],
      // Simple chord loops per station: [freqs...] played as soft pads.
      patterns: [
        { name: SB.RADIO_STATIONS[0], chords: [[220, 277, 330], [196, 247, 294], [175, 220, 262], [196, 247, 294]], tempo: 0.9, wave: 'triangle' },
        { name: SB.RADIO_STATIONS[1], chords: [[110, 165, 220], [98, 147, 196], [123, 185, 247], [110, 165, 220]], tempo: 0.55, wave: 'sawtooth' },
        { name: SB.RADIO_STATIONS[2], chords: [[262, 330, 392], [294, 370, 440], [247, 311, 370], [262, 330, 392]], tempo: 1.4, wave: 'sine' },
      ],
    };

    function tone(freq, dur, type, vol, slideTo) {
      if (!ctx || !master) return;
      try {
        if (ctx.state === 'suspended') ctx.resume();
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = type || 'sine';
        o.frequency.setValueAtTime(freq, ctx.currentTime);
        if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), ctx.currentTime + dur);
        g.gain.setValueAtTime(vol || 0.2, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        o.connect(g); g.connect(master);
        o.start(); o.stop(ctx.currentTime + dur + 0.02);
      } catch (e) { /* audio is best-effort */ }
    }

    function noise(dur, vol, filterFreq) {
      if (!ctx || !master) return;
      try {
        if (ctx.state === 'suspended') ctx.resume();
        var len = Math.max(1, Math.floor(ctx.sampleRate * dur));
        var buf = ctx.createBuffer(1, len, ctx.sampleRate);
        var data = buf.getChannelData(0);
        for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
        var src = ctx.createBufferSource();
        src.buffer = buf;
        var f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = filterFreq || 1200;
        var g = ctx.createGain();
        g.gain.value = vol || 0.3;
        src.connect(f); f.connect(g); g.connect(master);
        src.start();
      } catch (e) { /* audio is best-effort */ }
    }

    function stopRadio() {
      radio.nodes.forEach(function (n) { try { n.stop(); } catch (e) {} });
      radio.nodes = [];
      if (radio.timer) { clearInterval(radio.timer); radio.timer = null; }
    }

    function startRadio() {
      stopRadio();
      if (!ctx || !master) return;
      var pat = radio.patterns[radio.station];
      var step = 0;
      function chord() {
        if (!ctx || !master) return;
        var freqs = pat.chords[step % pat.chords.length];
        step++;
        freqs.forEach(function (f) {
          try {
            var o = ctx.createOscillator();
            var g = ctx.createGain();
            o.type = pat.wave;
            o.frequency.value = f;
            g.gain.setValueAtTime(0.0001, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.1);
            g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + pat.tempo * 1.8);
            o.connect(g); g.connect(master);
            o.start(); o.stop(ctx.currentTime + pat.tempo * 1.9);
            radio.nodes.push(o);
          } catch (e) {}
        });
        if (radio.nodes.length > 40) radio.nodes.splice(0, radio.nodes.length - 40);
      }
      chord();
      radio.timer = setInterval(chord, pat.tempo * 1000);
    }

    var sounds = {
      shot: function () { noise(0.09, 0.5, 3000); tone(180, 0.08, 'square', 0.15, 60); },
      smg: function () { noise(0.06, 0.35, 2600); },
      shotgun: function () { noise(0.22, 0.6, 1600); tone(120, 0.15, 'square', 0.2, 40); },
      eshot: function () { noise(0.08, 0.25, 2200); },
      punch: function () { noise(0.07, 0.3, 700); },
      empty: function () { tone(900, 0.05, 'square', 0.08); },
      hurt: function () { tone(220, 0.15, 'sawtooth', 0.15, 110); },
      thud: function () { tone(90, 0.12, 'sine', 0.25, 50); },
      explosion: function () { noise(0.7, 0.7, 900); tone(70, 0.6, 'sine', 0.4, 30); },
      pickup: function () { tone(660, 0.1, 'sine', 0.2); tone(880, 0.14, 'sine', 0.2); },
      checkpoint: function () { tone(523, 0.1, 'triangle', 0.25); tone(784, 0.18, 'triangle', 0.25); },
      mission: function () { tone(392, 0.12, 'triangle', 0.2); tone(523, 0.12, 'triangle', 0.2); tone(659, 0.2, 'triangle', 0.2); },
      missionDone: function () { [523, 659, 784, 1047].forEach(function (f, i) { setTimeout(function () { tone(f, 0.18, 'triangle', 0.22); }, i * 110); }); },
      wasted: function () { [330, 262, 196, 131].forEach(function (f, i) { setTimeout(function () { tone(f, 0.3, 'sawtooth', 0.18); }, i * 180); }); },
      siren: function () { tone(700, 0.4, 'sine', 0.06, 950); setTimeout(function () { tone(950, 0.4, 'sine', 0.06, 700); }, 400); },
      engine: function () { tone(60, 0.2, 'sawtooth', 0.05, 90); },
      carEnter: function () { tone(300, 0.08, 'square', 0.12); tone(420, 0.1, 'square', 0.12); },
    };

    return {
      ctx: ctx,
      radio: radio,
      play: function (name) {
        try { if (sounds[name]) sounds[name](); } catch (e) {}
      },
      startRadio: startRadio,
      stopRadio: stopRadio,
      nextStation: function () {
        radio.station = (radio.station + 1) % radio.patterns.length;
        startRadio();
        return radio.patterns[radio.station].name;
      },
      stationName: function () { return radio.patterns[radio.station].name; },
      unlock: function () {
        try { if (ctx && ctx.state === 'suspended') ctx.resume(); } catch (e) {}
      },
    };
  };
})();
