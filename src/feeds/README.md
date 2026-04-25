# feeds/

Data layer. **Satu file per sumber API.** Setiap feed:

1. Fetch / subscribe ke endpoint eksternal.
2. Normalize ke shape standar (TokenSnapshot, dll).
3. Push ke `core/store/`.

**Aturan keras:**
- Tidak boleh import dari `panels/`, `hooks/`, atau `ui/`.
- Tidak boleh punya business logic — itu tugasnya `panels/*.engine.js`.
- Wajib pakai `rate-limiter.scheduleRequest` untuk semua HTTP call.

Sumber per fitur lihat `ARCHITECTURE.md` section 5.
