// input.js — keyboard + mouse state for Solara Bay.
// Tracks held keys, one-shot presses, and mouse position/aim in world space.
(function () {
  'use strict';
  var SB = window.SB = window.SB || {};

  var keys = {};
  var pressed = {}; // keys pressed since last poll (one-shot)
  var mouse = { x: 0, y: 0, down: false, clicked: false };
  var canvas = null;

  SB.input = {
    keys: keys,
    pressed: pressed,
    mouse: mouse,
    // Held-key check, case-insensitive for letters.
    down: function (code) { return !!keys[code]; },
    // One-shot check; call once per frame per key.
    wasPressed: function (code) {
      if (pressed[code]) { pressed[code] = false; return true; }
      return false;
    },
    // Clear one-shot state at the end of a frame.
    endFrame: function () {
      for (var k in pressed) pressed[k] = false;
      mouse.clicked = false;
    },
    // Attach listeners to a canvas element.
    attach: function (cv) {
      canvas = cv;
      window.addEventListener('keydown', function (e) {
        var c = e.code;
        if (!keys[c]) pressed[c] = true;
        keys[c] = true;
        // Keep game keys from scrolling the page.
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].indexOf(c) >= 0) e.preventDefault();
        if (c === 'F5') e.preventDefault();
      });
      window.addEventListener('keyup', function (e) { keys[e.code] = false; });
      window.addEventListener('blur', function () {
        for (var k in keys) keys[k] = false;
      });
      cv.addEventListener('mousemove', function (e) {
        var r = cv.getBoundingClientRect();
        mouse.x = e.clientX - r.left;
        mouse.y = e.clientY - r.top;
      });
      cv.addEventListener('mousedown', function (e) {
        if (e.button === 0) { mouse.down = true; mouse.clicked = true; }
      });
      window.addEventListener('mouseup', function (e) {
        if (e.button === 0) mouse.down = false;
      });
      cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    },
  };
})();
