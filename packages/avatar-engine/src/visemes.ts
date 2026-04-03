// ─────────────────────────────────────────────────────────────────────────────
// Viseme System — Phoneme-to-mouth-shape mapping for lip-sync
// Supports IPA phonemes for: French, English, German, Italian, Spanish, Portuguese
// ─────────────────────────────────────────────────────────────────────────────

export type VisemeType =
  | "closed"      // p, b, m — lips pressed together
  | "open_narrow" // ə, n, l — slightly open
  | "open_mid"    // ɛ, ɔ, æ — medium open
  | "open_wide"   // a, ɑ — wide open
  | "rounded"     // o, u, ʃ, w — lips rounded/puckered
  | "ee"          // i, e, s, z — wide smile shape
  | "ff"          // f, v — bottom lip to upper teeth
  | "th"          // θ, ð — tongue between teeth

export interface VisemeEvent {
  viseme: VisemeType
  start: number   // seconds from TTS start
  end: number     // seconds from TTS start
}

/** Mouth shape parameters driven by each viseme */
export interface MouthShape {
  open: number     // 0–1 how open the mouth is
  width: number    // 0–1 how wide the mouth is
  smile: number    // -0.5 to 1 smile curve
  tongue: boolean  // tongue visible
  teeth: boolean   // teeth visible
}

export const VISEME_SHAPES: Record<VisemeType, MouthShape> = {
  closed:      { open: 0,    width: 0.5, smile: 0.1,  tongue: false, teeth: false },
  open_narrow: { open: 0.25, width: 0.45, smile: 0.05, tongue: false, teeth: true },
  open_mid:    { open: 0.5,  width: 0.55, smile: 0,    tongue: false, teeth: true },
  open_wide:   { open: 0.85, width: 0.6, smile: -0.05, tongue: true,  teeth: true },
  rounded:     { open: 0.4,  width: 0.25, smile: 0,    tongue: false, teeth: false },
  ee:          { open: 0.2,  width: 0.7, smile: 0.3,   tongue: false, teeth: true },
  ff:          { open: 0.1,  width: 0.55, smile: 0,    tongue: false, teeth: true },
  th:          { open: 0.15, width: 0.5, smile: 0,     tongue: true,  teeth: true },
}

/** Full IPA → viseme mapping (multilingual) */
const IPA_MAP: Record<string, VisemeType> = {
  // Silence
  "sil": "closed", "sp": "closed", "": "closed",
  // Plosives
  "p": "closed", "b": "closed", "t": "closed", "d": "closed",
  "k": "closed", "g": "closed", "ʔ": "closed",
  // Nasals
  "m": "closed", "n": "open_narrow", "ɲ": "open_narrow", "ŋ": "open_narrow",
  // Fricatives
  "f": "ff", "v": "ff", "s": "ee", "z": "ee",
  "ʃ": "rounded", "ʒ": "rounded", "ç": "ee",
  "θ": "th", "ð": "th", "h": "open_narrow",
  "ʁ": "open_narrow", "ʀ": "open_narrow", "x": "open_narrow", "χ": "open_narrow",
  // Approximants
  "l": "open_narrow", "ɫ": "open_narrow", "j": "ee", "w": "rounded", "ɥ": "rounded",
  "ɹ": "open_narrow", "r": "open_narrow", "ɾ": "open_narrow",
  // Front vowels
  "i": "ee", "ɪ": "ee", "e": "ee", "ɛ": "open_mid", "æ": "open_mid",
  "y": "rounded", "ø": "rounded", "œ": "open_mid",
  // Central vowels
  "ə": "open_narrow", "ɐ": "open_mid", "ɜ": "open_mid", "ʌ": "open_mid",
  // Open vowels
  "a": "open_wide", "ɑ": "open_wide", "ɒ": "open_wide",
  // Back vowels
  "o": "rounded", "ɔ": "open_mid", "u": "rounded", "ʊ": "rounded",
  // Nasal vowels (French)
  "ɑ̃": "open_wide", "ɛ̃": "open_mid", "ɔ̃": "rounded", "œ̃": "open_mid",
  // German specific
  "pf": "ff", "ts": "ee",
  // Spanish
  "ʎ": "ee", "ɣ": "open_narrow", "β": "ff", "ɱ": "ff",
}

/** Convert IPA phoneme to viseme, with diacritic stripping fallback */
export function phonemeToViseme(phoneme: string): VisemeType {
  if (IPA_MAP[phoneme]) return IPA_MAP[phoneme]
  const stripped = phoneme.replace(/[\u0300-\u036f\u0303\u0327\u0330\u0331ː ˈˌ]/g, "")
  return IPA_MAP[stripped] ?? "open_narrow"
}

/** Get the current active viseme from a queue based on elapsed time */
export function getActiveViseme(queue: VisemeEvent[], elapsedSeconds: number): VisemeType {
  for (let i = queue.length - 1; i >= 0; i--) {
    if (elapsedSeconds >= queue[i].start && elapsedSeconds <= queue[i].end) {
      return queue[i].viseme
    }
  }
  return "closed"
}

/** Get mouth shape for current time, with spring-ready interpolation */
export function getMouthShapeAtTime(queue: VisemeEvent[], elapsedSeconds: number): MouthShape {
  const viseme = getActiveViseme(queue, elapsedSeconds)
  return VISEME_SHAPES[viseme]
}
