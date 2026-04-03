// ─────────────────────────────────────────────────────────────────────────────
// @peps/voice-avatar-bridge
// Connects voice-core WebSocket to avatar engine
//
// Protocol (voice-core WebSocket):
//   Client → Server : binary PCM 16kHz mono linear16 (mic audio)
//   Client → Server : JSON { type: 'speech_end' | 'barge_in' | 'ping' }
//   Server → Client : binary PCM 22050Hz mono linear16 (Cartesia TTS)
//   Server → Client : JSON { type: 'transcript' | 'tts_start' | 'tts_end' |
//                            'processing' | 'response_text' | 'error' | ... }
// ─────────────────────────────────────────────────────────────────────────────

export type AvatarExpression =
  | "idle" | "speaking" | "listening" | "thinking" | "greeting" | "error"

export type BridgeState =
  | "disconnected" | "connecting" | "ready" | "listening" | "thinking" | "speaking"

export interface BridgeEvents {
  /** Expression changed — drive your avatar with this */
  expression: (expr: AvatarExpression) => void
  /** Audio amplitude 0–1 for lip-sync during speaking */
  amplitude: (amp: number) => void
  /** Partial / final transcript from Deepgram */
  transcript: (text: string, isFinal: boolean) => void
  /** Agent text response (streaming) */
  response: (text: string) => void
  /** State machine changed */
  state: (state: BridgeState) => void
  /** WebSocket error or server error */
  error: (msg: string) => void
  /** Connection opened */
  connected: () => void
  /** Connection closed */
  disconnected: () => void
  /** Tool call in progress */
  toolCall: (name: string, status: "executing" | "done") => void
  /** Data collected during session */
  dataUpdate: (data: Record<string, unknown>, percent: number) => void
}

export interface BridgeOptions {
  /** voice-core WebSocket URL, e.g. wss://voice-core-production.up.railway.app/ws */
  url: string
  /** Tenant ID */
  tenant: string
  /** Agent ID */
  agent?: string
  /** Mic audio: sample rate (default 16000) */
  sampleRate?: number
  /** Mic chunk size in ms (default 100) */
  chunkMs?: number
  /** Cartesia output sample rate (default 22050) */
  ttsSampleRate?: number
  /** Auto-connect on create (default true) */
  autoConnect?: boolean
  /** Reconnect on unexpected close (default true) */
  autoReconnect?: boolean
  /** Max reconnect attempts (default 5) */
  maxReconnectAttempts?: number
}

// ─── PCM helpers ─────────────────────────────────────────────────────────────

/** Convert Float32 samples → Int16 PCM Buffer (for sending to Deepgram) */
function float32ToInt16(float32: Float32Array): ArrayBuffer {
  const int16 = new Int16Array(float32.length)
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]))
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return int16.buffer
}

/** Decode raw Int16 PCM → Float32 for Web Audio playback */
function int16ToFloat32(buf: ArrayBuffer): Float32Array {
  const int16 = new Int16Array(buf)
  const f32 = new Float32Array(int16.length)
  for (let i = 0; i < int16.length; i++) {
    f32[i] = int16[i] / 0x7fff
  }
  return f32
}

/** Compute RMS amplitude 0–1 from Float32 samples */
function computeAmplitude(samples: Float32Array): number {
  let sum = 0
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i]
  return Math.min(1, Math.sqrt(sum / samples.length) * 4)
}

// ─── VoiceAvatarBridge ────────────────────────────────────────────────────────

export class VoiceAvatarBridge {
  private opts: Required<BridgeOptions>
  private ws: WebSocket | null = null
  private state: BridgeState = "disconnected"

  // Audio infrastructure
  private audioCtx: AudioContext | null = null
  private micStream: MediaStream | null = null
  private micProcessor: ScriptProcessorNode | null = null
  private ttsQueue: Float32Array[] = []         // Queued PCM chunks for playback
  private ttsPlaying = false
  private ttsScheduledUntil = 0                  // AudioContext.currentTime
  private ttsAmplitude = 0
  private amplitudeAnimFrame = 0

  // Reconnect state
  private reconnectAttempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private destroyed = false

  // Event listeners
  private listeners: Partial<{ [K in keyof BridgeEvents]: BridgeEvents[K][] }> = {}

  constructor(opts: BridgeOptions) {
    this.opts = {
      sampleRate: 16000,
      chunkMs: 100,
      ttsSampleRate: 22050,
      autoConnect: true,
      autoReconnect: true,
      maxReconnectAttempts: 5,
      agent: "default",
      ...opts,
    }
    if (this.opts.autoConnect) this.connect()
  }

  // ── Event emitter ──────────────────────────────────────────────────────────

