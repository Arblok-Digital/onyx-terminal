import React, { useEffect, useState, useMemo } from 'react';
import Panel from '@/ui/Panel';
import { fetchPolymarketData, PolyMarket } from '@/feeds/polymarket';
import { trackUserEvent } from '@/core/analytics';
import { formatCompact } from '@/utils/format';
import styles from './Predict.module.css';

type FilterTab = 'ALL' | 'CRYPTO' | 'SOLANA' | 'POLITICS';

export default function Predict() {
  const [markets, setMarkets] = useState<PolyMarket[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trackUserEvent('predict_open');
    const load = async () => {
      const data = await fetchPolymarketData();
      setMarkets(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab);
    trackUserEvent('filter_change', { tab });
  };

  const filteredMarkets = useMemo(() => {
    if (!markets) return [];
    if (activeTab === 'ALL') return markets;
    return markets.filter(m => {
      const cat = (m.category || '').toUpperCase();
      const ques = (m.question || '').toUpperCase();
      if (activeTab === 'CRYPTO') return cat.includes('CRYPTO') || cat.includes('BITCOIN');
      if (activeTab === 'SOLANA') return ques.includes('SOLANA') || ques.includes('SOL');
      if (activeTab === 'POLITICS') return cat.includes('POLITICS') || cat.includes('ELECTION');
      return true;
    });
  }, [markets, activeTab]);

  return (
    <Panel id="predict" title="PREDICTION MARKET">
      <div className={styles.container}>
        <div className={styles.tabs}>
          {(['ALL', 'CRYPTO', 'SOLANA', 'POLITICS'] as FilterTab[]).map(tab => (
            <button 
              key={tab}
              className={`${styles.tabBtn} ${activeTab === tab ? styles.active : ''}`}
              onClick={() => handleTabChange(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className={styles.list}>
          {loading ? (
            <div className={styles.loading}>Syncing Polymarket Odds...</div>
          ) : (
            filteredMarkets.map(m => (
              <div 
                key={m.id} 
                className={styles.card}
                onClick={() => trackUserEvent('market_click', { id: m.id, question: m.question })}
              >
                <div className={styles.cardHeader}>
                  <span className={styles.category}>{m.category}</span>
                  <span className={styles.volume}>{formatCompact(m.volume)} vol</span>
                </div>
                <div className={styles.question}>{m.question}</div>
                
                <div className={styles.oddsBox}>
                  <div className={styles.barTrack}>
                    <div 
                      className={styles.barFill} 
                      style={{ width: `${m.probability}%` }} 
                    />
                  </div>
                  <div className={styles.stats}>
                    <span className={styles.yes}>YES {m.probability}%</span>
                    <span className={styles.no}>NO {100 - m.probability}%</span>
                  </div>
                </div>

                <button 
                  className={styles.tradeBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    trackUserEvent('trade_click', { id: m.id, url: `https://polymarket.com/event/${m.slug}` });
                    window.open(`https://polymarket.com/event/${m.slug}`, '_blank');
                  }}
                >
                  TRADE ON POLYMARKET ↗
                </button>
              </div>
            ))
          )}
          {!loading && filteredMarkets.length === 0 && (
            <div className={styles.empty}>No active markets in this category.</div>
          )}
        </div>
      </div>
    </Panel>
  );
}