import { timingSafeEqual } from 'node:crypto'

// Constant-time compare; a length mismatch is a fail.
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

// Checks a candidate against SITE_PASSWORD.
export function checkPassword(candidate: unknown): 'ok' | 'wrong' | 'unset' {
  const expected = process.env.SITE_PASSWORD
  if (!expected) return 'unset'
  return typeof candidate === 'string' && safeEqual(candidate, expected) ? 'ok' : 'wrong'
}
