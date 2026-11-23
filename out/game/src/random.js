// random.js — seeded RNG (mulberry32-style, written from scratch) plus
// small helpers. Deterministic screenshots and city generation use it.
(function () {
  'use strict';
  var SB = window.SB = window.SB || {};

  // Mulberry32-style generator: fast, deterministic, good enough for a game.
  SB.makeRng = function (seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  // Hash a short string into a 32-bit seed.
  SB.hashSeed = function (str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };

  // Helpers that take an rng function.
  SB.rand = function (rng, min, max) { return min + rng() * (max - min); };
  SB.randInt = function (rng, min, max) { return Math.floor(SB.rand(rng, min, max + 1)); };
  SB.pick = function (rng, arr) { return arr[Math.floor(rng() * arr.length)]; };
  SB.clamp = function (v, min, max) { return v < min ? min : v > max ? max : v; };
  SB.dist = function (x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  };
  SB.angleTo = function (x1, y1, x2, y2) { return Math.atan2(y2 - y1, x2 - x1); };
  // Shortest signed turn from angle a toward b.
  SB.angleDiff = function (a, b) {
    var d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  };
})();
