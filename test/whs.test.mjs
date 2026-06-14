import { scoreDifferential, computeGolferRecord, courseHandicap } from "../src/lib/whs.js";

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? "✓" : "✗"} ${label} → ${got}${ok ? "" : ` (expected ${want})`}`);
  ok ? pass++ : fail++;
};

// Score differential: (113/132)(88 - 71.8) = 13.868 → 13.9
eq("differential 88 @ 71.8/132", scoreDifferential(88, 71.8, 132), 13.9);
eq("differential 85 @ 71.8/132", scoreDifferential(85, 71.8, 132), 11.3);

// Course handicap: 11.3 * (132/113) + (71.8 - 72) = 13.2 - 0.2 = 13.0 → 13
eq("course handicap 11.3 on 71.8/132 par72", courseHandicap(11.3, { slope: 132, rating: 71.8, par: 72 }), 13);

// Full record: 5 scores, table[5] = lowest 1, adj 0 → index = lowest differential = 11.3
const courseMap = {
  1: { id: 1, tees: [{ id: 11, name: "Blue", rating: 71.8, slope: 132, par: 72 }] },
};
const scores = [88, 91, 85, 90, 87].map((ags, i) => ({
  id: 100 + i, golferId: 1, courseId: 1, teeId: 11,
  date: new Date(Date.now() - (5 - i) * 7 * 86400000).toISOString().slice(0, 10),
  adjustedGross: ags, pcc: 0,
}));
const rec = computeGolferRecord(1, scores, courseMap);
eq("index from 5 scores (best 1)", rec.current, 11.3);
eq("score count", rec.scoreCount, 5);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
