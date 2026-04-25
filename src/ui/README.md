# ui/

Layout primitives & app chrome. Pure presentation, but boleh consume hooks.

- `Terminal.tsx` — root layout: Ticker + Grid + StatusBar. Bootstraps subscriptions.
- `Panel.tsx` — generic panel chrome (header + body), drag handle.
- `Ticker.tsx` — top horizontal bar: SOL + top movers.
- `StatusBar.tsx` — bottom 24px bar: chain selector, connection, latency, clock.

Tidak ada business logic. Tidak ada fetch. Tidak ada API.
