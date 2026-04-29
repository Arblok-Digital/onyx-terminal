import { useState } from "react";
import Panel from "@/ui/Panel";
import WhaleAlert from "./WhaleAlert";
import MoneyFlow from "./MoneyFlow";
import styles from "./FlowMonitor.module.css";

/**
 * @file FlowMonitor.tsx
 * @desc Main container for Whale Alerts and Money Flow monitoring.
 */
export default function FlowMonitor() {
  const [activeTab, setActiveTab] = useState<"whale" | "flow">("whale");

  return (
    <Panel id="flow-monitor" title="FLOW MONITOR">
      <div className={styles.container}>
        {/* Tab Switcher */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tabBtn} ${activeTab === "whale" ? styles.active : ""}`}
            onClick={() => setActiveTab("whale")}
          >
            <span className={styles.tabIcon}>🐋</span>
            WHALE ALERT
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === "flow" ? styles.active : ""}`}
            onClick={() => setActiveTab("flow")}
          >
            <span className={styles.tabIcon}>📊</span>
            MONEY FLOW
          </button>
        </div>

        {/* Content Area */}
        <div className={styles.content}>
          {activeTab === "whale" ? <WhaleAlert /> : <MoneyFlow />}
        </div>

        {/* Footer Stats (Mini) */}
        <div className={styles.footer}>
          <div className={styles.status}>
            <span className={styles.dot} />
            LIVE FEED: {activeTab === "whale" ? "HELIUS WS" : "DEXSCREENER"}
          </div>
          <div className={styles.latency}>
            {activeTab === "whale" ? "THRESHOLD: >$100 (REAL-TIME)" : "WINDOW: 5M / REFRESH: 5M"}
          </div>
        </div>
      </div>
    </Panel>
  );
}