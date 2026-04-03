// ─────────────────────────────────────────────────────────────────────────────
// Canvas 2D Renderer — Draws avatars from AnimatorState + AvatarConfig
// Supports both mascot-style (cartoon) and photo-derived styles
// ─────────────────────────────────────────────────────────────────────────────

import { AnimatorState, getEyeOpenness } from "./animator"

export interface AvatarColors {
  body: string
  bodyStroke: string
  eyeWhite: string
  iris: string
  pupil: string
  highlight: string
  brow: string
  mouthLine: string
  mouthFill: string
  tongue: string
  teeth: string
  cheekBlush: string
  hair: string
  hairHighlight: string
  accessoryPrimary: string
  accessorySecondary: string
  sneaker: string
}

export interface AvatarFeatures {
  hasEyelashes: boolean
  hasBow: boolean
  bowPosition: "head" | "neck"
  hasNecklace: boolean
  necklaceLetter: string
  hasBracelet: boolean
  hasWatch: boolean
  hairStyle: "short" | "medium" | "long" | "bun" | "ponytail"
  bodyShape: "round" | "teardrop" | "oval"
  eyeSize: number          // 0.5 – 1.5 scale
  mouthSize: number        // 0.5 – 1.5 scale
}

export interface AvatarConfig {
  colors: AvatarColors
  features: AvatarFeatures
  name: string
}

/** Default Winie (female mascot) preset */
export const PRESET_WINIE: AvatarConfig = {
  name: "Winie",
  colors: {
    body: "#FAFAFA", bodyStroke: "#E0E0E0",
    eyeWhite: "#FFFFFF", iris: "#8B5E3C", pupil: "#3D2010",
    highlight: "rgba(255,255,255,0.92)", brow: "#4A3520",
    mouthLine: "#C0392B", mouthFill: "#B83030",
    tongue: "#E87D7D", teeth: "#F8F8F8",
    cheekBlush: "rgba(240,131,122,0.35)",
    hair: "#3D2010", hairHighlight: "#5A3A20",
    accessoryPrimary: "#F0837A", accessorySecondary: "#D4627A",
    sneaker: "#2C3E6B",
  },
  features: {
    hasEyelashes: true, hasBow: true, bowPosition: "head",
    hasNecklace: true, necklaceLetter: "W",
    hasBracelet: true, hasWatch: false,
    hairStyle: "medium", bodyShape: "teardrop",
    eyeSize: 1, mouthSize: 1,
  },
}

/** Default Wini (male mascot) preset */
export const PRESET_WINI: AvatarConfig = {
  name: "Wini",
  colors: {
    body: "#FAFAFA", bodyStroke: "#E0E0E0",
    eyeWhite: "#FFFFFF", iris: "#4A6FA5", pupil: "#1A2744",
    highlight: "rgba(255,255,255,0.92)", brow: "#2C3E50",
    mouthLine: "#C0392B", mouthFill: "#B83030",
    tongue: "#E87D7D", teeth: "#F8F8F8",
    cheekBlush: "rgba(240,131,122,0.25)",
    hair: "#2C3E50", hairHighlight: "#3D5A80",
    accessoryPrimary: "#1A2744", accessorySecondary: "#2C3E6B",
    sneaker: "#2C3E6B",
  },
  features: {
    hasEyelashes: false, hasBow: true, bowPosition: "neck",
    hasNecklace: false, necklaceLetter: "",
    hasBracelet: false, hasWatch: true,
    hairStyle: "short", bodyShape: "teardrop",
    eyeSize: 1, mouthSize: 1,
  },
}

/**
 * Render a full avatar frame to a Canvas 2D context.
 * Canvas should be sized to 100x120 logical units (scaled via pixelRatio).
 */
