function maxSeq(ids: string[], prefix: string): number {
  let max = 0;
  for (const id of ids) {
    if (!id.startsWith(prefix)) continue;
    const n = Number.parseInt(id.slice(prefix.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

export function nextId(ids: string[], prefix: string, width = 4): string {
  return `${prefix}${String(maxSeq(ids, prefix) + 1).padStart(width, "0")}`;
}

/** Bill IDs run in one sequence across years: LAB-<year>-<seq>. */
export function nextBillId(ids: string[], year: number): string {
  let max = 0;
  for (const id of ids) {
    const n = Number.parseInt(id.split("-")[2] ?? "", 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `LAB-${year}-${String(max + 1).padStart(4, "0")}`;
}
