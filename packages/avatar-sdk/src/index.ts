// ─────────────────────────────────────────────────────────────────────────────
// @peps/avatar-sdk — Drop-in Avatar Widget
// Usage:
//   <script src="https://cdn.pepssolutions.digital/avatar.js"></script>
//   <div id="my-avatar"></div>
//   <script>PepsAvatar.create({ container: '#my-avatar', preset: 'winie' })</script>
// ─────────────────────────────────────────────────────────────────────────────

import {
  AvatarConfig, PRESET_WINIE, PRESET_WINI,
  createAnimator, updateAnimator, renderAvatar,
  AnimatorState, Expression, VisemeEvent,
  createAudioAnalyzer, AudioAnalyzer,
} from "@peps/avatar-engine"

export interface AvatarWidgetOptions {
  /** CSS selector or DOM element to mount into */
  container: string | HTMLElement
  /** Built-in preset: "winie" or "wini" */
  preset?: "winie" | "wini"
  /** Custom avatar config (overrides preset) */
  config?: Partial<AvatarConfig>
  /** Canvas size in CSS pixels */
  size?: number
  /** Initial expression */
  expression?: Expression
  /** Auto-start animation loop */
  autoStart?: boolean
  /** API key for PEPs Solutions platform */
  apiKey?: string
}

export interface AvatarWidget {
  /** Set the current expression */
  setExpression(expr: Expression): void
  /** Set audio amplitude (0–1) for fallback lip-sync */
  setAmplitude(amp: number): void
  /** Push viseme events for frame-accurate lip-sync */
  pushVisemes(events: VisemeEvent[]): void
  /** Mark TTS start time for viseme synchronization */
  markTTSStart(): void
  /** Connect to a Web Audio source for automatic amplitude extraction */
  connectAudioSource(source: AudioNode, audioContext: AudioContext): void
  /** Start the animation loop */
  start(): void
  /** Stop the animation loop */
  stop(): void
  /** Destroy the widget and clean up */
  destroy(): void
  /** Get the canvas element */
  getCanvas(): HTMLCanvasElement
  /** Update avatar config (colors, features) */
  updateConfig(config: Partial<AvatarConfig>): void
}

/**
 * Create an animated avatar widget.
 *
 * Minimal usage:
 * ```js
 * const avatar = PepsAvatar.create({ container: '#avatar', preset: 'winie' })
 * avatar.setExpression('speaking')
 * avatar.setAmplitude(0.7)
 * ```
 */
export function create(options: AvatarWidgetOptions): AvatarWidget {
  const {
    container,
    preset = "winie",
    config: configOverrides,
    size = 120,
    expression: initialExpression = "idle",
    autoStart = true,
    apiKey,
  } = options

  // Resolve container
  const el = typeof container === "string"
    ? document.querySelector<HTMLElement>(container)
    : container
  if (!el) throw new Error(`[PepsAvatar] Container not found: ${container}`)

  // Build config
  const baseConfig = preset === "wini" ? { ...PRESET_WINI } : { ...PRESET_WINIE }
  const avatarConfig: AvatarConfig = {
    ...baseConfig,
    ...configOverrides,
    colors: { ...baseConfig.colors, ...configOverrides?.colors },
    features: { ...baseConfig.features, ...configOverrides?.features },
  }

  // Create canvas
  const canvas = document.createElement("canvas")
  const pixelRatio = window.devicePixelRatio || 1
  canvas.width = size * pixelRatio
  canvas.height = size * 1.2 * pixelRatio
  canvas.style.width = `${size}px`
  canvas.style.height = `${size * 1.2}px`
  canvas.style.display = "block"
  el.appendChild(canvas)

  const ctx = canvas.getContext("2d")!
  const animator: AnimatorState = createAnimator()

  // State
  let currentExpression: Expression = initialExpression
  let currentAmplitude = 0
  let visemeQueue: VisemeEvent[] = []
  let ttsStartTime = 0
  let running = false
  let frameId = 0
  let lastTime = 0
  let audioAnalyzer: AudioAnalyzer | null = null

  // Animation loop
  function tick(timestamp: number) {
    if (!running) return
    const dt = Math.min((timestamp - (lastTime || timestamp)) / 1000, 0.05)
    lastTime = timestamp

    // Auto-extract amplitude from audio source
    if (audioAnalyzer && currentExpression === "speaking") {
      currentAmplitude = audioAnalyzer.getAmplitude()
    }

    const ttsElapsed = ttsStartTime > 0 ? performance.now() / 1000 - ttsStartTime : 0

    updateAnimator(animator, {
      expression: currentExpression,
      amplitude: currentAmplitude,
      visemeQueue: visemeQueue.length > 0 ? visemeQueue : undefined,
      ttsElapsed: ttsStartTime > 0 ? ttsElapsed : undefined,
      dt,
    })

    renderAvatar(ctx, animator, avatarConfig, canvas.width, canvas.height)

    frameId = requestAnimationFrame(tick)
  }

  const widget: AvatarWidget = {
    setExpression(expr: Expression) {
      currentExpression = expr
      if (expr !== "speaking") {
        visemeQueue = []
        ttsStartTime = 0
      }
    },

    setAmplitude(amp: number) {
      currentAmplitude = amp
    },

    pushVisemes(events: VisemeEvent[]) {
      visemeQueue.push(...events)
    },

    markTTSStart() {
      ttsStartTime = performance.now() / 1000
      visemeQueue = []
    },

    connectAudioSource(source: AudioNode, audioContext: AudioContext) {
      audioAnalyzer?.destroy()
      audioAnalyzer = createAudioAnalyzer(audioContext)
      audioAnalyzer.connectSource(source)
    },

    start() {
      if (running) return
      running = true
      lastTime = 0
      frameId = requestAnimationFrame(tick)
    },

    stop() {
      running = false
      cancelAnimationFrame(frameId)
    },

    destroy() {
      this.stop()
      audioAnalyzer?.destroy()
      canvas.remove()
    },

    getCanvas() {
      return canvas
    },

    updateConfig(newConfig: Partial<AvatarConfig>) {
      Object.assign(avatarConfig, newConfig)
      if (newConfig.colors) Object.assign(avatarConfig.colors, newConfig.colors)
      if (newConfig.features) Object.assign(avatarConfig.features, newConfig.features)
    },
  }

  if (autoStart) widget.start()

  return widget
}

// Re-export types for SDK consumers
export type { Expression, VisemeEvent, AvatarConfig, AvatarColors, AvatarFeatures } from "@peps/avatar-engine"
export { PRESET_WINIE, PRESET_WINI } from "@peps/avatar-engine"