  on<K extends keyof BridgeEvents>(event: K, listener: BridgeEvents[K]): this {
    if (!this.listeners[event]) this.listeners[event] = []
    ;(this.listeners[event] as BridgeEvents[K][]).push(listener)
    return this
  }

  off<K extends keyof BridgeEvents>(event: K, listener: BridgeEvents[K]): this {
    if (this.listeners[event]) {
      this.listeners[event] = (this.listeners[event] as BridgeEvents[K][])
        .filter(l => l !== listener) as any
    }
    return this
  }

  private emit<K extends keyof BridgeEvents>(
    event: K,
    ...args: Parameters<BridgeEvents[K]>
  ): void {
    const ls = this.listeners[event] as ((...a: any[]) => void)[] | undefined
    if (ls) ls.forEach(l => l(...args))
  }

  // ── State management ────────────────────────────────────────────────────────

  private setState(s: BridgeState): void {
    if (this.state === s) return
    this.state = s
    this.emit("state", s)
  }

  getState(): BridgeState { return this.state }

  // ── WebSocket connection ────────────────────────────────────────────────────

  connect(): void {
    if (this.destroyed) return
    if (this.ws?.readyState === WebSocket.OPEN) return

    this.setState("connecting")
    const url = `${this.opts.url}?tenant=${this.opts.tenant}&agent=${this.opts.agent}`
    this.ws = new WebSocket(url)
    this.ws.binaryType = "arraybuffer"

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
      this.setState("ready")
      this.emit("connected")
      this.startKeepalive()
    }

    this.ws.onmessage = (ev) => {
      if (ev.data instanceof ArrayBuffer) {
        this.handleTTSChunk(ev.data)
      } else if (typeof ev.data === "string") {
        this.handleControlMessage(ev.data)
      }
    }

    this.ws.onerror = () => {
      this.emit("error", "WebSocket connection error")
    }

