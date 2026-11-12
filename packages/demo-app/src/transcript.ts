export interface TranscriptLine {
  role: "user" | "assistant"
  text: string
  final: boolean
}

// ES2020 browsers do not provide Array.prototype.findLastIndex.
export function findLastUnfinished(lines: readonly TranscriptLine[], role: TranscriptLine["role"]): number {
  for (let index = lines.length - 1; index >= 0; index--) {
    if (lines[index].role === role && !lines[index].final) return index
  }
  return -1
}