export function renderAvatar(
  ctx: CanvasRenderingContext2D,
  A: AnimatorState,
  config: AvatarConfig,
  width: number,
  height: number,
): void {
  const S = width / 100
  const C = config.colors
  const F = config.features
  const eyes = getEyeOpenness(A)
  const breath = Math.sin(A.breathPhase) * 0.5

  ctx.clearRect(0, 0, width, height)
  ctx.save()
  ctx.scale(S, S)

  // ── Head tilt transform ────────────────────────────────────────────────
  ctx.save()
  ctx.translate(50, 50)
  ctx.rotate(A.headTilt.value)
  ctx.translate(-50, -50 + A.headNod.value)

  // ── Body (teardrop) ────────────────────────────────────────────────────
  ctx.beginPath()
  ctx.moveTo(50, 28)
  ctx.bezierCurveTo(70, 28, 78, 45, 76, 65 + breath)
  ctx.bezierCurveTo(74, 80, 62, 90, 50, 92 + breath)
  ctx.bezierCurveTo(38, 90, 26, 80, 24, 65 + breath)
  ctx.bezierCurveTo(22, 45, 30, 28, 50, 28)
  ctx.closePath()
  ctx.fillStyle = C.body; ctx.fill()
  ctx.strokeStyle = C.bodyStroke; ctx.lineWidth = 0.8; ctx.stroke()

  // ── Sneakers ───────────────────────────────────────────────────────────
  ctx.fillStyle = C.sneaker
  ctx.beginPath(); ctx.ellipse(40, 94 + breath, 7, 3.5, -0.1, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.ellipse(60, 94 + breath, 7, 3.5, 0.1, 0, Math.PI * 2); ctx.fill()
  // White sole
  ctx.fillStyle = "#fff"
  ctx.beginPath(); ctx.ellipse(40, 95.5 + breath, 6, 1.5, -0.1, 0, Math.PI); ctx.fill()
  ctx.beginPath(); ctx.ellipse(60, 95.5 + breath, 6, 1.5, 0.1, 0, Math.PI); ctx.fill()

  // ── Arms ───────────────────────────────────────────────────────────────
  const armWaveL = A.waveAngle.value
  // Left arm
  ctx.save()
  ctx.translate(28, 60)
  ctx.rotate((-15 + armWaveL * 0.1) * Math.PI / 180)
  ctx.beginPath()
  ctx.moveTo(0, 0); ctx.quadraticCurveTo(-8, 10, -10, 22)
  ctx.strokeStyle = C.bodyStroke; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.stroke()
  ctx.beginPath(); ctx.arc(-10, 23, 3, 0, Math.PI * 2)
  ctx.fillStyle = C.body; ctx.fill(); ctx.strokeStyle = C.bodyStroke; ctx.lineWidth = 0.5; ctx.stroke()
  ctx.restore()

  // Right arm (wave for greeting)
  ctx.save()
  ctx.translate(72, 60)
  ctx.rotate((15 + armWaveL) * Math.PI / 180)
  ctx.beginPath()
  ctx.moveTo(0, 0); ctx.quadraticCurveTo(8, 10, 10, 22)
  ctx.strokeStyle = C.bodyStroke; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.stroke()
  ctx.beginPath(); ctx.arc(10, 23, 3, 0, Math.PI * 2)
  ctx.fillStyle = C.body; ctx.fill(); ctx.strokeStyle = C.bodyStroke; ctx.lineWidth = 0.5; ctx.stroke()
  ctx.restore()

  // ── Hair ───────────────────────────────────────────────────────────────
  ctx.fillStyle = C.hair
  if (F.hairStyle === "short") {
    ctx.beginPath()
    ctx.moveTo(32, 34); ctx.quadraticCurveTo(50, 18, 68, 34)
    ctx.quadraticCurveTo(72, 26, 65, 22); ctx.quadraticCurveTo(50, 14, 35, 22)
    ctx.quadraticCurveTo(28, 26, 32, 34)
    ctx.closePath(); ctx.fill()
  } else {
    ctx.beginPath()
    ctx.moveTo(30, 38); ctx.quadraticCurveTo(50, 15, 70, 38)
    ctx.quadraticCurveTo(75, 28, 67, 20); ctx.quadraticCurveTo(50, 8, 33, 20)
    ctx.quadraticCurveTo(25, 28, 30, 38)
    ctx.closePath(); ctx.fill()
  }

  // Hair strands with spring physics
  ctx.strokeStyle = C.hair; ctx.lineWidth = 2; ctx.lineCap = "round"
  const strandPositions = [
    { x: 35, y: 24, len: 10, angle: -30 },
    { x: 40, y: 21, len: 12, angle: -15 },
    { x: 45, y: 20, len: 11, angle: -5 },
    { x: 50, y: 19, len: 13, angle: 0 },
    { x: 55, y: 20, len: 11, angle: 5 },
    { x: 60, y: 21, len: 12, angle: 15 },
    { x: 65, y: 24, len: 10, angle: 30 },
  ]
  for (let i = 0; i < Math.min(strandPositions.length, A.hairSprings.length); i++) {
    const sp = strandPositions[i]
    const swing = A.hairSprings[i].value
    ctx.beginPath()
    ctx.moveTo(sp.x, sp.y)
    const rad = (sp.angle + swing) * Math.PI / 180
    ctx.lineTo(sp.x + Math.sin(rad) * sp.len, sp.y - Math.cos(rad) * sp.len)
    ctx.stroke()
  }

  // ── Eyes ────────────────────────────────────────────────────────────────
  const eyeScale = F.eyeSize
  for (const side of ["left", "right"] as const) {
    const ex = side === "left" ? 40 : 60
    const ey = 46
    const openness = side === "left" ? eyes.left : eyes.right

    // Eye white
    ctx.fillStyle = C.eyeWhite
    ctx.beginPath()
    ctx.ellipse(ex, ey, 7 * eyeScale, 8 * eyeScale * openness, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = C.bodyStroke; ctx.lineWidth = 0.4; ctx.stroke()

    if (openness > 0.15) {
      // Iris
      ctx.fillStyle = C.iris
      ctx.beginPath()
      ctx.arc(ex + A.pupilX.value, ey + A.pupilY.value * 0.5, 3.5 * eyeScale, 0, Math.PI * 2)
      ctx.fill()

      // Pupil
      ctx.fillStyle = C.pupil
      ctx.beginPath()
      ctx.arc(ex + A.pupilX.value, ey + A.pupilY.value * 0.5, 1.8 * eyeScale, 0, Math.PI * 2)
      ctx.fill()

      // Highlight
      ctx.fillStyle = C.highlight
      ctx.beginPath()
      ctx.arc(ex + A.pupilX.value - 1, ey + A.pupilY.value * 0.5 - 1.5, 1.2 * eyeScale, 0, Math.PI * 2)
      ctx.fill()
    }

    // Eyelashes
    if (F.hasEyelashes) {
      ctx.strokeStyle = C.brow; ctx.lineWidth = 0.8; ctx.lineCap = "round"
      const lashDir = side === "left" ? -1 : 1
      for (let l = -2; l <= 2; l++) {
        const lx = ex + l * 2.5 * eyeScale
        const ly = ey - 7 * eyeScale * openness
        ctx.beginPath(); ctx.moveTo(lx, ly)
        ctx.lineTo(lx + lashDir * 0.5, ly - 2.5); ctx.stroke()
      }
    }
  }

  // ── Eyebrows ───────────────────────────────────────────────────────────
  ctx.strokeStyle = C.brow; ctx.lineWidth = 1.5; ctx.lineCap = "round"
  ctx.beginPath()
  ctx.moveTo(33, 38 - A.leftBrow.value); ctx.quadraticCurveTo(40, 35 - A.leftBrow.value, 47, 38 - A.leftBrow.value * 0.7)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(53, 38 - A.rightBrow.value * 0.7); ctx.quadraticCurveTo(60, 35 - A.rightBrow.value, 67, 38 - A.rightBrow.value)
  ctx.stroke()

  // ── Cheek blush ────────────────────────────────────────────────────────
  if (A.blushOpacity.value > 0.01) {
    ctx.globalAlpha = A.blushOpacity.value
    ctx.fillStyle = C.cheekBlush
    ctx.beginPath(); ctx.ellipse(33, 54, 5, 3, 0, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.ellipse(67, 54, 5, 3, 0, 0, Math.PI * 2); ctx.fill()
    ctx.globalAlpha = 1
  }

  // ── Mouth ──────────────────────────────────────────────────────────────
  const mouthScale = F.mouthSize
  const mouthCx = 50, mouthCy = 64
  const mo = Math.max(0, Math.min(1, A.mouthOpen.value))
  const mw = A.mouthWidth.value
  const ms = A.mouthSmile.value

  ctx.save()
  ctx.translate(mouthCx, mouthCy)

  if (mo < 0.05) {
    // Closed — smile line
    ctx.beginPath()
    ctx.moveTo(-8 * mw * mouthScale, 0)
    ctx.quadraticCurveTo(0, 6 * ms * mouthScale, 8 * mw * mouthScale, 0)
    ctx.strokeStyle = C.mouthLine; ctx.lineWidth = 1.2; ctx.lineCap = "round"; ctx.stroke()
  } else {
    const openH = (3 + mo * 8) * mouthScale
    const openW = (6 + mw * 8) * mouthScale
    const smileCurve = ms * 3 * mouthScale

    // Mouth outline
    ctx.beginPath()
    ctx.moveTo(-openW, 0)
    ctx.quadraticCurveTo(-openW * 0.3, -openH * 0.4, 0, -openH * 0.3)
    ctx.quadraticCurveTo(openW * 0.3, -openH * 0.4, openW, 0)
    ctx.quadraticCurveTo(openW * 0.5, openH + smileCurve, 0, openH + smileCurve * 0.5)
    ctx.quadraticCurveTo(-openW * 0.5, openH + smileCurve, -openW, 0)
    ctx.closePath()
    ctx.fillStyle = C.mouthFill; ctx.fill()
    ctx.strokeStyle = C.mouthLine; ctx.lineWidth = 0.5; ctx.stroke()

    // Teeth
    if (mo > 0.15) {
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(-openW, 0)
      ctx.quadraticCurveTo(0, -openH * 0.4, openW, 0)
      ctx.lineTo(openW, 2); ctx.quadraticCurveTo(0, 0, -openW, 2)
      ctx.closePath()
      ctx.fillStyle = C.teeth; ctx.fill()
      ctx.restore()
    }

    // Tongue
    if (mo > 0.3) {
      ctx.fillStyle = C.tongue
      ctx.beginPath()
      ctx.ellipse(0, openH * 0.4, openW * 0.4, openH * 0.3, 0, 0, Math.PI)
      ctx.fill()
    }
  }

  ctx.restore() // mouth translate

  // ── Accessories ────────────────────────────────────────────────────────
  // Bow (head or neck)
  if (F.hasBow) {
    const bowX = F.bowPosition === "head" ? 65 : 50
    const bowY = F.bowPosition === "head" ? 26 : 78
    const bowSize = F.bowPosition === "head" ? 1 : 0.8
    ctx.fillStyle = C.accessoryPrimary
    // Left wing
    ctx.beginPath()
    ctx.moveTo(bowX, bowY)
    ctx.quadraticCurveTo(bowX - 6 * bowSize, bowY - 4 * bowSize, bowX - 5 * bowSize, bowY + 1 * bowSize)
    ctx.quadraticCurveTo(bowX - 3 * bowSize, bowY + 3 * bowSize, bowX, bowY)
    ctx.fill()
    // Right wing
    ctx.beginPath()
    ctx.moveTo(bowX, bowY)
    ctx.quadraticCurveTo(bowX + 6 * bowSize, bowY - 4 * bowSize, bowX + 5 * bowSize, bowY + 1 * bowSize)
    ctx.quadraticCurveTo(bowX + 3 * bowSize, bowY + 3 * bowSize, bowX, bowY)
    ctx.fill()
    // Center
    ctx.fillStyle = C.accessorySecondary
    ctx.beginPath(); ctx.arc(bowX, bowY, 1.8 * bowSize, 0, Math.PI * 2); ctx.fill()
  }

  // Necklace
  if (F.hasNecklace) {
    ctx.strokeStyle = "#D4A017"; ctx.lineWidth = 0.6
    ctx.beginPath()
    ctx.moveTo(38, 72); ctx.quadraticCurveTo(50, 78, 62, 72)
    ctx.stroke()
    // Letter pendant
    ctx.fillStyle = "#D4A017"; ctx.font = "bold 6px sans-serif"; ctx.textAlign = "center"
    ctx.fillText(F.necklaceLetter, 50, 79)
  }

  // Watch
  if (F.hasWatch) {
    ctx.fillStyle = "#C0C0C0"
    ctx.fillRect(17, 78, 5, 4)
    ctx.strokeStyle = "#888"; ctx.lineWidth = 0.5
    ctx.strokeRect(17, 78, 5, 4)
  }

  // Bracelet
  if (F.hasBracelet) {
    ctx.strokeStyle = "#F5F0E8"; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.arc(82, 80, 3, 0, Math.PI * 2); ctx.stroke()
  }

  ctx.restore() // head tilt
  ctx.restore() // main scale
}
