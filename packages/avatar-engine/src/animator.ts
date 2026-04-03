// ─────────────────────────────────────────────────────────────────────────────
// Avatar Animator — Manages all animation state and frame updates
// ─────────────────────────────────────────────────────────────────────────────

import { Spring, createSpring, stepSpring } from "./spring"
import { VisemeEvent, MouthShape, VISEME_SHAPES, getActiveViseme } from "./visemes"

export type Expression =
  | "idle" | "speaking" | "thinking" | "listening"
  | "greeting" | "happy" | "surprised" | "error" | "sleeping"

export type IdleBehavior =
  | "none" | "look_left" | "look_right" | "look_up"
  | "tilt_head" | "raise_brow" | "wink" | "small_smile" | "slight_nod"

export interface AnimatorState {
  t: number
  // Eyes
  blinkTimer: number
  blinkDuration: number
  nextBlink: number
  isBlinking: boolean
  isWinking: boolean
  winkEye: "left" | "right"
  winkTimer: number
  // Pupils
  pupilX: Spring
  pupilY: Spring
  pupilTarget: { x: number; y: number }
  pupilChangeTimer: number
  // Head
  headTilt: Spring
  headNod: Spring
  // Eyebrows
  leftBrow: Spring
  rightBrow: Spring
  // Hair strands
  hairSprings: Spring[]
  // Mouth
  mouthOpen: Spring
  mouthWidth: Spring
  mouthSmile: Spring
  // Cheeks
  blushOpacity: Spring
  // Body
  breathPhase: number
  // Idle behaviors
  idleTimer: number
  nextIdleBehavior: number
  currentIdleBehavior: IdleBehavior
  idleBehaviorTimer: number
  // Wave (greeting)
  waveAngle: Spring
  // Speaking
  speakPhase: number
}

export interface AnimatorConfig {
  hairStrandCount: number
  blinkIntervalMin: number
  blinkIntervalMax: number
  idleIntervalMin: number
  idleIntervalMax: number
  breathSpeed: number
}

const DEFAULT_CONFIG: AnimatorConfig = {
  hairStrandCount: 7,
  blinkIntervalMin: 2.5,
  blinkIntervalMax: 5.5,
  idleIntervalMin: 3,
  idleIntervalMax: 7,
  breathSpeed: 1.2,
}

export function createAnimator(config: Partial<AnimatorConfig> = {}): AnimatorState {
  const c = { ...DEFAULT_CONFIG, ...config }
  return {
    t: 0,
    blinkTimer: 0,
    blinkDuration: 0.12,
    nextBlink: c.blinkIntervalMin + Math.random() * (c.blinkIntervalMax - c.blinkIntervalMin),
    isBlinking: false,
    isWinking: false,
    winkEye: "right",
    winkTimer: 0,
    pupilX: createSpring(0, 80, 0.88),
    pupilY: createSpring(0, 80, 0.88),
    pupilTarget: { x: 0, y: 0 },
    pupilChangeTimer: 0,
    headTilt: createSpring(0, 60, 0.9),
    headNod: createSpring(0, 60, 0.9),
    leftBrow: createSpring(0, 100, 0.85),
    rightBrow: createSpring(0, 100, 0.85),
    hairSprings: Array.from({ length: c.hairStrandCount }, () =>
      createSpring(0, 40 + Math.random() * 30, 0.88)
    ),
    mouthOpen: createSpring(0, 200, 0.8),
    mouthWidth: createSpring(0.5, 150, 0.85),
    mouthSmile: createSpring(0.3, 100, 0.88),
    blushOpacity: createSpring(0, 60, 0.9),
    breathPhase: 0,
    idleTimer: 0,
    nextIdleBehavior: c.idleIntervalMin + Math.random() * (c.idleIntervalMax - c.idleIntervalMin),
    currentIdleBehavior: "none",
    idleBehaviorTimer: 0,
    waveAngle: createSpring(0, 80, 0.85),
    speakPhase: 0,
  }
}

export interface UpdateParams {
  expression: Expression
  amplitude: number
  visemeQueue?: VisemeEvent[]
  ttsElapsed?: number       // seconds since TTS started
  dt: number                // delta time in seconds
}

