import { useNavigate } from "react-router-dom";
import styles from "./LandingPage.module.css";

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const width = 200;
  const height = 40;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((d - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className={styles.sparkline}
    >
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
    </svg>
  );
}

function MiniCandles({ data }: { data: { o: number; h: number; l: number; c: number }[] }) {
  const width = 200;
  const height = 40;
  const prices = data.flatMap((d) => [d.h, d.l]);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const barWidth = width / data.length - 2;

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className={styles.sparkline}
    >
      {data.map((d, i) => {
        const x = i * (width / data.length) + barWidth / 2;
        const yHigh = height - ((d.h - min) / range) * height;
        const yLow = height - ((d.l - min) / range) * height;
        const yOpen = height - ((d.o - min) / range) * height;
        const yClose = height - ((d.c - min) / range) * height;
        const isUp = d.c >= d.o;
        const color = isUp ? "var(--green)" : "var(--red)";

        return (
          <g key={i}>
            <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="1" />
            <rect
              x={x - barWidth / 2}
              y={Math.min(yOpen, yClose)}
              width={barWidth}
              height={Math.max(1, Math.abs(yOpen - yClose))}
              fill={color}
            />
          </g>
        );
      })}
    </svg>
  );
}

const watchlistRows = [
  { symbol: "SOL/USDC", price: "$174.21", change: "+1.24%", state: "up" },
  { symbol: "JUP/USDC", price: "$0.8921", change: "-0.76%", state: "down" },
  { symbol: "WIF/USDC", price: "$1.4500", change: "+15.72%", state: "up" },
];

const chartCandles = [
  { o: 170.5, h: 173.2, l: 169.8, c: 172.1 },
  { o: 172.1, h: 174.5, l: 171.0, c: 173.5 },
  { o: 173.5, h: 175.0, l: 172.3, c: 174.2 },
  { o: 174.2, h: 175.8, l: 173.5, c: 173.9 },
  { o: 173.9, h: 176.4, l: 173.2, c: 175.6 },
  { o: 175.6, h: 177.1, l: 174.5, c: 176.8 },
  { o: 176.8, h: 177.9, l: 175.8, c: 177.2 },
  { o: 177.2, h: 178.3, l: 176.5, c: 177.5 },
  { o: 177.5, h: 179.0, l: 176.9, c: 178.4 },
  { o: 178.4, h: 179.8, l: 177.2, c: 178.9 },
];

