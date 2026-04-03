// ─────────────────────────────────────────────────────────────────────────────
// @peps/avatar-engine — Public API
// Real-time animated avatar engine with spring physics and viseme lip-sync
// ─────────────────────────────────────────────────────────────────────────────

// Spring physics
export { Spring, createSpring, stepSpring, stepAllSprings, springAt, setSpringTarget } from "./spring"

// Viseme / lip-sync system
export {
  VisemeType, VisemeEvent, MouthShape,
  VISEME_SHAPES, phonemeToViseme, getActiveViseme, getMouthShapeAtTime,
} from "./visemes"

// Animator (state machine for all facial/body animation)
export {
  Expression, IdleBehavior,
  AnimatorState, AnimatorConfig,
  createAnimator, updateAnimator, getEyeOpenness,
  UpdateParams,
} from "./animator"

// Canvas 2D renderer
export {
  AvatarColors, AvatarFeatures, AvatarConfig,
  PRESET_WINIE, PRESET_WINI,
  renderAvatar,
} from "./renderer"

// Audio amplitude analyzer
export { AudioAnalyzer, createAudioAnalyzer } from "./audio-analyzer"
