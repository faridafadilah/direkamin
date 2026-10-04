// Metrik evaluasi untuk skripsi: WER, precision/recall/F1, dan ekspor CSV.
export const tokens = (
  t,
  { lower = true, punct = true, stamp = true } = {},
) => {
  let s = t;
  if (stamp) s = s.replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]/g, " ");
  if (lower) s = s.toLowerCase();
  if (punct) s = s.replace(/[^\p{L}\p{N}\s]/gu, " ");
  return s.split(/\s+/).filter(Boolean);
};

export function wer(ref, hyp) {
  const n = ref.length,
    m = hyp.length;
  const d = Array.from({ length: n + 1 }, (_, i) =>
    Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  const cost = (i, j) => (ref[i - 1] === hyp[j - 1] ? 0 : 1);
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      d[i][j] = Math.min(
        d[i - 1][j - 1] + cost(i, j),
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
      );
  let i = n,
    j = m,
    S = 0,
    D = 0,
    I = 0;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + cost(i, j)) {
      S += cost(i, j);
      i--;
      j--;
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      D++;
      i--;
    } else {
      I++;
      j--;
    }
  }
  return { S, D, I, N: n, wer: n ? ((S + D + I) / n) * 100 : 0 };
}

export const prf = (tp, fp, fn) => {
  const p = tp + fp ? tp / (tp + fp) : 0,
    r = tp + fn ? tp / (tp + fn) : 0;
  return {
    p: p * 100,
    r: r * 100,
    f1: p + r ? ((2 * p * r) / (p + r)) * 100 : 0,
  };
};

export const csv = (rows) =>
  rows
    .map((r) =>
      r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");
export function download(name, text) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob(["\ufeff" + text], { type: "text/csv" }),
  );
  a.download = name;
  a.click();
}
