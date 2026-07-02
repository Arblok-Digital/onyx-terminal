/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'
import { CONFIG } from './config'

/**
 * Inisialisasi Supabase Client
 * Memastikan aplikasi tidak crash jika env vars belum terbaca di Vercel.
 * 
 * When env vars are missing, a placeholder client is created but all
 * Supabase operations are short-circuited via supabaseConfigured flag.
 */
const rawUrl = CONFIG.SUPABASE_URL?.trim();
const rawKey = CONFIG.SUPABASE_ANON_KEY?.trim();

/**
 * Flag: true only if real Supabase credentials are provided.
 * Components should check this before making Supabase calls
 * to avoid network errors from placeholder URLs.
 */
export const supabaseConfigured = !!(rawUrl && rawKey && !rawUrl.includes('placeholder'));

// Bersihkan URL: hapus trailing slash atau path rest/v1 jika ada
const cleanUrl = rawUrl
  ? rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
  : 'https://placeholder-project.supabase.co';

const cleanKey = rawKey || 'placeholder-key';

if (!supabaseConfigured) {
  console.warn(
    "⚠️ Supabase: VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY tidak ditemukan. " +
    "Analytics and Supabase features are disabled. Cek Environment Variables di Vercel."
  );
}

export const supabase = createClient(cleanUrl, cleanKey);