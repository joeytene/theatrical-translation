import type { ServerResponse } from 'node:http'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

// `npm run dev` only runs Vite, not Vercel's api/ functions.
// This runs api/session.ts locally so Start (live mic) works in dev too.
function devApi(): Plugin {
  return {
    name: 'dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/session', async (req, res) => {
        const mod = await server.ssrLoadModule('/api/session.ts')
        // Add the two Vercel helpers the handler uses: res.status() and res.json().
        const vres = res as ServerResponse & { status: (c: number) => typeof vres; json: (b: unknown) => typeof vres }
        vres.status = (c) => {
          res.statusCode = c
          return vres
        }
        vres.json = (b) => {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(b))
          return vres
        }
        await mod.default(req, vres)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Give the local api handler the server-only key from .env.
  process.env.OPENAI_API_KEY ??= loadEnv(mode, process.cwd(), '').OPENAI_API_KEY
  return { plugins: [react(), devApi()] }
})
