import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (typeof supabaseUrl !== 'string' || supabaseUrl.length === 0) {
  throw new Error('Supabase environment variable VITE_SUPABASE_URL is missing')
}

if (typeof supabaseAnonKey !== 'string' || supabaseAnonKey.length === 0) {
  throw new Error('Supabase environment variable VITE_SUPABASE_ANON_KEY is missing')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
