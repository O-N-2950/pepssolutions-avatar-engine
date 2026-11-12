// ─────────────────────────────────────────────────────────────────────────────
// @peps/avatar-engine — Public API
// Real-time animated avatar engine with spring physics and viseme lip-sync
// ─────────────────────────────────────────────────────────────────────────────

// Spring physics
export type { Spring } from "./spring"
export { createSpring, stepSpring, stepAllSprings, springAt, setSpringTarget } from "./spring"

// Viseme / lip-sync system
export type { VisemeType, VisemeEvent, MouthShape } from "./visemes"
export {
  VISEME_SHAPES, phonemeToViseme, getActiveViseme, getMouthShapeAtTime,
} from "./visemes"

// Animator (state machine for all facial/body animation)
export type { Expression, IdleBehavior, AnimatorState, AnimatorConfig, UpdateParams } from "./animator"
export {
  createAnimator, updateAnimator, getEyeOpenness,
} from "./animator"

// Canvas 2D renderer
export type { AvatarColors, AvatarFeatures, AvatarConfig } from "./renderer"
export {
  PRESET_WINIE, PRESET_WINI,
  renderAvatar,
} from "./renderer"

// Audio amplitude analyzer
export type { AudioAnalyzer } from "./audio-analyzer"
export { createAudioAnalyzer } from "./audio-analyzer"
