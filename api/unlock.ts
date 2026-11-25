import type { VercelRequest, VercelResponse } from '@vercel/node'
import { checkPassword } from './_auth.js'

// Vercel pre-parses the body; the dev middleware gives a raw stream.
async function readBody(req: VercelRequest): Promise<{ password?: unknown }> {
  let body: unknown
  try {
    body = req.body // Vercel's getter throws on malformed JSON
  } catch {
    return {}
  }
  if (body !== undefined) {
    if (typeof body === 'string') {
      try {
        return JSON.parse(body)
      } catch {
        return {}
      }
    }
    return (body as { password?: unknown }) ?? {}
  }
  const chunks: Buffer[] = []
  for await (const c of req as unknown as AsyncIterable<Buffer>) chunks.push(Buffer.from(c))
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    return {}
  }
}

// Checks the site password. The real password stays on the server.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = await readBody(req)
  const result = checkPassword(body?.password)
  if (result === 'unset') {
    return res.status(500).json({ error: 'Server misconfigured: SITE_PASSWORD not set' })
  }
  if (result === 'wrong') {
    return res.status(401).json({ error: 'Wrong password' })
  }
  return res.status(200).json({ ok: true })
}
