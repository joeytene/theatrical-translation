import type { ServerResponse } from 'node:http'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

// `npm run dev` only runs Vite, not Vercel's api/ functions.
// This runs api/session.ts and api/unlock.ts locally so they work in dev too.
function devApi(): Plugin {
  return {
    name: 'dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res, next) => {
        const name = (req.url ?? '').split('?')[0].replace(/^\//, '')
        if (name !== 'session' && name !== 'unlock') return next()
        const mod = await server.ssrLoadModule(`/api/${name}.ts`)
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
  const env = loadEnv(mode, process.cwd(), '')
  process.env.OPENAI_API_KEY ??= env.OPENAI_API_KEY
  process.env.SITE_PASSWORD ??= env.SITE_PASSWORD
  return { plugins: [react(), devApi()] }
})
