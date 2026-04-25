# panels/watchlist/

Daftar token yang dipantau user. Add/remove + sort by % change.

- `watchlist.store.ts` — daftar address (persisted localStorage).
- `Watchlist.tsx` — panel wrapper, header, sort, render rows.
- `WatchlistRow.tsx` — satu baris: symbol, price, %1h, %24h, vol.

Click row → emit `bus("token:select")` → Chart panel switch.
