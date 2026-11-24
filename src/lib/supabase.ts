import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
// Supabase now calls this the "publishable" key; older projects call it "anon". Accept either.
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as
  | string
  | undefined

// null if the env vars are missing, so the app shows a message instead of crashing.
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null

export const supabaseConfigError: string | null = supabase
  ? null
  : 'Supabase not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (in .env locally, then restart npm run dev; in Vercel, then redeploy)'
