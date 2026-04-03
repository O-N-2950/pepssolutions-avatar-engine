import { useState, useRef, useCallback, useEffect } from "react"
import { AvatarCanvas } from "./AvatarCanvas"
import { PRESET_WINIE, PRESET_WINI, Expression, AvatarConfig, AvatarColors } from "@peps/avatar-engine"

// ─── Types ────────────────────────────────────────────────────────────────────
type Preset = "winie" | "wini"

const EXPRESSIONS: Expression[] = [
  "idle", "speaking", "listening", "thinking",
  "greeting", "happy", "surprised", "error", "sleeping",
]

const EXPR_ICONS: Record<Expression, string> = {
  idle: "😌", speaking: "🗣️", listening: "👂", thinking: "🤔",
  greeting: "👋", happy: "😊", surprised: "😮", error: "😟", sleeping: "😴",
}

const EXPR_COLORS: Record<Expression, string> = {
  idle: "#6b6b80", speaking: "#7c5af5", listening: "#3b82f6", thinking: "#f59e0b",
  greeting: "#10b981", happy: "#f0837a", surprised: "#ec4899", error: "#ef4444", sleeping: "#8b5cf6",
}

// ─── Color presets ────────────────────────────────────────────────────────────
const COLOR_THEMES: Record<string, Partial<AvatarColors>> = {
  default: {},
  pink:    { iris: "#e879a0", pupil: "#7c1a4a", accessoryPrimary: "#f0a0c0", accessorySecondary: "#d060a0" },
  blue:    { iris: "#3b82f6", pupil: "#1e3a8a", accessoryPrimary: "#60a5fa", accessorySecondary: "#2563eb" },
  green:   { iris: "#10b981", pupil: "#064e3b", accessoryPrimary: "#34d399", accessorySecondary: "#059669" },
  violet:  { iris: "#7c5af5", pupil: "#3b0764", accessoryPrimary: "#a78bfa", accessorySecondary: "#7c3aed" },
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  app: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f0f13 0%, #12101e 100%)",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    padding: "32px 16px",
    gap: 32,
  },
  header: {
    textAlign: "center" as const,
  },
  logo: {
    fontSize: 13,
    fontWeight: 600,
    color: "#7c5af5",
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
    background: "linear-gradient(135deg, #e8e8f0, #a78bfa)",
    WebkitBackgroundClip: "text" as const,
    WebkitTextFillColor: "transparent" as const,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#6b6b80",
  },
  main: {
    display: "flex",
    gap: 24,
    width: "100%",
    maxWidth: 900,
    flexWrap: "wrap" as const,
    justifyContent: "center",
  },
  card: {
    background: "#18181f",
    border: "1px solid #2a2a35",
    borderRadius: 16,
    padding: 24,
  },
  avatarCard: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 16,
    flex: "0 0 auto",
    minWidth: 260,
  },
  avatarStage: {
    background: "linear-gradient(180deg, #1a1a28 0%, #12101e 100%)",
    borderRadius: 20,
    padding: 24,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 12,
    border: "1px solid #2a2a35",
    position: "relative" as const,
  },
  avatarName: {
    fontSize: 18,
    fontWeight: 600,
    color: "#e8e8f0",
  },
  badge: (color: string) => ({
    display: "inline-block",
    background: color + "22",
    color,
    border: `1px solid ${color}44`,
    borderRadius: 20,
    padding: "3px 12px",
    fontSize: 12,
    fontWeight: 600,
  }),
  controls: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 20,
    flex: "1 1 320px",
    minWidth: 280,
  },
  section: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: "#6b6b80",
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 8,
  },
  exprBtn: (active: boolean, color: string) => ({
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 4,
    padding: "10px 8px",
    borderRadius: 10,
    border: `1px solid ${active ? color : "#2a2a35"}`,
    background: active ? color + "22" : "transparent",
    cursor: "pointer",
    transition: "all 0.15s",
    fontSize: 10,
    fontWeight: 600,
    color: active ? color : "#6b6b80",
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
  }),
  row: {
    display: "flex",
    gap: 8,
  },
  btn: (active: boolean) => ({
    flex: 1,
    padding: "9px 12px",
    borderRadius: 8,
    border: `1px solid ${active ? "#7c5af5" : "#2a2a35"}`,
    background: active ? "#7c5af533" : "transparent",
    color: active ? "#a78bfa" : "#6b6b80",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    transition: "all 0.15s",
  }),
  slider: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
  },
  sliderLabel: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    color: "#6b6b80",
  },
  input: {
    width: "100%",
    accentColor: "#7c5af5",
    cursor: "pointer",
  },
  micBtn: (active: boolean) => ({
    width: "100%",
    padding: "12px",
    borderRadius: 10,
    border: `1px solid ${active ? "#ef4444" : "#2a2a35"}`,
    background: active ? "#ef444422" : "transparent",
    color: active ? "#ef4444" : "#6b6b80",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    transition: "all 0.15s",
  }),
  ampBar: (amp: number) => ({
    width: "100%",
    height: 6,
    background: "#2a2a35",
    borderRadius: 3,
    overflow: "hidden" as const,
  }),
  ampFill: (amp: number) => ({
    height: "100%",
    width: `${amp * 100}%`,
    background: amp > 0.5 ? "#ef4444" : "#7c5af5",
    borderRadius: 3,
    transition: "width 0.05s",
  }),
  colorDot: (color: string, active: boolean) => ({
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: color,
    border: active ? "2px solid #e8e8f0" : "2px solid transparent",
    cursor: "pointer",
    transition: "transform 0.15s",
    transform: active ? "scale(1.2)" : "scale(1)",
  }),
  footer: {
    fontSize: 12,
    color: "#3a3a4a",
    textAlign: "center" as const,
  },
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [preset, setPreset] = useState<Preset>("winie")
  const [expression, setExpression] = useState<Expression>("idle")
  const [amplitude, setAmplitude] = useState(0)
  const [manualAmp, setManualAmp] = useState(0)
  const [micActive, setMicActive] = useState(false)
  const [colorTheme, setColorTheme] = useState("default")

  const micRef = useRef<{ stream: MediaStream; analyser: AnalyserNode; ctx: AudioContext } | null>(null)
  const animRef = useRef<number>(0)

  // Build avatar config from preset + color theme
  const baseConfig = preset === "wini" ? PRESET_WINI : PRESET_WINIE
  const avatarConfig: AvatarConfig = {
    ...baseConfig,
    colors: { ...baseConfig.colors, ...COLOR_THEMES[colorTheme] },
  }

  // Mic amplitude loop
  useEffect(() => {
    if (!micActive) { setAmplitude(manualAmp); return }
    const data = new Uint8Array(128)
    function tick() {
      if (!micRef.current) return
      micRef.current.analyser.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128; sum += v * v
      }
      const amp = Math.min(1, Math.sqrt(sum / data.length) * 6)
      setAmplitude(amp)
      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [micActive, manualAmp])

  // Update amplitude from manual slider when mic is off
  useEffect(() => {
    if (!micActive) setAmplitude(manualAmp)
  }, [manualAmp, micActive])

  const toggleMic = useCallback(async () => {
    if (micActive) {
      micRef.current?.stream.getTracks().forEach(t => t.stop())
      micRef.current?.ctx.close()
      micRef.current = null
      setMicActive(false)
      setExpression("idle")
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const ctx = new AudioContext()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.4
      source.connect(analyser)
      micRef.current = { stream, analyser, ctx }
      setMicActive(true)
      setExpression("speaking")
    } catch {
      alert("Microphone non disponible")
    }
  }, [micActive])

  return (
    <div style={S.app}>
      {/* Header */}
      <header style={S.header}>
        <div style={S.logo}>PEPs Solutions</div>
        <h1 style={S.title}>Avatar Engine Demo</h1>
        <p style={S.subtitle}>Spring physics · Viseme lip-sync · 60fps · Canvas 2D</p>
      </header>

      {/* Main */}
      <div style={S.main}>
        {/* Avatar stage */}
        <div style={{ ...S.card, ...S.avatarCard }}>
          <div style={S.avatarStage}>
            <AvatarCanvas
              config={avatarConfig}
              expression={expression}
              amplitude={amplitude}
              size={180}
            />
            <div style={S.avatarName}>{avatarConfig.name}</div>
            <span style={S.badge(EXPR_COLORS[expression])}>
              {EXPR_ICONS[expression]} {expression}
            </span>
          </div>

          {/* Preset toggle */}
          <div style={S.row}>
            {(["winie", "wini"] as Preset[]).map(p => (
              <button key={p} style={S.btn(preset === p)} onClick={() => setPreset(p)}>
                {p === "winie" ? "🎀 Inès" : "⌚ Antoine"}
              </button>
            ))}
          </div>

          {/* Color theme */}
          <div style={S.section}>
            <div style={S.sectionTitle}>Couleur iris</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              {Object.entries({ default: "#8B5E3C", pink: "#e879a0", blue: "#3b82f6", green: "#10b981", violet: "#7c5af5" })
                .map(([key, hex]) => (
                  <div key={key}
                    style={S.colorDot(hex, colorTheme === key)}
                    onClick={() => setColorTheme(key)}
                    title={key}
                  />
                ))
              }
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ ...S.card, ...S.controls }}>
          {/* Expressions */}
          <div style={S.section}>
            <div style={S.sectionTitle}>Expression</div>
            <div style={S.grid}>
              {EXPRESSIONS.map(expr => (
                <button
                  key={expr}
                  style={S.exprBtn(expression === expr, EXPR_COLORS[expr])}
                  onClick={() => setExpression(expr)}
                >
                  <span style={{ fontSize: 20 }}>{EXPR_ICONS[expr]}</span>
                  {expr}
                </button>
              ))}
            </div>
          </div>

          {/* Lip-sync */}
          <div style={S.section}>
            <div style={S.sectionTitle}>Lip-sync</div>

            {/* Mic button */}
            <button style={S.micBtn(micActive)} onClick={toggleMic}>
              {micActive ? "🔴 Arrêter micro" : "🎙️ Tester avec micro"}
            </button>

            {/* Amplitude display */}
            <div style={S.ampBar(amplitude)}>
              <div style={S.ampFill(amplitude)} />
            </div>

            {/* Manual amplitude */}
            <div style={S.slider}>
              <div style={S.sliderLabel}>
                <span>Amplitude manuelle</span>
                <span>{Math.round(amplitude * 100)}%</span>
              </div>
              <input
                type="range" min={0} max={1} step={0.01}
                value={manualAmp}
                onChange={e => { setManualAmp(+e.target.value); setExpression("speaking") }}
                style={S.input}
                disabled={micActive}
              />
            </div>
          </div>

          {/* Info box */}
          <div style={{
            background: "#7c5af511",
            border: "1px solid #7c5af533",
            borderRadius: 10,
            padding: 14,
            fontSize: 12,
            color: "#8b7fd4",
            lineHeight: 1.6,
          }}>
            <strong style={{ color: "#a78bfa" }}>🚀 Voice-Avatar Bridge</strong><br />
            Prochaine étape : connecter Cartesia TTS PCM →<br />
            AudioAnalyzer → amplitude → lip-sync temps réel.<br />
            <span style={{ color: "#6b6b80" }}>
              Latence visée : &lt;40ms · 60fps · multi-tenant
            </span>
          </div>

          {/* SDK snippet */}
          <div style={S.section}>
            <div style={S.sectionTitle}>SDK Drop-in</div>
            <div style={{
              background: "#0d0d14",
              border: "1px solid #2a2a35",
              borderRadius: 8,
              padding: 12,
              fontFamily: "monospace",
              fontSize: 11,
              color: "#a78bfa",
              lineHeight: 1.8,
              overflowX: "auto" as const,
            }}>
              <span style={{ color: "#6b6b80" }}>{"// "}</span>Drop-in en 3 lignes<br />
              {"const avatar = PepsAvatar."}<span style={{ color: "#f0837a" }}>create</span>{"({"}<br />
              {"  container: "}<span style={{ color: "#34d399" }}>"#widget"</span>{","}<br />
              {"  preset: "}<span style={{ color: "#34d399" }}>{`"${preset}"`}</span><br />
              {"})"}<br />
              {"avatar."}<span style={{ color: "#f0837a" }}>setExpression</span>{"("}<span style={{ color: "#34d399" }}>{`"${expression}"`}</span>{")"}
            </div>
          </div>
        </div>
      </div>

      <footer style={S.footer}>
        PEPs Solutions · Avatar Engine v0.1.0 · Canvas 2D · Spring Physics
      </footer>
    </div>
  )
}
