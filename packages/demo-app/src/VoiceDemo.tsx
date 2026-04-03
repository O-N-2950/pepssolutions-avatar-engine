import { useState, useEffect, useRef, useCallback } from "react"
import { VoiceAvatarBridge, BridgeState, AvatarExpression } from "@peps/voice-avatar-bridge"
import { AvatarCanvas } from "./AvatarCanvas"
import { PRESET_WINIE, PRESET_WINI } from "@peps/avatar-engine"

const VOICE_CORE_URL = "wss://voice-core-production.up.railway.app/ws"

const STATE_COLORS: Record<BridgeState, string> = {
  disconnected: "#6b6b80",
  connecting:   "#f59e0b",
  ready:        "#34d399",
  listening:    "#3b82f6",
  thinking:     "#f59e0b",
  speaking:     "#7c5af5",
}

const STATE_LABELS: Record<BridgeState, string> = {
  disconnected: "⚫ Déconnecté",
  connecting:   "🟡 Connexion...",
  ready:        "🟢 Prêt",
  listening:    "🔵 Écoute",
  thinking:     "🟡 Réflexion...",
  speaking:     "🟣 Parle",
}

interface TranscriptLine {
  role: "user" | "assistant"
  text: string
  final: boolean
}

export function VoiceDemo() {
  const [state, setState] = useState<BridgeState>("disconnected")
  const [expression, setExpression] = useState<AvatarExpression>("idle")
  const [amplitude, setAmplitude] = useState(0)
  const [transcript, setTranscript] = useState<TranscriptLine[]>([])
  const [micOn, setMicOn] = useState(false)
  const [tenant, setTenant] = useState("winwin-demo")
  const [agent, setAgent] = useState("winwin-retraite-fr")
  const [error, setError] = useState<string | null>(null)

  const bridgeRef = useRef<VoiceAvatarBridge | null>(null)
  const partialRef = useRef("")
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  const connect = useCallback(() => {
    bridgeRef.current?.disconnect()
    setTranscript([])
    setError(null)
    partialRef.current = ""

    const bridge = new VoiceAvatarBridge({
      url: VOICE_CORE_URL,
      tenant,
      agent,
      autoConnect: true,
      autoReconnect: false,
    })

    bridge
      .on("state", (s) => setState(s))
      .on("expression", (e) => setExpression(e))
      .on("amplitude", (a) => setAmplitude(a))
      .on("error", (msg) => setError(msg))
      .on("transcript", (text, isFinal) => {
        setTranscript(prev => {
          const next = [...prev]
          if (isFinal) {
            // Replace partial with final
            const lastUser = next.findLastIndex(l => l.role === "user" && !l.final)
            if (lastUser >= 0) next[lastUser] = { role: "user", text, final: true }
            else next.push({ role: "user", text, final: true })
          } else {
            const lastUser = next.findLastIndex(l => l.role === "user" && !l.final)
            if (lastUser >= 0) next[lastUser] = { role: "user", text, final: false }
            else next.push({ role: "user", text, final: false })
          }
          return next
        })
      })
      .on("response", (text) => {
        setTranscript(prev => {
          const next = [...prev]
          const lastAssistant = next.findLastIndex(l => l.role === "assistant" && !l.final)
          const accumulated = (lastAssistant >= 0 ? next[lastAssistant].text : "") + text
          if (lastAssistant >= 0) next[lastAssistant] = { role: "assistant", text: accumulated, final: false }
          else next.push({ role: "assistant", text: accumulated, final: false })
          return next
        })
      })

    // Mark assistant messages as final when TTS ends
    bridge.on("state", (s) => {
      if (s === "listening" || s === "ready") {
        setTranscript(prev => prev.map(l =>
          l.role === "assistant" && !l.final ? { ...l, final: true } : l
        ))
      }
    })

    bridgeRef.current = bridge
  }, [tenant, agent])

  const disconnect = useCallback(() => {
    bridgeRef.current?.disconnect()
    bridgeRef.current = null
    setState("disconnected")
    setExpression("idle")
    setMicOn(false)
    setAmplitude(0)
  }, [])

  const toggleMic = useCallback(async () => {
    if (!bridgeRef.current) return
    if (micOn) {
      bridgeRef.current.stopMicrophone()
      setMicOn(false)
      setExpression("idle")
    } else {
      await bridgeRef.current.startMicrophone()
      setMicOn(true)
    }
  }, [micOn])

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [transcript])

  // Cleanup on unmount
  useEffect(() => () => { bridgeRef.current?.disconnect() }, [])

  const isConnected = state !== "disconnected" && state !== "connecting"
  const avatarConfig = agent.includes("horlogis") ? { ...PRESET_WINI } : { ...PRESET_WINIE }

  return (
    <div style={{
      background: "#18181f",
      border: "1px solid #2a2a35",
      borderRadius: 16,
      padding: 24,
      display: "flex",
      flexDirection: "column",
      gap: 20,
      width: "100%",
      maxWidth: 860,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b6b80", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Voice Live
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#e8e8f0" }}>
            Voice-Avatar Bridge
          </div>
        </div>
        <span style={{
          display: "inline-block",
          padding: "4px 14px",
          borderRadius: 20,
          background: STATE_COLORS[state] + "22",
          color: STATE_COLORS[state],
          border: `1px solid ${STATE_COLORS[state]}44`,
          fontSize: 12,
          fontWeight: 600,
        }}>
          {STATE_LABELS[state]}
        </span>
      </div>

      {/* Main layout */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        {/* Avatar */}
        <div style={{
          background: "linear-gradient(180deg, #1a1a28 0%, #12101e 100%)",
          borderRadius: 16,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          border: "1px solid #2a2a35",
          flex: "0 0 auto",
        }}>
          <AvatarCanvas
            config={avatarConfig}
            expression={expression}
            amplitude={amplitude}
            size={160}
          />
          {/* Amplitude bar */}
          <div style={{ width: "100%", height: 4, background: "#2a2a35", borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${amplitude * 100}%`,
              background: expression === "speaking" ? "#7c5af5" : "#3b82f6",
              borderRadius: 2,
              transition: "width 0.05s",
            }} />
          </div>
          <div style={{ fontSize: 12, color: "#6b6b80" }}>
            {avatarConfig.name} · {expression}
          </div>
        </div>

        {/* Controls + Transcript */}
        <div style={{ flex: 1, minWidth: 240, display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Config (only when disconnected) */}
          {!isConnected && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#6b6b80", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Configuration
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <select
                  value={tenant}
                  onChange={e => setTenant(e.target.value)}
                  style={{
                    flex: 1, padding: "8px 12px", borderRadius: 8,
                    background: "#12101e", border: "1px solid #2a2a35",
                    color: "#e8e8f0", fontSize: 13, cursor: "pointer",
                  }}
                >
                  <option value="winwin-demo">WIN WIN Finance</option>
                  <option value="tenant_5f5f636b">HORLOGIS</option>
                </select>
                <input
                  value={agent}
                  onChange={e => setAgent(e.target.value)}
                  placeholder="agent ID"
                  style={{
                    flex: 1, padding: "8px 12px", borderRadius: 8,
                    background: "#12101e", border: "1px solid #2a2a35",
                    color: "#e8e8f0", fontSize: 12,
                  }}
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8 }}>
            {!isConnected ? (
              <button
                onClick={connect}
                style={{
                  flex: 1, padding: "11px", borderRadius: 9,
                  background: "#7c5af5", border: "none",
                  color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                🔌 Connecter
              </button>
            ) : (
              <>
                <button
                  onClick={toggleMic}
                  disabled={state === "connecting" || state === "thinking"}
                  style={{
                    flex: 1, padding: "11px", borderRadius: 9,
                    background: micOn ? "#ef444433" : "#3b82f633",
                    border: `1px solid ${micOn ? "#ef4444" : "#3b82f6"}`,
                    color: micOn ? "#ef4444" : "#3b82f6",
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  {micOn ? "🔴 Couper micro" : "🎙️ Activer micro"}
                </button>
                {state === "speaking" && (
                  <button
                    onClick={() => bridgeRef.current?.bargeIn()}
                    style={{
                      padding: "11px 16px", borderRadius: 9,
                      background: "#f59e0b22", border: "1px solid #f59e0b",
                      color: "#f59e0b", fontSize: 13, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    ⚡ Interrompre
                  </button>
                )}
                <button
                  onClick={disconnect}
                  style={{
                    padding: "11px 16px", borderRadius: 9,
                    background: "transparent", border: "1px solid #2a2a35",
                    color: "#6b6b80", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: 8,
              background: "#ef444411", border: "1px solid #ef444433",
              color: "#ef4444", fontSize: 12,
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Transcript */}
          <div style={{
            flex: 1, minHeight: 180, maxHeight: 240,
            overflowY: "auto",
            background: "#12101e",
            border: "1px solid #2a2a35",
            borderRadius: 10,
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            fontSize: 13,
          }}>
            {transcript.length === 0 ? (
              <div style={{ color: "#3a3a4a", textAlign: "center", margin: "auto" }}>
                {isConnected ? "En attente de parole..." : "Connectez-vous pour démarrer"}
              </div>
            ) : (
              transcript.map((line, i) => (
                <div key={i} style={{
                  display: "flex",
                  justifyContent: line.role === "user" ? "flex-end" : "flex-start",
                }}>
                  <div style={{
                    maxWidth: "85%",
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: line.role === "user" ? "#3b82f622" : "#7c5af522",
                    border: `1px solid ${line.role === "user" ? "#3b82f633" : "#7c5af533"}`,
                    color: line.final ? "#e8e8f0" : "#6b6b80",
                    fontStyle: line.final ? "normal" : "italic",
                    lineHeight: 1.4,
                  }}>
                    <div style={{ fontSize: 10, color: "#6b6b80", marginBottom: 2, fontWeight: 600 }}>
                      {line.role === "user" ? "Vous" : avatarConfig.name}
                    </div>
                    {line.text}
                  </div>
                </div>
              ))
            )}
            <div ref={transcriptEndRef} />
          </div>
        </div>
      </div>
    </div>
  )
}
