// ─────────────────────────────────────────────────────────────────────────────
// Human Face Renderer — Memoji-style realistic portrait
// Replaces the egg mascot with proper human facial proportions
// ─────────────────────────────────────────────────────────────────────────────

import { AnimatorState, getEyeOpenness } from "./animator"

export interface SkinTone {
  skin: string
  skinShadow: string
  skinHighlight: string
  lip: string
  lipDark: string
}

export interface HairStyle {
  color: string
  colorHighlight: string
  style: "short_woman" | "medium_woman" | "bun" | "short_man" | "fade" | "curly"
}

export interface FaceFeatures {
  eyeColor: string
  pupilColor: string
  browColor: string
  hasEyelashes: boolean
  hasGlasses: boolean
  glassesColor?: string
  hasEarring?: boolean
  earringColor?: string
}

export interface AvatarColors {
  body: string           // kept for compat
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
  hairStyle: "short" | "medium" | "long" | "bun" | "ponytail" | "fade"
  bodyShape: "round" | "teardrop" | "oval"
  eyeSize: number
  mouthSize: number
  gender: "female" | "male"
  skinTone: "light" | "medium" | "tan" | "dark"
  clothingColor?: string
  clothingStyle?: "tshirt" | "shirt" | "blazer"
}

export interface AvatarConfig {
  colors: AvatarColors
  features: AvatarFeatures
  name: string
}

// ── Skin tone palettes ────────────────────────────────────────────────────────
const SKIN_TONES: Record<string, { base: string; shadow: string; highlight: string; cheek: string }> = {
  light:  { base: "#FDDBB4", shadow: "#F0B98A", highlight: "#FFF0DC", cheek: "rgba(240,140,120,0.28)" },
  medium: { base: "#DFA070", shadow: "#C07840", highlight: "#F0BF90", cheek: "rgba(220,110,80,0.25)" },
  tan:    { base: "#C07840", shadow: "#9A5820", highlight: "#D89060", cheek: "rgba(200,90,60,0.22)" },
  dark:   { base: "#7A4520", shadow: "#5A2C08", highlight: "#9A6030", cheek: "rgba(160,70,40,0.2)" },
}

export const PRESET_INES: AvatarConfig = {
  name: "Inès",
  colors: {
    body: "#FDDBB4", bodyStroke: "#F0B98A",
    eyeWhite: "#FFFFFF", iris: "#4A7A3D", pupil: "#1A3010",
    highlight: "rgba(255,255,255,0.95)", brow: "#3D2810",
    mouthLine: "#C0402B", mouthFill: "#D05040",
    tongue: "#E87D7D", teeth: "#F8F8F8",
    cheekBlush: "rgba(240,130,110,0.28)",
    hair: "#2C1808", hairHighlight: "#5A3010",
    accessoryPrimary: "#E86070", accessorySecondary: "#C03050",
    sneaker: "#2C3E6B",
  },
  features: {
    hasEyelashes: true, hasBow: false, bowPosition: "head",
    hasNecklace: false, necklaceLetter: "",
    hasBracelet: false, hasWatch: false,
    hairStyle: "medium", bodyShape: "oval",
    eyeSize: 1, mouthSize: 1,
    gender: "female", skinTone: "light",
    clothingColor: "#7C5AF5", clothingStyle: "blazer",
  },
}

export const PRESET_ANTOINE: AvatarConfig = {
  name: "Antoine",
  colors: {
    body: "#DFA070", bodyStroke: "#C07840",
    eyeWhite: "#FFFFFF", iris: "#4A6FA5", pupil: "#1A2744",
    highlight: "rgba(255,255,255,0.92)", brow: "#2C1808",
    mouthLine: "#B03020", mouthFill: "#C04030",
    tongue: "#E87D7D", teeth: "#F8F8F8",
    cheekBlush: "rgba(220,100,80,0.18)",
    hair: "#1A1008", hairHighlight: "#3A2010",
    accessoryPrimary: "#1A2744", accessorySecondary: "#2C3E6B",
    sneaker: "#1A2030",
  },
  features: {
    hasEyelashes: false, hasBow: false, bowPosition: "neck",
    hasNecklace: false, necklaceLetter: "",
    hasBracelet: false, hasWatch: true,
    hairStyle: "fade", bodyShape: "oval",
    eyeSize: 1, mouthSize: 1,
    gender: "male", skinTone: "medium",
    clothingColor: "#1A2744", clothingStyle: "blazer",
  },
}

