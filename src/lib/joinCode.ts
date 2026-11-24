// Letters only, without I and O (easy to confuse with 1 and 0).
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'

export function generateCode(): string {
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return code
}

// Keep the same code across refreshes of the transmitter page.
export function getTransmitCode(): string {
  try {
    const saved = sessionStorage.getItem('transmitCode')
    if (saved) return saved
  } catch {
    // storage unavailable: fall through and make a new code
  }
  const code = generateCode()
  try {
    sessionStorage.setItem('transmitCode', code)
  } catch {
    // ignore
  }
  return code
}

export function normalizeCode(s: string): string {
  return s.toUpperCase().trim().replace(/[^A-Z]/g, '')
}
