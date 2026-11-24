// Letters only, without I and O (easy to confuse with 1 and 0).
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const STORAGE_KEY = 'transmitCode'

export function generateCode(): string {
  // crypto randomness instead of Math.random. 24^4 ≈ 330k possible codes.
  const bytes = crypto.getRandomValues(new Uint32Array(4))
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}

// Keep the same code across refreshes of the transmitter page (same tab only).
export function getTransmitCode(): string {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved) return saved
  } catch {
    // storage unavailable: fall through and make a new code
  }
  return newTransmitCode()
}

// Make and save a fresh code (the "New code" button).
export function newTransmitCode(): string {
  const code = generateCode()
  try {
    sessionStorage.setItem(STORAGE_KEY, code)
  } catch {
    // ignore
  }
  return code
}

export function normalizeCode(s: string): string {
  return s.toUpperCase().trim().replace(/[^A-Z]/g, '')
}
