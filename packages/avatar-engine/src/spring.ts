// ─────────────────────────────────────────────────────────────────────────────
// Spring Physics Engine
// Natural organic animation using damped harmonic oscillators
// ─────────────────────────────────────────────────────────────────────────────

export interface Spring {
  value: number
  target: number
  velocity: number
  stiffness: number
  damping: number
}

export function createSpring(value: number, stiffness = 120, damping = 0.92): Spring {
  return { value, target: value, velocity: 0, stiffness, damping }
}

export function stepSpring(s: Spring, dt: number): void {
  const force = (s.target - s.value) * s.stiffness
  s.velocity = (s.velocity + force * dt) * s.damping
  s.value += s.velocity * dt
}

export function stepAllSprings(springs: Record<string, Spring>, dt: number): void {
  for (const key in springs) {
    stepSpring(springs[key], dt)
  }
}

export function springAt(s: Spring): number {
  return s.value
}

export function setSpringTarget(s: Spring, target: number): void {
  s.target = target
}
