/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'
import { CONFIG } from './config'

/**
 * Inisialisasi Supabase Client
 * Memastikan aplikasi tidak crash jika env vars belum terbaca di Vercel.
 */
const rawUrl = CONFIG.SUPABASE_URL?.trim();
const rawKey = CONFIG.SUPABASE_ANON_KEY?.trim();

// Bersihkan URL: hapus trailing slash atau path rest/v1 jika ada
const cleanUrl = rawUrl 
  ? rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '') 
  : 'https://placeholder-project.supabase.co';

const cleanKey = rawKey || 'placeholder-key';

if (!rawUrl || !rawKey) {
  console.warn("⚠️ Supabase: VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY tidak ditemukan. Cek Environment Variables di Vercel.");
}

export const supabase = createClient(cleanUrl, cleanKey);