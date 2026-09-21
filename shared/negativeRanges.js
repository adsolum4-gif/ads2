export function buildNegativeRanges() {
  const firstWidths = [250, 208, 242];
  const ranges = [];
  let start = 600;
  let i = 0;
  while (start <= 10000) {
    const width = i < firstWidths.length ? firstWidths[i] : 230 + (i % 7) * 6;
    let end = start + width;
    if (end >= 9950) end = 10000;
    ranges.push({
      min: start,
      max: end,
      label: `${start}-${end}`,
    });
    if (end >= 10000) break;
    start = end + 1;
    i += 1;
  }
  return ranges;
}

export const NEGATIVE_RANGES = buildNegativeRanges();

export function vipLevelFromPack(pack) {
  const n = parseInt(String(pack?.name || "").replace(/\D/g, ""), 10);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(10, n);
}

/** VIP 1 = 30, then +10 per level (VIP 3 = 50). */
export function maxRankOfAppearance(level) {
  const lv = Math.max(1, Number(level) || 1);
  return 30 + (lv - 1) * 10;
}

export function remainingAppearances(user) {
  const done = Number(user?.current_number_count ?? 0);
  const total = Number(user?.total_number_can_play ?? 0);
  return Math.max(0, total - done);
}