const panels = [
  {
    id: "watchlist",
    name: "Watchlist",
    tag: "Market",
    body: (
      <table className={styles.miniTable}>
        <thead>
          <tr>
            <th>Pair</th>
            <th>Price</th>
            <th>24h</th>
          </tr>
        </thead>
        <tbody>
          {watchlistRows.map((row) => (
            <tr key={row.symbol}>
              <td>{row.symbol}</td>
              <td>{row.price}</td>
              <td className={row.state === "up" ? styles.up : styles.down}>
                {row.change}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    ),
  },
  {
    id: "chart",
    name: "Chart",
    tag: "Technical",
    body: (
      <div className={styles.chartPreview}>
        <div className={styles.chartMeta}>
          <span className={styles.chartPair}>SOL/USDC</span>
          <span className={styles.up}>+$4.28 (+2.52%)</span>
        </div>
        <MiniCandles data={chartCandles} />
        <div className={styles.chartTicks}>
          <span>O 170.50</span>
          <span>H 179.80</span>
          <span>L 169.80</span>
          <span>C 178.90</span>
        </div>
      </div>
    ),
  },
  {
    id: "swap",
    name: "Swap",
    tag: "Execution",
    body: (
      <div className={styles.swapPreview}>
        <div className={styles.swapRow}>
          <span className={styles.swapAmount}>0.500</span>
          <span className={styles.swapToken}>SOL</span>
          <span className={styles.swapArrow}>→</span>
          <span className={styles.swapAmount}>87.10</span>
          <span className={styles.swapToken}>USDC</span>
        </div>
        <div className={styles.swapMeta}>
          <span>slippage 0.42%</span>
          <span>route Jupiter v6</span>
          <span className={styles.up}>+0.12% vs mid</span>
        </div>
      </div>
    ),
  },
  {
    id: "info",
    name: "Token Info",
    tag: "Fundamentals",
    body: (
      <div className={styles.infoPreview}>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Market Cap</span>
          <span className={styles.infoValue}>$2.54B</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Liquidity</span>
          <span className={styles.infoValue}>$420.5K</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Holders</span>
          <span className={styles.infoValue}>12,438</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Top10% Hold</span>
          <span className={styles.down}>38.2%</span>
        </div>
      </div>
    ),
  },
  {
    id: "flow-monitor",
    name: "Flow Monitor",
    tag: "On-chain",
    body: (
      <div className={styles.flowPreview}>
        <div className={styles.flowAlert}>
          <span className={styles.flowBadge}>WHALE</span>
          <span className={styles.up}>+50,000 SOL</span>
          <span className={styles.flowTime}>2m ago</span>
        </div>
        <div className={styles.flowAlert}>
          <span className={styles.flowBadge}>SMART</span>
          <span className={styles.up}>BUY $WIF · $42K</span>
          <span className={styles.flowTime}>5m ago</span>
        </div>
        <div className={styles.flowAlert}>
          <span className={styles.flowBadge}>ALERT</span>
          <span className={styles.down}>SELL $BONK · $18K</span>
          <span className={styles.flowTime}>8m ago</span>
        </div>
      </div>
    ),
  },
  {
    id: "discover",
    name: "Discover",
    tag: "Alpha",
    body: (
      <div className={styles.discoverPreview}>
        <div className={styles.discoverRow}>
          <span className={styles.discoverToken}>$WIF</span>
          <span className={styles.discoverPrice}>$1.4500</span>
          <span className={styles.up}>+15.72%</span>
        </div>
        <div className={styles.discoverRow}>
          <span className={styles.discoverToken}>$JUP</span>
          <span className={styles.discoverPrice}>$0.8921</span>
          <span className={styles.down}>-0.76%</span>
        </div>
        <div className={styles.discoverRow}>
          <span className={styles.discoverToken}>$BONK</span>
          <span className={styles.discoverPrice}>$0.000024</span>
          <span className={styles.up}>+3.12%</span>
        </div>
      </div>
    ),
  },
];

const specs = [
  { key: "Chains", value: "Solana (more soon)" },
  { key: "Price feed", value: "DexScreener live" },
  { key: "Swap routing", value: "Jupiter v6" },
  { key: "Wallet", value: "Solana wallet adapter" },
  { key: "Analysis agents", value: "7-agent council" },
  { key: "Layout", value: "Draggable Bloomberg grid" },
];

const feeds = [
  { label: "SOL/USDC", price: "$174.21", change: "+1.24%", state: "up" },
  { label: "JUP/USDC", price: "$0.8921", change: "-0.76%", state: "down" },
  { label: "WIF/USDC", price: "$1.4500", change: "+15.72%", state: "up" },
  { label: "BONK/USDC", price: "$0.000024", change: "+3.12%", state: "up" },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.landing}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandDot} />
          Onyx Terminal
        </div>
        <button
          className={styles.launchBtn}
          onClick={() => navigate("/terminal")}
          type="button"
        >
          Launch Terminal
        </button>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
        <div className={styles.contentWrap}>
          <div className={styles.heroTop}>
            <div>
              <h1 className={styles.heroTitle}>Solana intelligence terminal.</h1>
              <p className={styles.heroTagline}>
                Real-time price, on-chain flow, and 7-agent token verdicts in
                one dense workspace.
              </p>
            </div>
            <div className={styles.heroMeta}>
              <span className={styles.statusIndicator}>Live</span>
              <span>v1.0.0</span>
              <span>SOL Mainnet</span>
            </div>
          </div>
        </div>
        </section>

        <section className={styles.section}>
          <div className={styles.contentWrap}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Live Tape</h2>
          </div>
          <div className={styles.quote}>
            {feeds.map((f) => (
              <div key={f.label}>
                <span className={styles.quoteLabel}>{f.label}</span>
                <span
                  className={`${styles.quoteValue} ${
                    f.state === "up" ? styles.up : styles.down
                  }`}
                >
                  {f.price} {f.change}
                </span>
              </div>
            ))}
          </div>
        </div>
        </section>

        {/* WHY ONYX — Narrative / sales, distinct from SPECIFICATIONS */}
        <section className={styles.section}>
          <div className={styles.contentWrap}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Why Onyx</h2>
          </div>
          <div className={styles.howGrid}>
            <div className={styles.howCard}>
              <span className={styles.howLabel}>SPEED</span>
              <strong className={styles.howHeadline}>Stop context switching</strong>
              <p className={styles.howDesc}>Price, swaps, holders, and whale flow — all live in one grid. Six tabs reduced to one workspace.</p>
            </div>
            <div className={styles.howCard}>
              <span className={styles.howLabel}>COVERAGE</span>
              <strong className={styles.howHeadline}>See the full picture</strong>
              <p className={styles.howDesc}>Price without liquidity is noise. Flow without holders is guesswork. Onyx connects every angle before you trade.</p>
            </div>
            <div className={styles.howCard}>
              <span className={styles.howLabel}>TRUST</span>
              <strong className={styles.howHeadline}>Trade with conviction</strong>
              <p className={styles.howDesc}>Seven AI agents cross-verify every signal — narrative, on-chain, technical — distilling a clear verdict before you trade.</p>
            </div>
          </div>
          <div className={styles.trustMarker}>Open-source · non-custodial · live on Solana mainnet · built for serious traders</div>
        </div>
        </section>

        <section className={styles.section}>
          <div className={styles.contentWrap}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Modules</h2>
          </div>
          <div className={styles.panelGrid}>
            {panels.map((panel) => (
              <article key={panel.id} className={styles.panelCard}>
                <div className={styles.panelHeader}>
                  <span className={styles.panelTag}>{panel.tag}</span>
                  <span className={styles.panelName}>{panel.name}</span>
                </div>
                {panel.body}
              </article>
            ))}
          </div>
        </div>
        </section>

        <section className={styles.section}>
          <div className={styles.contentWrap}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Specifications</h2>
          </div>
          <p className={styles.specIntro}>Built on the same infrastructure used by professional traders — raw mainnet WebSocket feeds, multi-RPC fallback, and Jupiter v6 aggregation for best-price execution.</p>
          <div className={styles.specGrid}>
            {specs.map((spec) => (
              <div key={spec.key} className={styles.specCell}>
                <div className={styles.specKey}>{spec.key}</div>
                <div className={styles.specValue}>{spec.value}</div>
              </div>
            ))}
          </div>
        </div>
        </section>

        {/* BUILT ON — Technology Stack */}
        <section className={styles.section}>
          <div className={styles.contentWrap}>
          <div className={styles.builtOnRow}>
            <span className={styles.builtOnLabel}>BUILT ON</span>
            <span className={styles.builtOnSep}>◈</span>
            <span className={styles.builtOnItem}>Solana Mainnet</span>
            <span className={styles.builtOnSep}>◈</span>
            <span className={styles.builtOnItem}>Jupiter v6</span>
            <span className={styles.builtOnSep}>◈</span>
            <span className={styles.builtOnItem}>DexScreener WebSocket</span>
            <span className={styles.builtOnSep}>◈</span>
            <span className={styles.builtOnItem}>Helius RPC</span>
          </div>
        </div>
        </section>

        <footer className={styles.footer}>
          <div className={styles.contentWrap}>
          <div className={styles.footerBrand}>
            <span className={styles.logo}>◈</span>
            <strong>ONYX TERMINAL</strong>
            <span className={styles.footerDivider}>—</span>
            <span>Solana Intelligence Terminal</span>
            <span className={styles.footerDivider}>—</span>
            <span>v0.1.0</span>
            <span className={styles.footerDivider}>—</span>
            <span>MIT</span>
          </div>
          <div className={styles.footerLinks}>
            <a href="https://github.com/onyx-terminal" target="_blank" rel="noopener noreferrer">GitHub</a>
            <span className={styles.footerSep}>•</span>
            <a href="/terminal">Launch App</a>
            <span className={styles.footerSep}>•</span>
            <a href="https://solana.com" target="_blank" rel="noopener noreferrer">Solana</a>
            <span className={styles.footerSep}>•</span>
            <a href="#">Docs</a>
          </div>
          <p className={styles.footerCopy}>© 2025 Onyx Terminal &nbsp;|&nbsp; Open-source &nbsp;|&nbsp; Live on Mainnet since Q4 2025</p>
        </div>
        </footer>
      </main>
    </div>
  );
}
