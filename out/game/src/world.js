// world.js — city generation for Solara Bay: road grid, districts,
// buildings, beach/ocean, parks; plus road queries used by traffic and AI.
(function () {
  'use strict';
  var SB = window.SB = window.SB || {};

  // Build the city once from a seed. Returns { buildings, trees, districtAt }.
  SB.buildWorld = function (seed) {
    var rng = SB.makeRng(seed);
    var buildings = [];
    var trees = [];

    // Buildings fill the blocks between roads. A block is the rectangle
    // between two neighbouring roads; leave a sidewalk margin around it.
    var xs = [SB.SAND_X].concat(SB.ROADS_X).concat([SB.WORLD_W]);
    var ys = [0].concat(SB.ROADS_Y).concat([SB.WORLD_H]);
    var margin = SB.ROAD_W / 2 + 14;
    for (var bi = 0; bi < xs.length - 1; bi++) {
      for (var bj = 0; bj < ys.length - 1; bj++) {
        var bx0 = xs[bi] + margin, bx1 = xs[bi + 1] - margin;
        var by0 = ys[bj] + margin, by1 = ys[bj + 1] - margin;
        var bw = bx1 - bx0, bh = by1 - by0;
        if (bw < 60 || bh < 60) continue;
        // Skip blocks that are parks.
        var isPark = SB.PARKS.some(function (p) {
          return bx0 >= p.x - 20 && by0 >= p.y - 20 && bx1 <= p.x + p.w + 20 && by1 <= p.y + p.h + 20;
        });
        if (isPark) {
          for (var t = 0; t < 8; t++) {
            trees.push({ x: SB.rand(rng, bx0 + 10, bx1 - 10), y: SB.rand(rng, by0 + 10, by1 - 10), r: SB.rand(rng, 7, 12) });
          }
          continue;
        }
        // 1-3 buildings per block, sized to fit.
        var n = bw > 260 && bh > 200 ? SB.randInt(rng, 2, 3) : 1;
        for (var k = 0; k < n; k++) {
          var w = SB.rand(rng, 60, Math.min(150, bw - 20));
          var h = SB.rand(rng, 50, Math.min(120, bh - 20));
          var x = SB.rand(rng, bx0 + 6, bx1 - w - 6);
          var y = SB.rand(rng, by0 + 6, by1 - h - 6);
          var tall = rng() < 0.18; // a few towers downtown
          buildings.push({
            x: x, y: y, w: w, h: h,
            height: tall ? SB.randInt(rng, 3, 6) : SB.randInt(rng, 1, 2),
            hue: SB.pick(rng, ['#b0b7c3', '#c9b8a3', '#a8b6c9', '#c3b0a8', '#9fb3a8']),
            roof: SB.pick(rng, ['#8d94a3', '#7d8a99', '#a08c7a']),
          });
        }
        // A couple of street trees per block.
        for (var t2 = 0; t2 < 2; t2++) {
          trees.push({ x: SB.rand(rng, bx0, bx1), y: SB.rand(rng, by0, by1), r: SB.rand(rng, 6, 10) });
        }
      }
    }
    // Palm trees along the beach.
    for (var p = 0; p < 40; p++) {
      trees.push({ x: SB.rand(rng, SB.SAND_X + 8, SB.SAND_X + 60), y: SB.rand(rng, 40, SB.WORLD_H - 40), r: SB.rand(rng, 8, 12), palm: true });
    }

    return { buildings: buildings, trees: trees, seed: seed };
  };

  // ---- road queries -------------------------------------------------------
  SB.nearestRoadX = function (x) {
    var best = SB.ROADS_X[0], bd = Math.abs(x - best);
    for (var i = 1; i < SB.ROADS_X.length; i++) {
      var d = Math.abs(x - SB.ROADS_X[i]);
      if (d < bd) { bd = d; best = SB.ROADS_X[i]; }
    }
    return best;
  };
  SB.nearestRoadY = function (y) {
    var best = SB.ROADS_Y[0], bd = Math.abs(y - best);
    for (var i = 1; i < SB.ROADS_Y.length; i++) {
      var d = Math.abs(y - SB.ROADS_Y[i]);
      if (d < bd) { bd = d; best = SB.ROADS_Y[i]; }
    }
    return best;
  };
  SB.isOnRoad = function (x, y) {
    var onX = SB.ROADS_X.some(function (rx) { return Math.abs(x - rx) <= SB.ROAD_W / 2; });
    var onY = SB.ROADS_Y.some(function (ry) { return Math.abs(y - ry) <= SB.ROAD_W / 2; });
    return onX || onY;
  };
  SB.isInOcean = function (x) { return x < SB.OCEAN_X; };
  SB.isOnBeach = function (x) { return x >= SB.OCEAN_X && x < SB.SAND_X; };

  // Find a point on a road near (x,y), snapped to a lane offset.
  SB.snapToRoad = function (x, y) {
    var dx = Math.abs(x - SB.nearestRoadX(x));
    var dy = Math.abs(y - SB.nearestRoadY(y));
    if (dx <= dy) return { x: SB.nearestRoadX(x), y: y, vertical: true };
    return { x: x, y: SB.nearestRoadY(y), vertical: false };
  };

  // District name at a point, or 'Solara Bay'.
  SB.districtAt = function (x, y) {
    for (var i = 0; i < SB.DISTRICTS.length; i++) {
      var d = SB.DISTRICTS[i];
      if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d.name;
    }
    if (x < SB.SAND_X) return 'Beachfront';
    return 'Solara Bay';
  };

  // Point-vs-building collision: returns the building or null.
  SB.buildingAt = function (world, x, y, pad) {
    pad = pad || 0;
    for (var i = 0; i < world.buildings.length; i++) {
      var b = world.buildings[i];
      if (x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad) return b;
    }
    return null;
  };
})();
