import pc from "polygon-clipping";

const p1 = [[
  [0, 0], [10, 0], [10, 10], [0, 10], [0, 0]
]];

const p2 = [[
  [5, 5], [15, 5], [15, 15], [5, 15], [5, 5]
]];

const u = pc.union(p1 as any, p2 as any);
console.log(JSON.stringify(u));
