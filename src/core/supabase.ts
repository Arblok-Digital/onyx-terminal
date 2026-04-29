/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Waduh bro, URL atau Key Supabase belum diisi di file .env!")
}

// Bersihkan URL jika user tidak sengaja memasukkan path /rest/v1 atau slash di akhir
if (supabaseUrl) {
  supabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)