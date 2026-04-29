-- 1. Tabel untuk tracking aktivitas user (MoneyFlow clicks, etc)
-- CLEANUP: Hapus tabel lama jika ada agar tidak bentrok kolomnya
DROP TABLE IF EXISTS whale_logs;
DROP TABLE IF EXISTS signal_logs;
DROP TABLE IF EXISTS swap_events;
DROP TABLE IF EXISTS user_events;

-- 1. Tabel user_events (Klik-klik di UI)
-- Match analytics.ts: trackUserEvent(eventName, metadata)
CREATE TABLE user_events (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    event_name TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Tabel swap_events (Tracking trade user)
-- Match analytics.ts: trackSwap(tokenIn, tokenOut, amountIn)
CREATE TABLE swap_events (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    token_in TEXT NOT NULL,
    token_out TEXT NOT NULL,
    amount_in NUMERIC NOT NULL
);

-- 3. Tabel signal_logs (AI Detection / Whale Alerts)
-- Match analytics.ts: trackSignal(type, symbol) -> { signal_type: type, token_symbol: symbol }
CREATE TABLE signal_logs (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    signal_type TEXT NOT NULL,
    token_symbol TEXT NOT NULL
);

-- 4. Tabel whale_logs (Pergerakan wallet gede)
-- Match analytics.ts: trackWhale(address, action, metadata) -> { whale_address: address, action_type: action, metadata }
CREATE TABLE whale_logs (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    whale_address TEXT NOT NULL,
    action_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 5. DISABLE RLS: Biar kita bisa nulis data tanpa ribet login/auth dulu (Development Mode)
ALTER TABLE user_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE swap_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE signal_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE whale_logs DISABLE ROW LEVEL SECURITY;

-- 6. INDEXING: Biar kalau datanya sudah ribuan, terminal tetap kenceng nariknya
CREATE INDEX idx_user_event_name ON user_events(event_name);
CREATE INDEX idx_whale_addr ON whale_logs(whale_address);
CREATE INDEX idx_signal_sym ON signal_logs(token_symbol);