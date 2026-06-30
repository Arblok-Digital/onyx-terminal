import { supabase, supabaseConfigured } from '@/core/supabase';

/**
 * Onyx Terminal Analytics Engine
 * Mengirimkan data aktivitas terminal ke Supabase untuk sinkronisasi cloud.
 *
 * NOTE: Semua operasi Supabase di-skip jika credentials belum dikonfigurasi
 * (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY kosong atau placeholder).
 */

/**
 * Diagnostik koneksi Supabase
 */
export const debugSupabase = async () => {
  if (!supabaseConfigured) {
    console.warn("[Analytics] Supabase belum dikonfigurasi. Skipping debug.");
    return false;
  }
  console.log("[Analytics] Mencoba koneksi ke Supabase...");
  try {
    const { data, error } = await supabase.from('user_events').select('count', { count: 'exact', head: true });
    if (error) {
      console.error("[Analytics] Koneksi Gagal! Pesan:", error.message || error);
      return false;
    }
    console.log("[Analytics] Koneksi Supabase Aman! Database merespon.");
    return true;
  } catch (err: any) {
    console.error("[Analytics] Koneksi exception:", err?.message || err);
    return false;
  }
};

export const trackUserEvent = async (eventName: string, metadata: any = {}) => {
  if (!supabaseConfigured) return; // No-op: Supabase not configured
  try {
    const { error } = await supabase
      .from('user_events')
      .insert([{ event_name: eventName, metadata }]);
    if (error) throw error;
  } catch (err: any) {
    console.error('[Analytics] UserEvent Error:', err.message || err);
  }
};

export const trackSwap = async (tokenIn: string, tokenOut: string, amountIn: number) => {
  if (!supabaseConfigured) return; // No-op: Supabase not configured
  try {
    const { error } = await supabase
      .from('swap_events')
      .insert([{ token_in: tokenIn, token_out: tokenOut, amount_in: amountIn }]);
    if (error) throw error;
  } catch (err: any) {
    console.error('[Analytics] SwapEvent Error:', err.message || err);
  }
};

export const trackSignal = async (type: string, symbol: string) => {
  if (!supabaseConfigured) return; // No-op: Supabase not configured
  try {
    const { error } = await supabase
      .from('signal_logs')
      .insert([{
        signal_type: type,
        token_symbol: symbol
      }]);
    if (error) throw error;
  } catch (err: any) {
    console.error('[Analytics] SignalLog Error:', err.message || err);
  }
};

export const trackWhale = async (address: string, action: string, metadata: any = {}) => {
  if (!supabaseConfigured) return; // No-op: Supabase not configured
  try {
    const { error } = await supabase
      .from('whale_logs')
      .insert([{
        whale_address: address,
        action_type: action,
        metadata: metadata
      }]);
    if (error) throw error;
  } catch (err: any) {
    console.error('[Analytics] WhaleLog Error:', err.message || err);
  }
};

// Auto-check koneksi saat development biar langsung ketauan hasilnya
if (import.meta.env.DEV && supabaseConfigured) {
  debugSupabase();
}