// compat aliases
export const PRESET_WINIE = PRESET_INES
export const PRESET_WINI = PRESET_ANTOINE

// ─────────────────────────────────────────────────────────────────────────────
// Main render function
// Canvas coordinate space: 100×120 logical units
// ─────────────────────────────────────────────────────────────────────────────
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
  const skin = SKIN_TONES[F.skinTone] || SKIN_TONES.light
  const breath = Math.sin(A.breathPhase) * 0.3

  ctx.clearRect(0, 0, width, height)
  ctx.save()
  ctx.scale(S, S)

  // ── Head tilt transform ────────────────────────────────────────────────────
  ctx.save()
  ctx.translate(50, 52)
  ctx.rotate(A.headTilt.value)
  ctx.translate(-50, -52 + A.headNod.value * 0.5)

  // ════════════════════════════════════════════════════════════════════════════
  // SHOULDERS & NECK
  // ════════════════════════════════════════════════════════════════════════════
  const clothing = F.clothingColor || "#3A3A5A"

  // Shoulders
  ctx.beginPath()
  ctx.moveTo(8, 118 + breath)
  ctx.bezierCurveTo(8, 98, 22, 90, 35, 88)
  ctx.lineTo(65, 88)
  ctx.bezierCurveTo(78, 90, 92, 98, 92, 118 + breath)
  ctx.closePath()
  ctx.fillStyle = clothing
  ctx.fill()

  // Blazer lapels (female)
  if (F.clothingStyle === "blazer") {
    ctx.save()
    // Left lapel
    ctx.beginPath()
    ctx.moveTo(50, 88)
    ctx.lineTo(38, 100)
    ctx.lineTo(30, 118 + breath)
    ctx.lineTo(50, 105)
    ctx.closePath()
    ctx.fillStyle = adjustColor(clothing, 20)
    ctx.fill()
    // Right lapel
    ctx.beginPath()
    ctx.moveTo(50, 88)
    ctx.lineTo(62, 100)
    ctx.lineTo(70, 118 + breath)
    ctx.lineTo(50, 105)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  // Shirt collar visible
  ctx.beginPath()
  ctx.moveTo(42, 88)
  ctx.lineTo(50, 92)
  ctx.lineTo(58, 88)
  ctx.strokeStyle = "#F8F8F0"
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Neck
  ctx.beginPath()
  ctx.moveTo(42, 88)
  ctx.bezierCurveTo(42, 80, 44, 76, 50, 76)
  ctx.bezierCurveTo(56, 76, 58, 80, 58, 88)
  ctx.closePath()
  ctx.fillStyle = skin.base
  ctx.fill()
  // Neck shadow
  ctx.beginPath()
  ctx.moveTo(44, 88)
  ctx.bezierCurveTo(44, 82, 46, 78, 50, 78)
  ctx.strokeStyle = skin.shadow
  ctx.lineWidth = 0.5
  ctx.stroke()

  // ════════════════════════════════════════════════════════════════════════════
  // HEAD — oval, human proportions
  // ════════════════════════════════════════════════════════════════════════════
  const headCx = 50, headCy = 44
  const headW = 26, headH = 30  // narrower, taller = more human

  // Head shadow (subtle depth)
  ctx.beginPath()
  ctx.ellipse(headCx + 0.5, headCy + 1, headW, headH, 0, 0, Math.PI * 2)
  ctx.fillStyle = skin.shadow + "40"
  ctx.fill()

  // Head base
  ctx.beginPath()
  ctx.ellipse(headCx, headCy, headW, headH, 0, 0, Math.PI * 2)
  ctx.fillStyle = skin.base
  ctx.fill()

  // Cheekbones highlight
  ctx.save()
  const cheekGrad = ctx.createRadialGradient(38, 50, 0, 38, 50, 10)
  cheekGrad.addColorStop(0, skin.highlight + "50")
  cheekGrad.addColorStop(1, "transparent")
  ctx.fillStyle = cheekGrad
  ctx.beginPath()
  ctx.ellipse(38, 50, 10, 7, 0, 0, Math.PI * 2)
  ctx.fill()
  const cheekGrad2 = ctx.createRadialGradient(62, 50, 0, 62, 50, 10)
  cheekGrad2.addColorStop(0, skin.highlight + "50")
  cheekGrad2.addColorStop(1, "transparent")
  ctx.fillStyle = cheekGrad2
  ctx.beginPath()
  ctx.ellipse(62, 50, 10, 7, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // ════════════════════════════════════════════════════════════════════════════
  // HAIR
  // ════════════════════════════════════════════════════════════════════════════
  drawHair(ctx, A, C, F, headCx, headCy, headW, headH, breath)

  // Ears
  drawEars(ctx, skin, headCx, headCy, headW, headH)

  // ════════════════════════════════════════════════════════════════════════════
  // FACIAL FEATURES
  // ════════════════════════════════════════════════════════════════════════════

  // Eyebrows
  const browY = headCy - 8
  const browLift = A.leftBrow.value
  ctx.strokeStyle = C.brow
  ctx.lineWidth = F.gender === "female" ? 1.4 : 1.8
  ctx.lineCap = "round"

  // Left brow
  ctx.beginPath()
  ctx.moveTo(36, browY - browLift)
  ctx.bezierCurveTo(40, browY - 2 - browLift, 44, browY - 1.5 - A.leftBrow.value * 0.7, 46, browY - A.leftBrow.value * 0.4)
  ctx.stroke()
  // Right brow
  ctx.beginPath()
  ctx.moveTo(54, browY - A.rightBrow.value * 0.4)
  ctx.bezierCurveTo(56, browY - 1.5 - A.rightBrow.value * 0.7, 60, browY - 2 - A.rightBrow.value, 64, browY - A.rightBrow.value)
  ctx.stroke()

  // ── Eyes ──────────────────────────────────────────────────────────────────
  const eyeY = headCy - 2
  const eyeScale = F.eyeSize
  const eyeW = 7 * eyeScale   // horizontal
  const eyeH = 5 * eyeScale   // vertical — more almond-shaped

  for (const side of ["left", "right"] as const) {
    const ex = side === "left" ? 40 : 60
    const openness = (side === "left" ? eyes.left : eyes.right)

    // Eye socket shadow
    ctx.beginPath()
    ctx.ellipse(ex, eyeY + 0.5, eyeW + 1, (eyeH + 1) * openness, 0, 0, Math.PI * 2)
    ctx.fillStyle = adjustColor(skin.shadow, -10) + "30"
    ctx.fill()

    // White of eye — almond shape
    ctx.fillStyle = C.eyeWhite
    ctx.beginPath()
    ctx.ellipse(ex, eyeY, eyeW, eyeH * openness, 0, 0, Math.PI * 2)
    ctx.fill()

    if (openness > 0.1) {
      // Iris — gradient for depth
      const irisGrad = ctx.createRadialGradient(
        ex + A.pupilX.value - 0.5, eyeY + A.pupilY.value * 0.5 - 0.5, 0.5,
        ex + A.pupilX.value, eyeY + A.pupilY.value * 0.5, 3.5 * eyeScale
      )
      irisGrad.addColorStop(0, lightenColor(C.iris, 30))
      irisGrad.addColorStop(0.5, C.iris)
      irisGrad.addColorStop(1, darkenColor(C.iris, 20))
      ctx.fillStyle = irisGrad
      ctx.beginPath()
      ctx.arc(ex + A.pupilX.value, eyeY + A.pupilY.value * 0.5, 3.5 * eyeScale, 0, Math.PI * 2)
      ctx.fill()

      // Pupil
      ctx.fillStyle = C.pupil
      ctx.beginPath()
      ctx.arc(ex + A.pupilX.value, eyeY + A.pupilY.value * 0.5, 1.9 * eyeScale, 0, Math.PI * 2)
      ctx.fill()

      // Catchlight (2 spots for realism)
      ctx.fillStyle = "rgba(255,255,255,0.95)"
      ctx.beginPath()
      ctx.arc(ex + A.pupilX.value - 1, eyeY + A.pupilY.value * 0.5 - 1.2, 1.1 * eyeScale, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = "rgba(255,255,255,0.5)"
      ctx.beginPath()
      ctx.arc(ex + A.pupilX.value + 1.2, eyeY + A.pupilY.value * 0.5 + 1, 0.5, 0, Math.PI * 2)
      ctx.fill()
    }

    // Eyelid crease (upper)
    ctx.beginPath()
    ctx.ellipse(ex, eyeY - eyeH * 0.15 * openness, eyeW * 0.9, eyeH * 0.85 * openness, 0, Math.PI, Math.PI * 2)
    ctx.strokeStyle = skin.shadow + "60"
    ctx.lineWidth = 0.4
    ctx.stroke()

    // Eyelashes — upper
    if (F.hasEyelashes && openness > 0.2) {
      ctx.strokeStyle = C.brow
      ctx.lineWidth = 0.9
      ctx.lineCap = "round"
      for (let l = -3; l <= 3; l++) {
        const lx = ex + l * (eyeW * 0.28)
        const ly = eyeY - eyeH * openness
        const angle = (l / 4.5) * 0.5 - (side === "left" ? 0.2 : -0.2)
        ctx.beginPath()
        ctx.moveTo(lx, ly)
        ctx.lineTo(lx + Math.sin(angle) * 2.2, ly - 2.5 - Math.abs(l) * 0.2)
        ctx.stroke()
      }
    }

    // Lower lashes — subtle
    if (openness > 0.3) {
      ctx.strokeStyle = C.brow + "50"
      ctx.lineWidth = 0.5
      for (let l = -2; l <= 2; l++) {
        const lx = ex + l * (eyeW * 0.3)
        const ly = eyeY + eyeH * openness * 0.9
        ctx.beginPath()
        ctx.moveTo(lx, ly)
        ctx.lineTo(lx, ly + 1.2)
        ctx.stroke()
      }
    }

    // Eyelid outline
    ctx.beginPath()
    ctx.ellipse(ex, eyeY, eyeW, eyeH * openness, 0, 0, Math.PI * 2)
    ctx.strokeStyle = skin.shadow + "80"
    ctx.lineWidth = 0.3
    ctx.stroke()
  }

  // ── Nose ──────────────────────────────────────────────────────────────────
  const noseY = headCy + 6
  ctx.strokeStyle = skin.shadow + "90"
  ctx.lineWidth = 0.8
  ctx.lineCap = "round"
  ctx.lineJoin = "round"

  // Nose bridge subtle line
  ctx.beginPath()
  ctx.moveTo(48.5, eyeY + 4)
  ctx.bezierCurveTo(47, noseY - 2, 46, noseY, 47, noseY + 1)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(51.5, eyeY + 4)
  ctx.bezierCurveTo(53, noseY - 2, 54, noseY, 53, noseY + 1)
  ctx.stroke()

  // Nostrils
  ctx.fillStyle = skin.shadow + "70"
  ctx.beginPath()
  ctx.ellipse(47, noseY + 2, 2.2, 1.4, -0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(53, noseY + 2, 2.2, 1.4, 0.3, 0, Math.PI * 2)
  ctx.fill()

  // Nose tip highlight
  ctx.fillStyle = skin.highlight + "60"
  ctx.beginPath()
  ctx.ellipse(50, noseY + 1, 2.5, 2, 0, 0, Math.PI * 2)
  ctx.fill()

  // ── Cheek blush ────────────────────────────────────────────────────────────
  if (A.blushOpacity.value > 0.01) {
    ctx.globalAlpha = A.blushOpacity.value
    const blushL = ctx.createRadialGradient(36, 52, 0, 36, 52, 8)
    blushL.addColorStop(0, skin.cheek)
    blushL.addColorStop(1, "transparent")
    ctx.fillStyle = blushL
    ctx.beginPath()
    ctx.ellipse(36, 52, 8, 5, 0, 0, Math.PI * 2)
    ctx.fill()
    const blushR = ctx.createRadialGradient(64, 52, 0, 64, 52, 8)
    blushR.addColorStop(0, skin.cheek)
    blushR.addColorStop(1, "transparent")
    ctx.fillStyle = blushR
    ctx.beginPath()
    ctx.ellipse(64, 52, 8, 5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  // ── Mouth ──────────────────────────────────────────────────────────────────
  const mouthY = headCy + 14
  const mo = Math.max(0, Math.min(1, A.mouthOpen.value))
  const mw = A.mouthWidth.value
  const ms = A.mouthSmile.value

  ctx.save()
  ctx.translate(50, mouthY)

  if (mo < 0.04) {
    // Closed — Cupid's bow lips
    const lipW = (7 + mw * 4) * F.mouthSize
    const smileH = ms * 2 * F.mouthSize

    // Upper lip
    ctx.beginPath()
    ctx.moveTo(-lipW, 0)
    ctx.bezierCurveTo(-lipW * 0.6, -smileH, -lipW * 0.2, -1.5, 0, -1)
    ctx.bezierCurveTo(lipW * 0.2, -1.5, lipW * 0.6, -smileH, lipW, 0)
    ctx.strokeStyle = C.mouthLine
    ctx.lineWidth = 1
    ctx.lineCap = "round"
    ctx.stroke()

    // Lower lip curve
    ctx.beginPath()
    ctx.moveTo(-lipW, 0)
    ctx.bezierCurveTo(-lipW * 0.5, smileH + 1.5, lipW * 0.5, smileH + 1.5, lipW, 0)
    ctx.fillStyle = C.mouthFill + "60"
    ctx.fill()
    ctx.strokeStyle = C.mouthLine + "80"
    ctx.lineWidth = 0.6
    ctx.stroke()
  } else {
    const lipW = (6 + mw * 6) * F.mouthSize
    const openH = (2 + mo * 9) * F.mouthSize
    const smileH = ms * 3 * F.mouthSize

    // Clip to mouth shape
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(-lipW, 0)
    ctx.bezierCurveTo(-lipW * 0.7, -openH * 0.3, -lipW * 0.3, -openH * 0.5, 0, -openH * 0.4)
    ctx.bezierCurveTo(lipW * 0.3, -openH * 0.5, lipW * 0.7, -openH * 0.3, lipW, 0)
    ctx.bezierCurveTo(lipW * 0.6, openH + smileH, lipW * 0.2, openH * 1.2 + smileH * 0.5, 0, openH * 1.1 + smileH * 0.3)
    ctx.bezierCurveTo(-lipW * 0.2, openH * 1.2 + smileH * 0.5, -lipW * 0.6, openH + smileH, -lipW, 0)
    ctx.closePath()

    // Dark inside
    ctx.fillStyle = "#2A0A08"
    ctx.fill()
    ctx.clip()

    // Teeth
    if (mo > 0.1) {
      ctx.fillStyle = C.teeth
      ctx.beginPath()
      ctx.roundRect(-lipW * 0.75, -openH * 0.25, lipW * 1.5, openH * 0.6, 2)
      ctx.fill()
      // Teeth line
      ctx.strokeStyle = "#E0E0E0"
      ctx.lineWidth = 0.4
      for (let t = -2; t <= 2; t++) {
        ctx.beginPath()
        ctx.moveTo(t * (lipW * 0.28), -openH * 0.25)
        ctx.lineTo(t * (lipW * 0.28), openH * 0.35)
        ctx.stroke()
      }
    }

    // Tongue
    if (mo > 0.35) {
      ctx.fillStyle = C.tongue
      ctx.beginPath()
      ctx.ellipse(0, openH * 0.3, lipW * 0.45, openH * 0.35, 0, 0, Math.PI)
      ctx.fill()
    }

    ctx.restore()

    // Lip outline
    ctx.beginPath()
    ctx.moveTo(-lipW, 0)
    ctx.bezierCurveTo(-lipW * 0.7, -openH * 0.3, -lipW * 0.3, -openH * 0.5, 0, -openH * 0.4)
    ctx.bezierCurveTo(lipW * 0.3, -openH * 0.5, lipW * 0.7, -openH * 0.3, lipW, 0)
    ctx.strokeStyle = C.mouthLine
    ctx.lineWidth = 0.8
    ctx.lineCap = "round"
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(-lipW, 0)
    ctx.bezierCurveTo(-lipW * 0.6, openH + smileH, lipW * 0.6, openH + smileH, lipW, 0)
    ctx.strokeStyle = C.mouthLine + "60"
    ctx.lineWidth = 0.6
    ctx.stroke()

    // Lower lip sheen
    ctx.fillStyle = C.mouthFill + "30"
    ctx.beginPath()
    ctx.ellipse(0, openH * 0.6 + smileH * 0.3, lipW * 0.4, openH * 0.25, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()

  // ── Chin shadow ────────────────────────────────────────────────────────────
  const chinGrad = ctx.createLinearGradient(50, headCy + 20, 50, headCy + 30)
  chinGrad.addColorStop(0, "transparent")
  chinGrad.addColorStop(1, skin.shadow + "30")
  ctx.fillStyle = chinGrad
  ctx.beginPath()
  ctx.ellipse(headCx, headCy + 24, 12, 6, 0, 0, Math.PI * 2)
  ctx.fill()

  // ── Earring (female) ──────────────────────────────────────────────────────
  if (F.gender === "female" && F.hasNecklace) {
    ctx.fillStyle = C.accessoryPrimary
    ctx.beginPath()
    ctx.arc(headCx - headW + 2, headCy + 4, 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(headCx + headW - 2, headCy + 4, 2, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore() // head tilt

  // ── Jaw/neck overlap (hair back layer already drawn) ──────────────────────

  ctx.restore() // main scale
}

// ─── Hair drawing ─────────────────────────────────────────────────────────────
function drawHair(
  ctx: CanvasRenderingContext2D,
  A: AnimatorState,
  C: AvatarColors,
  F: AvatarFeatures,
  cx: number, cy: number, w: number, h: number,
  breath: number
): void {
  const hair = C.hair
  const hairHL = C.hairHighlight

  ctx.save()

  if (F.hairStyle === "medium" || F.hairStyle === "long") {
    // Base hair shape — covers top and sides
    ctx.beginPath()
    ctx.moveTo(cx - w + 2, cy + 2)
    ctx.bezierCurveTo(cx - w - 2, cy - 8, cx - w + 4, cy - h - 4, cx, cy - h - 6)
    ctx.bezierCurveTo(cx + w - 4, cy - h - 4, cx + w + 2, cy - 8, cx + w - 2, cy + 2)
    // Side hair (flowing down)
    if (F.hairStyle === "long") {
      ctx.bezierCurveTo(cx + w + 4, cy + 20 + breath, cx + w + 2, cy + 40 + breath, cx + w - 4, cy + 50 + breath)
      ctx.lineTo(cx + w - 8, cy + 50 + breath)
      ctx.bezierCurveTo(cx + w - 2, cy + 38, cx + w - 2, cy + 18, cx + w - 8, cy + 6)
    }
    ctx.closePath()
    ctx.fillStyle = hair
    ctx.fill()

    // Hair part line
    ctx.beginPath()
    ctx.moveTo(cx, cy - h - 5)
    ctx.bezierCurveTo(cx - 2, cy - h + 2, cx - 3, cy - h + 10, cx - 2, cy - h + 18)
    ctx.strokeStyle = hairHL + "40"
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Hair strands with spring physics
    ctx.strokeStyle = darkenColor(hair, 10)
    ctx.lineWidth = 0.8
    ctx.lineCap = "round"
    const strands = F.hairStyle === "long"
      ? [{ x: cx - 10, sy: cy - h + 5, ey: cy + 55, sw: A.hairSprings[0]?.value || 0 }]
      : []
    strands.forEach(s => {
      ctx.beginPath()
      ctx.moveTo(s.x, s.sy)
      ctx.bezierCurveTo(s.x + s.sw, s.sy + 15, s.x + s.sw * 0.5, s.sy + 30, s.x - s.sw * 0.3, s.ey)
      ctx.stroke()
    })

    // Highlight streak
    ctx.beginPath()
    ctx.moveTo(cx + 4, cy - h - 4)
    ctx.bezierCurveTo(cx + 6, cy - h + 6, cx + 5, cy - h + 16, cx + 2, cy - h + 22)
    ctx.strokeStyle = hairHL + "50"
    ctx.lineWidth = 2.5
    ctx.stroke()

  } else if (F.hairStyle === "bun") {
    // Base
    ctx.beginPath()
    ctx.ellipse(cx, cy - h + 2, w + 2, h * 0.6, 0, 0, Math.PI * 2)
    ctx.fillStyle = hair
    ctx.fill()
    // Bun on top
    ctx.beginPath()
    ctx.ellipse(cx + 5, cy - h - 6, 8, 7, -0.3, 0, Math.PI * 2)
    ctx.fillStyle = hair
    ctx.fill()
    ctx.strokeStyle = darkenColor(hair, 15)
    ctx.lineWidth = 0.6
    ctx.stroke()

  } else if (F.hairStyle === "fade" || F.hairStyle === "short") {
    // Short male / fade
    const gradient = ctx.createLinearGradient(cx, cy - h - 4, cx, cy - h + 10)
    gradient.addColorStop(0, darkenColor(hair, 5))
    gradient.addColorStop(1, hair)
    ctx.beginPath()
    ctx.moveTo(cx - w + 2, cy - 2)
    ctx.bezierCurveTo(cx - w, cy - 12, cx - w + 5, cy - h - 2, cx, cy - h - 4)
    ctx.bezierCurveTo(cx + w - 5, cy - h - 2, cx + w, cy - 12, cx + w - 2, cy - 2)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()

    // Fade lines (barbershop fade effect)
    for (let i = 0; i < 4; i++) {
      const lineY = cy + 2 - i * 5
      ctx.beginPath()
      ctx.moveTo(cx - w + i + 2, lineY)
      ctx.lineTo(cx - w + i + 5, lineY - 2)
      ctx.strokeStyle = darkenColor(hair, 20 - i * 3) + "40"
      ctx.lineWidth = 0.5
      ctx.stroke()
    }
  }

  ctx.restore()
}

// ─── Ear drawing ─────────────────────────────────────────────────────────────
function drawEars(
  ctx: CanvasRenderingContext2D,
  skin: { base: string; shadow: string; highlight: string; cheek: string },
  cx: number, cy: number, w: number, h: number
): void {
  for (const side of ["left", "right"] as const) {
    const ex = side === "left" ? cx - w - 1 : cx + w + 1
    const dir = side === "left" ? 1 : -1
    const ey = cy + 2

    // Ear outer
    ctx.beginPath()
    ctx.ellipse(ex, ey, 3.5, 5.5, dir * 0.15, 0, Math.PI * 2)
    ctx.fillStyle = skin.base
    ctx.fill()
    ctx.strokeStyle = skin.shadow + "60"
    ctx.lineWidth = 0.4
    ctx.stroke()

    // Inner ear
    ctx.beginPath()
    ctx.ellipse(ex + dir * 0.5, ey, 2, 3.5, dir * 0.2, 0, Math.PI * 2)
    ctx.fillStyle = skin.shadow + "40"
    ctx.fill()
  }
}

// ─── Color helpers ────────────────────────────────────────────────────────────
function adjustColor(hex: string, amount: number): string {
  return amount > 0 ? lightenColor(hex, amount) : darkenColor(hex, -amount)
}

function lightenColor(hex: string, amount: number): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgb(${Math.min(255, r + amount)},${Math.min(255, g + amount)},${Math.min(255, b + amount)})`
  } catch { return hex }
}

function darkenColor(hex: string, amount: number): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgb(${Math.max(0, r - amount)},${Math.max(0, g - amount)},${Math.max(0, b - amount)})`
  } catch { return hex }
}
