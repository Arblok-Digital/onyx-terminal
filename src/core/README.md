# core/

Otak aplikasi. **Tidak boleh** ada UI di sini.

- `store/` — Zustand slices, single source of truth untuk state global.
- `event-bus.ts` — pub/sub antar panel pakai mitt. Cross-panel comms only.
- `rate-limiter.ts` — antrian polling per-host biar gak kena rate-limit API.
- `ws-manager.ts` — pool WebSocket + auto-reconnect (Phase 2+).

Dependencies allowed: `utils/` only. Tidak boleh import dari `feeds/`, `hooks/`, `panels/`, atau `ui/`.
