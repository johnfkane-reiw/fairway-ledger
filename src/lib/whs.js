/* ============================================================
   World Handicap System engine — pure functions, no globals.
   Runs identically in the browser and in a Cloudflare Worker.
   See README for the rules implemented and the documented v1 gaps.
   ============================================================ */

// number of differentials to use + adjustment, by count in record
export const LOWEST_TABLE = {
  3: [1, -2.0], 4: [1, -1.0], 5: [1, 0],
  6: [2, -1.0], 7: [2, 0], 8: [2, 0],
  9: [3, 0], 10: [3, 0], 11: [3, 0],
  12: [4, 0], 13: [4, 0], 14: [4, 0],
  15: [5, 0], 16: [5, 0],
  17: [6, 0], 18: [6, 0],
  19: [7, 0], 20: [8, 0],
};

export const DAY = 86400000;
export const round1 = (n) => Math.round(n * 10) / 10;

export function scoreDifferential(ags, rating, slope, pcc = 0) {
  return round1((113 / slope) * (ags - rating - pcc));
}

// strokes a player receives on a hole given Course Handicap + stroke index (1..18)
export function strokesOnHole(courseHandicap, si) {
  const ch = Math.round(courseHandicap);
  if (ch >= 0) {
    const base = Math.floor(ch / 18);
    const rem = ch % 18;
    return base + (si <= rem ? 1 : 0);
  }
  const abs = -ch;
  const base = Math.floor(abs / 18);
  const rem = abs % 18;
  return -(base + (si > 18 - rem ? 1 : 0));
}

export function courseHandicap(index, tee) {
  return Math.round(index * (tee.slope / 113) + (tee.rating - tee.par));
}

// adjusted gross from a hole-by-hole array, applying Net Double Bogey
export function adjustedGrossFromHoles(holeScores, tee, indexInEffect) {
  let total = 0;
  for (let i = 0; i < tee.holes.length; i++) {
    const { par, si } = tee.holes[i];
    const raw = holeScores[i];
    if (raw == null || raw === "" || isNaN(raw)) continue;
    let cap;
    if (indexInEffect == null) {
      cap = par + 5; // no established index yet
    } else {
      const ch = courseHandicap(indexInEffect, tee);
      cap = par + 2 + strokesOnHole(ch, si);
    }
    total += Math.min(Number(raw), cap);
  }
  return total;
}

// raw (uncapped) index from a set of differentials, applying the <20 table
export function rawIndexFromDifferentials(diffs) {
  const n = diffs.length;
  if (n < 3) return null;
  const recent = diffs.slice(-20);
  const m = recent.length;
  const key = m >= 20 ? 20 : m;
  const [count, adj] = LOWEST_TABLE[key];
  const lowest = [...recent].sort((a, b) => a - b).slice(0, count);
  const avg = lowest.reduce((s, d) => s + d, 0) / count;
  return Math.min(54.0, round1(avg + adj));
}

// Walk a golfer's scores chronologically (GHIN-style daily revision).
export function computeGolferRecord(golferId, scores, courseMap) {
  const mine = scores
    .filter((s) => s.golferId === golferId)
    .map((s) => {
      const tee = courseMap[s.courseId]?.tees.find((t) => t.id === s.teeId);
      return { ...s, tee, t: new Date(s.date).getTime() };
    })
    .filter((s) => s.tee)
    .sort((a, b) => a.t - b.t || a.id - b.id);

  const diffs = [];
  const indexHistory = [];
  const rows = [];

  for (const s of mine) {
    const runningIndex = indexHistory.length
      ? indexHistory[indexHistory.length - 1].index
      : null;

    let ags, grossTotal, holeDetail = null;
    if (s.holeScores) {
      const ch = runningIndex == null ? null : courseHandicap(runningIndex, s.tee);
      holeDetail = s.tee.holes.map((h, i) => {
        const v = s.holeScores[i];
        const raw = v == null || v === "" || isNaN(v) ? null : Number(v);
        const cap = ch == null ? h.par + 5 : h.par + 2 + strokesOnHole(ch, h.si);
        return { hole: i + 1, par: h.par, si: h.si, yd: h.yd ?? null, raw, cap, adj: raw == null ? null : Math.min(raw, cap) };
      });
      grossTotal = holeDetail.reduce((t, d) => t + (d.raw || 0), 0);
      ags = holeDetail.reduce((t, d) => t + (d.adj || 0), 0);
    } else {
      ags = Number(s.adjustedGross);
      grossTotal = ags;
    }
    const toPar = ags - s.tee.par;
    const diff = scoreDifferential(ags, s.tee.rating, s.tee.slope, s.pcc || 0);
    diffs.push({ date: s.date, t: s.t, value: diff });

    const uncapped = rawIndexFromDifferentials(diffs.map((d) => d.value));

    let finalIndex = uncapped;
    if (uncapped != null && diffs.length >= 20) {
      const windowLows = indexHistory
        .filter((h) => h.t >= s.t - 365 * DAY && h.t < s.t)
        .map((h) => h.index);
      const lowHI = windowLows.length ? Math.min(...windowLows) : uncapped;
      const increase = uncapped - lowHI;
      let capped = uncapped;
      if (increase > 3.0) capped = lowHI + 3.0 + (increase - 3.0) * 0.5;
      capped = Math.min(capped, lowHI + 5.0);
      finalIndex = round1(Math.min(54.0, capped));
    }
    if (finalIndex != null) indexHistory.push({ date: s.date, t: s.t, index: finalIndex });

    rows.push({ ...s, ags, grossTotal, toPar, par: s.tee.par, holeDetail, diff, indexAfter: finalIndex });
  }

  const current = indexHistory.length ? indexHistory[indexHistory.length - 1].index : null;
  const lowHI =
    indexHistory.length >= 20
      ? Math.min(
          ...indexHistory
            .filter((h) => h.t >= mine[mine.length - 1].t - 365 * DAY)
            .map((h) => h.index)
        )
      : null;

  // which rounds currently count toward the Index (lowest N of the last 20, per the table)
  const recentChrono = mine.slice(-20);
  let countingIds = new Set();
  let selection = null;
  if (recentChrono.length >= 3) {
    const key = recentChrono.length >= 20 ? 20 : recentChrono.length;
    const [cnt, adj] = LOWEST_TABLE[key];
    const diffById = new Map(rows.map((r) => [r.id, r.diff]));
    const ranked = [...recentChrono]
      .sort((a, b) => (diffById.get(a.id) - diffById.get(b.id)) || (b.t - a.t))
      .slice(0, cnt);
    countingIds = new Set(ranked.map((r) => r.id));
    selection = { used: cnt, of: recentChrono.length, adj };
  }

  return { current, lowHI, rows: rows.reverse(), scoreCount: mine.length, countingIds, selection };
}

export const fmtIndex = (i) =>
  i == null ? "—" : (i < 0 ? "+" + Math.abs(i).toFixed(1) : i.toFixed(1));