const IDLE_BEHAVIORS: IdleBehavior[] = [
  "look_left", "look_right", "look_up", "tilt_head",
  "raise_brow", "wink", "small_smile", "slight_nod",
]

/**
 * Update all animation state for one frame.
 * Returns computed values for the renderer to use.
 */
export function updateAnimator(A: AnimatorState, params: UpdateParams): void {
  const { expression, amplitude, visemeQueue, ttsElapsed, dt } = params
  A.t += dt

  // ── Breathing ────────────────────────────────────────────────────────────
  A.breathPhase += dt * DEFAULT_CONFIG.breathSpeed

  // ── Blinking ─────────────────────────────────────────────────────────────
  if (A.isBlinking) {
    A.blinkTimer += dt
    if (A.blinkTimer >= A.blinkDuration) {
      A.isBlinking = false
      A.blinkTimer = 0
      A.nextBlink = DEFAULT_CONFIG.blinkIntervalMin +
        Math.random() * (DEFAULT_CONFIG.blinkIntervalMax - DEFAULT_CONFIG.blinkIntervalMin)
    }
  } else {
    A.nextBlink -= dt
    if (A.nextBlink <= 0) {
      A.isBlinking = true
      A.blinkTimer = 0
      A.blinkDuration = 0.08 + Math.random() * 0.08
    }
  }

  // ── Winking ──────────────────────────────────────────────────────────────
  if (A.isWinking) {
    A.winkTimer += dt
    if (A.winkTimer > 0.3) {
      A.isWinking = false
      A.winkTimer = 0
    }
  }

  // ── Idle behaviors ───────────────────────────────────────────────────────
  if (expression === "idle") {
    A.idleTimer += dt
    if (A.currentIdleBehavior !== "none") {
      A.idleBehaviorTimer += dt
      if (A.idleBehaviorTimer > 1.5) {
        A.currentIdleBehavior = "none"
        A.idleBehaviorTimer = 0
      }
    }
    if (A.idleTimer >= A.nextIdleBehavior) {
      A.currentIdleBehavior = IDLE_BEHAVIORS[Math.floor(Math.random() * IDLE_BEHAVIORS.length)]
      A.idleBehaviorTimer = 0
      A.idleTimer = 0
      A.nextIdleBehavior = DEFAULT_CONFIG.idleIntervalMin +
        Math.random() * (DEFAULT_CONFIG.idleIntervalMax - DEFAULT_CONFIG.idleIntervalMin)
    }

    // Apply idle behaviors
    switch (A.currentIdleBehavior) {
      case "look_left":  A.pupilTarget = { x: -3, y: 0 }; break
      case "look_right": A.pupilTarget = { x: 3, y: 0 }; break
      case "look_up":    A.pupilTarget = { x: 0, y: -2 }; break
      case "tilt_head":  A.headTilt.target = 0.06; break
      case "raise_brow": A.leftBrow.target = 3; A.rightBrow.target = 1; break
      case "wink":
        if (!A.isWinking) { A.isWinking = true; A.winkEye = "right"; A.winkTimer = 0 }
        break
      case "small_smile": A.mouthSmile.target = 0.6; break
      case "slight_nod":  A.headNod.target = 1.5; break
      case "none":
        A.pupilTarget = { x: 0, y: 0 }
        A.headTilt.target = 0; A.headNod.target = 0
        A.leftBrow.target = 0; A.rightBrow.target = 0
        A.mouthOpen.target = 0; A.mouthWidth.target = 0.5; A.mouthSmile.target = 0.3
        A.waveAngle.target = 0
        break
    }
  }

  // ── Expression-driven targets ────────────────────────────────────────────
  if (expression === "thinking") {
    A.pupilTarget = { x: 2, y: -3 }
    A.headTilt.target = 0.05
    A.leftBrow.target = 3; A.rightBrow.target = 1
    A.mouthSmile.target = 0; A.mouthOpen.target = 0; A.mouthWidth.target = 0.4
  } else if (expression === "speaking") {
    A.speakPhase += dt * 12

    // Frame-accurate viseme lip-sync
    if (visemeQueue && visemeQueue.length > 0 && ttsElapsed !== undefined) {
      const activeViseme = getActiveViseme(visemeQueue, ttsElapsed)
      const shape = VISEME_SHAPES[activeViseme]
      A.mouthOpen.target = shape.open
      A.mouthWidth.target = shape.width
      A.mouthSmile.target = shape.smile
    } else {
      // Fallback: amplitude-based lip-sync
      A.mouthOpen.target = amplitude * 0.9
      A.mouthWidth.target = 0.4 + amplitude * 0.3
      A.mouthSmile.target = 0.1
    }

    A.headTilt.target = Math.sin(A.t * 1.5) * 0.02
    A.headNod.target = Math.sin(A.t * 2.3) * 0.8
    A.pupilTarget = { x: 0, y: 0 }
    A.leftBrow.target = amplitude * 1.5
    A.rightBrow.target = amplitude * 1.5
  } else if (expression === "greeting") {
    A.waveAngle.target = Math.sin(A.t * 5) * 25
    A.mouthSmile.target = 0.8; A.mouthOpen.target = 0.2
    A.blushOpacity.target = 0.3
    A.pupilTarget = { x: 0, y: 0 }
    A.headTilt.target = Math.sin(A.t * 2) * 0.04
  } else if (expression === "happy") {
    A.mouthSmile.target = 1; A.mouthOpen.target = 0.3
    A.blushOpacity.target = 0.5
    A.leftBrow.target = 2; A.rightBrow.target = 2
    if (!A.isWinking && Math.sin(A.t * 0.5) > 0.95) {
      A.isWinking = true; A.winkEye = "right"; A.winkTimer = 0
    }
  } else if (expression === "surprised") {
    A.mouthOpen.target = 0.7; A.mouthWidth.target = 0.3; A.mouthSmile.target = 0
    A.leftBrow.target = 5; A.rightBrow.target = 5
    A.pupilTarget = { x: 0, y: 0 }
  } else if (expression === "listening") {
    A.headTilt.target = Math.sin(A.t * 0.8) * 0.03
    A.pupilTarget = { x: -1, y: 0 }
    A.mouthSmile.target = 0.2; A.mouthOpen.target = 0
  } else if (expression === "error") {
    A.mouthSmile.target = -0.2; A.mouthOpen.target = 0
    A.leftBrow.target = -2; A.rightBrow.target = -2
  }

  // ── Step all springs ─────────────────────────────────────────────────────
  A.pupilX.target = A.pupilTarget.x
  A.pupilY.target = A.pupilTarget.y
  stepSpring(A.pupilX, dt)
  stepSpring(A.pupilY, dt)
  stepSpring(A.headTilt, dt)
  stepSpring(A.headNod, dt)
  stepSpring(A.leftBrow, dt)
  stepSpring(A.rightBrow, dt)
  stepSpring(A.mouthOpen, dt)
  stepSpring(A.mouthWidth, dt)
  stepSpring(A.mouthSmile, dt)
  stepSpring(A.blushOpacity, dt)
  stepSpring(A.waveAngle, dt)

  // Hair spring physics
  for (const hs of A.hairSprings) {
    hs.target = Math.sin(A.t * 1.5 + A.hairSprings.indexOf(hs) * 0.8) * 2
      + A.headTilt.velocity * 15
    stepSpring(hs, dt)
  }
}

/** Get computed blink openness (0 = closed, 1 = open) for each eye */
export function getEyeOpenness(A: AnimatorState): { left: number; right: number } {
  const blinkProgress = A.isBlinking ? 1 - Math.abs(2 * (A.blinkTimer / A.blinkDuration) - 1) : 0
  const winkLeft = A.isWinking && A.winkEye === "left" ? Math.sin(A.winkTimer / 0.3 * Math.PI) : 0
  const winkRight = A.isWinking && A.winkEye === "right" ? Math.sin(A.winkTimer / 0.3 * Math.PI) : 0

  return {
    left: Math.max(0, 1 - blinkProgress - winkLeft),
    right: Math.max(0, 1 - blinkProgress - winkRight),
  }
}