    this.ws.onclose = (ev) => {
      this.stopMicrophone()
      this.setState("disconnected")
      this.emit("disconnected")
      if (!this.destroyed && this.opts.autoReconnect && ev.code !== 1000) {
        this.scheduleReconnect()
      }
    }
  }

  disconnect(): void {
    this.destroyed = true
    this.stopMicrophone()
    this.clearReconnectTimer()
    this.ws?.close(1000, "Client disconnect")
    this.ws = null
    cancelAnimationFrame(this.amplitudeAnimFrame)
    this.audioCtx?.close()
  }

  // ── Keepalive ping (Railway closes idle WS after ~60s) ─────────────────────

  private keepaliveInterval: ReturnType<typeof setInterval> | null = null

  private startKeepalive(): void {
    this.keepaliveInterval && clearInterval(this.keepaliveInterval)
    this.keepaliveInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendJson({ type: "ping" })
      }
    }, 20_000)
  }

  // ── Reconnect logic ─────────────────────────────────────────────────────────

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.opts.maxReconnectAttempts) {
      this.emit("error", `Max reconnect attempts (${this.opts.maxReconnectAttempts}) reached`)
      return
    }
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 15_000)
    this.reconnectAttempts++
    this.reconnectTimer = setTimeout(() => this.connect(), delay)
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null }
  }

  // ── JSON send helper ────────────────────────────────────────────────────────

  private sendJson(data: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  // ── Microphone capture → send PCM to voice-core ────────────────────────────

  async startMicrophone(): Promise<void> {
    if (this.micStream) return

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.opts.sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      })

      this.audioCtx = this.audioCtx ?? new AudioContext({ sampleRate: this.opts.sampleRate })

      const source = this.audioCtx.createMediaStreamSource(this.micStream)
      const chunkSamples = Math.floor(this.opts.sampleRate * (this.opts.chunkMs / 1000))
      // ScriptProcessorNode deprecated but works everywhere without COOP/COEP
      this.micProcessor = this.audioCtx.createScriptProcessor(chunkSamples, 1, 1)

      this.micProcessor.onaudioprocess = (ev) => {
        if (this.state !== "listening") return
        const samples = ev.inputBuffer.getChannelData(0)
        const pcm = float32ToInt16(samples)
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(pcm)
        }
      }

      source.connect(this.micProcessor)
      this.micProcessor.connect(this.audioCtx.destination)

      this.setState("listening")
      this.emit("expression", "listening")
    } catch (err: any) {
      this.emit("error", `Microphone error: ${err.message}`)
    }
  }

  stopMicrophone(): void {
    this.micProcessor?.disconnect()
    this.micProcessor = null
    this.micStream?.getTracks().forEach(t => t.stop())
    this.micStream = null
    if (this.state === "listening") this.setState("ready")
  }

  bargeIn(): void {
    this.sendJson({ type: "barge_in" })
    this.ttsQueue = []
    this.ttsPlaying = false
  }

  // ── Control message handler ─────────────────────────────────────────────────

  private handleControlMessage(raw: string): void {
    let msg: Record<string, unknown>
    try { msg = JSON.parse(raw) } catch { return }

    switch (msg.type) {
      case "transcript":
        this.emit("transcript", msg.text as string, msg.isFinal as boolean)
        break

      case "processing":
        this.setState("thinking")
        this.emit("expression", "thinking")
        break

      case "response_text":
        this.emit("response", msg.text as string)
        break

      case "tts_start":
        this.setState("speaking")
        this.emit("expression", "speaking")
        this.ttsQueue = []
        this.ttsPlaying = false
        this.ttsScheduledUntil = this.audioCtx?.currentTime ?? 0
        this.startAmplitudeLoop()
        break

      case "tts_end":
        // Drain remaining queue, then go idle
        this.drainQueue(() => {
          this.setState(this.micStream ? "listening" : "ready")
          this.emit("expression", this.micStream ? "listening" : "idle")
          cancelAnimationFrame(this.amplitudeAnimFrame)
          this.emit("amplitude", 0)
        })
        break

      case "barge_in_ack":
        this.ttsQueue = []
        break

      case "error":
        this.emit("error", msg.error as string)
        this.emit("expression", "error")
        break

      case "pong":
        break

      case "tool_call":
        this.emit("toolCall", msg.name as string, msg.status as "executing" | "done")
        break

      case "data_update":
        this.emit("dataUpdate",
          msg.collectedData as Record<string, unknown>,
          msg.completionPercent as number
        )
        break
    }
  }

  // ── TTS PCM playback ─────────────────────────────────────────────────────────
  // voice-core streams raw PCM s16le 22050Hz mono in binary chunks
  // We decode + schedule via AudioContext for gapless playback

  private handleTTSChunk(data: ArrayBuffer): void {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext({ sampleRate: this.opts.ttsSampleRate })
    }

    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume()
    }

    const samples = int16ToFloat32(data)
    this.ttsQueue.push(samples)
    this.scheduleTTS()
  }

  private scheduleTTS(): void {
    if (!this.audioCtx) return
    const ctx = this.audioCtx

    // Schedule all queued chunks
    while (this.ttsQueue.length > 0) {
      const samples = this.ttsQueue.shift()!
      const buffer = ctx.createBuffer(1, samples.length, this.opts.ttsSampleRate)
      buffer.copyToChannel(samples, 0)

      const source = ctx.createBufferSource()
      source.buffer = buffer

      // Analyser for real-time amplitude
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.5
      source.connect(analyser)
      analyser.connect(ctx.destination)

      const startAt = Math.max(ctx.currentTime, this.ttsScheduledUntil)
      source.start(startAt)
      this.ttsScheduledUntil = startAt + buffer.duration

      // Track last analyser for amplitude
      this._lastAnalyser = analyser
      source.onended = () => analyser.disconnect()
    }
  }

  private _lastAnalyser: AnalyserNode | null = null
  private _ampData: Uint8Array | null = null

  private startAmplitudeLoop(): void {
    cancelAnimationFrame(this.amplitudeAnimFrame)
    const loop = () => {
      if (this.state !== "speaking") return
      const analyser = this._lastAnalyser
      if (analyser) {
        if (!this._ampData || this._ampData.length !== analyser.frequencyBinCount) {
          this._ampData = new Uint8Array(analyser.frequencyBinCount)
        }
        analyser.getByteTimeDomainData(this._ampData)
        let sum = 0
        for (let i = 0; i < this._ampData.length; i++) {
          const v = (this._ampData[i] - 128) / 128
          sum += v * v
        }
        const amp = Math.min(1, Math.sqrt(sum / this._ampData.length) * 5)
        this.ttsAmplitude = amp
        this.emit("amplitude", amp)
      }
      this.amplitudeAnimFrame = requestAnimationFrame(loop)
    }
    this.amplitudeAnimFrame = requestAnimationFrame(loop)
  }

  private drainQueue(onDone: () => void): void {
    if (!this.audioCtx) { onDone(); return }
    const ctx = this.audioCtx
    const remaining = this.ttsScheduledUntil - ctx.currentTime
    if (remaining > 0) {
      setTimeout(onDone, remaining * 1000 + 100)
    } else {
      onDone()
    }
  }

  // ── Public getters ──────────────────────────────────────────────────────────

  getCurrentAmplitude(): number { return this.ttsAmplitude }

  isConnected(): boolean { return this.ws?.readyState === WebSocket.OPEN }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createBridge(opts: BridgeOptions): VoiceAvatarBridge {
  return new VoiceAvatarBridge(opts)
}

export default { VoiceAvatarBridge, createBridge }
