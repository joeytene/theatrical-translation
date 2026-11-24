import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// null if the env vars are missing, so the app shows a message instead of crashing.
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null

export const supabaseConfigError: string | null = supabase
  ? null
  : 'Supabase not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel and redeploy'
