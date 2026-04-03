import { useState, useRef, useCallback, useEffect } from "react"
import { AvatarCanvas } from "./AvatarCanvas"
import { VoiceDemo } from "./VoiceDemo"
import { PRESET_WINIE, PRESET_WINI, Expression, AvatarConfig, AvatarColors } from "@peps/avatar-engine"

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
const COLOR_THEMES: Record<string, Partial<AvatarColors>> = {
  default: {},
  pink:    { iris: "#e879a0", pupil: "#7c1a4a", accessoryPrimary: "#f0a0c0", accessorySecondary: "#d060a0" },
  blue:    { iris: "#3b82f6", pupil: "#1e3a8a", accessoryPrimary: "#60a5fa", accessorySecondary: "#2563eb" },
  green:   { iris: "#10b981", pupil: "#064e3b", accessoryPrimary: "#34d399", accessorySecondary: "#059669" },
  violet:  { iris: "#7c5af5", pupil: "#3b0764", accessoryPrimary: "#a78bfa", accessorySecondary: "#7c3aed" },
}

type Tab = "playground" | "voice"

export default function App() {
  const [tab, setTab] = useState<Tab>("playground")
  const [preset, setPreset] = useState<Preset>("winie")
  const [expression, setExpression] = useState<Expression>("idle")
  const [amplitude, setAmplitude] = useState(0)
  const [manualAmp, setManualAmp] = useState(0)
  const [micActive, setMicActive] = useState(false)
  const [colorTheme, setColorTheme] = useState("default")
  const micRef = useRef<{ stream: MediaStream; analyser: AnalyserNode; ctx: AudioContext } | null>(null)
  const animRef = useRef<number>(0)

  const baseConfig = preset === "wini" ? PRESET_WINI : PRESET_WINIE
  const avatarConfig: AvatarConfig = {
    ...baseConfig,
    colors: { ...baseConfig.colors, ...COLOR_THEMES[colorTheme] },
  }

  useEffect(() => {
    if (!micActive) { setAmplitude(manualAmp); return }
    const data = new Uint8Array(128)
    function tick() {
      if (!micRef.current) return
      micRef.current.analyser.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i++) { const v = (data[i]-128)/128; sum += v*v }
      setAmplitude(Math.min(1, Math.sqrt(sum/data.length)*6))
      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [micActive, manualAmp])

  useEffect(() => { if (!micActive) setAmplitude(manualAmp) }, [manualAmp, micActive])

  const toggleMic = useCallback(async () => {
    if (micActive) {
      micRef.current?.stream.getTracks().forEach(t => t.stop())
      micRef.current?.ctx.close()
      micRef.current = null
      setMicActive(false); setExpression("idle"); return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const ctx = new AudioContext()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256; analyser.smoothingTimeConstant = 0.4
      source.connect(analyser)
      micRef.current = { stream, analyser, ctx }
      setMicActive(true); setExpression("speaking")
    } catch { alert("Microphone non disponible") }
  }, [micActive])

  const tabBtn = (t: Tab, label: string) => (
    <button
      onClick={() => setTab(t)}
      style={{
        padding: "9px 20px", borderRadius: 8, border: "none", cursor: "pointer",
        background: tab === t ? "#7c5af5" : "transparent",
        color: tab === t ? "#fff" : "#6b6b80",
        fontSize: 13, fontWeight: 600, transition: "all 0.15s",
      }}
    >{label}</button>
  )

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f0f13 0%, #12101e 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "32px 16px", gap: 28,
    }}>
      {/* Header */}
      <header style={{ textAlign: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#7c5af5", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>
          PEPs Solutions
        </div>
        <h1 style={{
          fontSize: 32, fontWeight: 700, marginBottom: 8,
          background: "linear-gradient(135deg, #e8e8f0, #a78bfa)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>Avatar Engine Demo</h1>
        <p style={{ fontSize: 15, color: "#6b6b80" }}>
          Spring physics · Viseme lip-sync · 60fps · Voice-Avatar Bridge
        </p>
      </header>

      {/* Tabs */}
      <div style={{
        display: "flex", gap: 4, padding: "4px",
        background: "#18181f", border: "1px solid #2a2a35", borderRadius: 10,
      }}>
        {tabBtn("playground", "🎨 Playground")}
        {tabBtn("voice", "🎙️ Voice Live")}
      </div>

      {/* Tab: Playground */}
      {tab === "playground" && (
        <div style={{ display: "flex", gap: 24, width: "100%", maxWidth: 900, flexWrap: "wrap", justifyContent: "center" }}>
          {/* Avatar stage */}
          <div style={{
            background: "#18181f", border: "1px solid #2a2a35", borderRadius: 16, padding: 24,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 16, flex: "0 0 auto", minWidth: 260,
          }}>
            <div style={{
              background: "linear-gradient(180deg, #1a1a28 0%, #12101e 100%)",
              borderRadius: 20, padding: 24,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
              border: "1px solid #2a2a35",
            }}>
              <AvatarCanvas config={avatarConfig} expression={expression} amplitude={amplitude} size={180} />
              <div style={{ fontSize: 18, fontWeight: 600, color: "#e8e8f0" }}>{avatarConfig.name}</div>
              <span style={{
                background: EXPR_COLORS[expression] + "22", color: EXPR_COLORS[expression],
                border: `1px solid ${EXPR_COLORS[expression]}44`,
                borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 600,
              }}>
                {EXPR_ICONS[expression]} {expression}
              </span>
            </div>
            {/* Preset */}
            <div style={{ display: "flex", gap: 8, width: "100%" }}>
              {(["winie","wini"] as Preset[]).map(p => (
                <button key={p} onClick={() => setPreset(p)} style={{
                  flex: 1, padding: "9px 12px", borderRadius: 8,
                  border: `1px solid ${preset===p?"#7c5af5":"#2a2a35"}`,
                  background: preset===p?"#7c5af533":"transparent",
                  color: preset===p?"#a78bfa":"#6b6b80", cursor: "pointer", fontSize: 13, fontWeight: 500,
                }}>
                  {p==="winie"?"🎀 Inès":"⌚ Antoine"}
                </button>
              ))}
            </div>
            {/* Color */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#6b6b80", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Couleur iris
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                {Object.entries({ default:"#8B5E3C", pink:"#e879a0", blue:"#3b82f6", green:"#10b981", violet:"#7c5af5" })
                  .map(([key,hex]) => (
                    <div key={key} onClick={() => setColorTheme(key)} title={key} style={{
                      width: 28, height: 28, borderRadius: "50%", background: hex, cursor: "pointer",
                      border: colorTheme===key?"2px solid #e8e8f0":"2px solid transparent",
                      transform: colorTheme===key?"scale(1.2)":"scale(1)", transition: "transform 0.15s",
                    }} />
                  ))
                }
              </div>
            </div>
          </div>

          {/* Controls */}
          <div style={{
            background: "#18181f", border: "1px solid #2a2a35", borderRadius: 16, padding: 24,
            display: "flex", flexDirection: "column", gap: 20, flex: "1 1 320px", minWidth: 280,
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#6b6b80", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Expression
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                {EXPRESSIONS.map(expr => (
                  <button key={expr} onClick={() => setExpression(expr)} style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    padding: "10px 8px", borderRadius: 10,
                    border: `1px solid ${expression===expr?EXPR_COLORS[expr]:"#2a2a35"}`,
                    background: expression===expr?EXPR_COLORS[expr]+"22":"transparent",
                    cursor: "pointer", fontSize: 10, fontWeight: 600,
                    color: expression===expr?EXPR_COLORS[expr]:"#6b6b80",
                    letterSpacing: "0.04em", textTransform: "uppercase",
                  }}>
                    <span style={{ fontSize: 20 }}>{EXPR_ICONS[expr]}</span>
                    {expr}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#6b6b80", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Lip-sync
              </div>
              <button onClick={toggleMic} style={{
                width: "100%", padding: "12px", borderRadius: 10,
                border: `1px solid ${micActive?"#ef4444":"#2a2a35"}`,
                background: micActive?"#ef444422":"transparent",
                color: micActive?"#ef4444":"#6b6b80", cursor: "pointer",
                fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                {micActive?"🔴 Arrêter micro":"🎙️ Tester avec micro"}
              </button>
              <div style={{ width:"100%", height:6, background:"#2a2a35", borderRadius:3, overflow:"hidden" }}>
                <div style={{
                  height:"100%", width:`${amplitude*100}%`,
                  background: amplitude>0.5?"#ef4444":"#7c5af5", borderRadius:3, transition:"width 0.05s",
                }} />
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6b6b80" }}>
                  <span>Amplitude manuelle</span>
                  <span>{Math.round(amplitude*100)}%</span>
                </div>
                <input type="range" min={0} max={1} step={0.01} value={manualAmp}
                  onChange={e=>{setManualAmp(+e.target.value);setExpression("speaking")}}
                  style={{ width:"100%", accentColor:"#7c5af5" }} disabled={micActive} />
              </div>
            </div>

            {/* SDK snippet */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#6b6b80", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                SDK Drop-in
              </div>
              <div style={{
                background:"#0d0d14", border:"1px solid #2a2a35", borderRadius:8, padding:12,
                fontFamily:"monospace", fontSize:11, color:"#a78bfa", lineHeight:1.8, overflowX:"auto",
              }}>
                <span style={{color:"#6b6b80"}}>{"//"}</span> Drop-in en 3 lignes<br/>
                {"const avatar = PepsAvatar."}<span style={{color:"#f0837a"}}>create</span>{"({"}<br/>
                {"  container: "}<span style={{color:"#34d399"}}>"#widget"</span>{","}<br/>
                {"  preset: "}<span style={{color:"#34d399"}}>{`"${preset}"`}</span><br/>
                {"})"}<br/>
                {"avatar."}<span style={{color:"#f0837a"}}>setExpression</span>{"("}<span style={{color:"#34d399"}}>{`"${expression}"`}</span>{")"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Voice Live */}
      {tab === "voice" && <VoiceDemo />}

      <footer style={{ fontSize: 12, color: "#3a3a4a", textAlign: "center" }}>
        PEPs Solutions · Avatar Engine v0.1.0 · Canvas 2D · Spring Physics · Voice-Avatar Bridge
      </footer>
    </div>
  )
}
