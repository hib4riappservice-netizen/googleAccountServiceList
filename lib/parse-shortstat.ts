export interface ShortstatCounts {
  insertions: number
  deletions: number
}

/** `git diff --shortstat` の出力を { insertions, deletions } に変換する純粋関数 */
export function parseShortstat(output: string): ShortstatCounts {
  const insertions = Number(output.match(/(\d+) insertions?/)?.[1] ?? 0)
  const deletions = Number(output.match(/(\d+) deletions?/)?.[1] ?? 0)
  return { insertions, deletions }
}
