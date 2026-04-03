import { useEffect, useRef } from "react"
import {
  createAnimator, updateAnimator, renderAvatar,
  AnimatorState, Expression, AvatarConfig,
} from "@peps/avatar-engine"

interface Props {
  config: AvatarConfig
  expression: Expression
  amplitude: number
  size?: number
}

export function AvatarCanvas({ config, expression, amplitude, size = 200 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<AnimatorState>(createAnimator())
  const frameRef = useRef<number>(0)
  const lastRef = useRef<number>(0)

  // Sync latest props into a ref so the animation loop can read them
  const propsRef = useRef({ expression, amplitude, config })
  propsRef.current = { expression, amplitude, config }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!
    const A = stateRef.current

    function tick(ts: number) {
      const dt = Math.min((ts - (lastRef.current || ts)) / 1000, 0.05)
      lastRef.current = ts

      const { expression, amplitude, config } = propsRef.current
      updateAnimator(A, { expression, amplitude, dt })
      renderAvatar(ctx, A, config, canvas!.width, canvas!.height)

      frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [])

  const pr = window.devicePixelRatio || 1
  return (
    <canvas
      ref={canvasRef}
      width={size * pr}
      height={size * 1.2 * pr}
      style={{ width: size, height: size * 1.2, display: "block" }}
    />
  )
}
