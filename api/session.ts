import type { VercelRequest, VercelResponse } from '@vercel/node'
import { checkPassword } from './_auth.js'

// Asks OpenAI for a short-lived token the browser can use.
// The real OpenAI key never leaves the server.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = checkPassword(req.headers['x-site-password'])
  if (auth === 'unset') {
    return res.status(500).json({ error: 'Server misconfigured: SITE_PASSWORD not set' })
  }
  if (auth === 'wrong') {
    return res.status(401).json({ error: 'Wrong password' })
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return res.status(500).json({ error: 'Server misconfigured: OPENAI_API_KEY not set' })
    }

    // Ask OpenAI for an ephemeral client secret for German -> English translation.
    const r = await fetch('https://api.openai.com/v1/realtime/translations/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: {
          model: 'gpt-realtime-translate',
          audio: {
            input: { noise_reduction: { type: 'far_field' } },
            output: { language: 'en' },
          },
        },
      }),
    })

    const text = await r.text()
    let parsed: unknown = text
    try {
      parsed = JSON.parse(text)
    } catch {
      // not JSON, keep the raw text
    }

    if (!r.ok) {
      return res.status(r.status).json({ error: 'OpenAI error', detail: parsed })
    }

    const data = parsed as { value: string; expires_at?: number }
    return res.status(200).json({ value: data.value, expires_at: data.expires_at ?? null })
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' })
  }
}
