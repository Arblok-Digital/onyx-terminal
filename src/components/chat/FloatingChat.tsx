/**
 * @file FloatingChat.tsx
 * @layer component
 * @desc AI Chat Assistant for Onyx Terminal — conversational interface to AMD Intelligence.
 *       User asks in natural language → intent routed → analyzeToken() → formatted answer.
 * @exposes FloatingChat
 * @deps intelligent_integration (analyzeToken), core/store/ui.store, OnyxChat.module.css
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useUIStore } from "@/core/store/ui.store";
import styles from "./OnyxChat.module.css";
import { analyzeToken, IntelligenceReport } from "@intelligent_integration";
import { getDashboardContext, getDashboardDataWithIntelligence, DashboardData, formatDashboardContext } from "@/services/dashboardDataService";

/* ------------------------------------------------------------------ */
/* Enhanced Report Formatter — combines raw analysis + dashboard data */
/* ------------------------------------------------------------------ */

function formatAnalysisReport(
    report: IntelligenceReport,
    dashboardData?: DashboardData
): string {
    if (!report || report.summary?.startsWith("Analysis failed")) {
        return `❌ **Analisis Gagal**\nSaya tidak dapat mengambil laporan intelijen lengkap untuk ${report.tokenSymbol}. Ini mungkin masalah sementara dengan salah satu sumber data.`;
    }

    const {
        summary,
        recommendations,
        onchainAnalysis,
        marketAnalysis,
        narrativeAnalysis,
        smartMoneyAnalysis,
        survivalAnalysis,
        opportunityAnalysis,
    } = report;

    const riskScore = (onchainAnalysis?.riskScore ?? 0);
    const narrativeScore = (narrativeAnalysis?.narrativeScore ?? 0);
    const smartMoneyScore = (smartMoneyAnalysis?.smartMoneyScore ?? 0);
    const survivalScore = (survivalAnalysis?.survivalScore ?? 0);
    const opportunityScore = (opportunityAnalysis?.opportunityScore ?? 0);

    const lines: string[] = [];

    // -- Header --
    lines.push(`✅ **Analisis AMD Intelijen — ${report.tokenSymbol}**`);
    lines.push("");

    // -- Executive Summary (from dashboard intelligence) --
    if (dashboardData?.intelligence?.executiveSummary) {
        lines.push(`📋 **Executive Summary:**`);
        lines.push(dashboardData.intelligence.executiveSummary);
        lines.push("");
    }

    // -- Ringkasan (from raw report) --
    lines.push(`**Ringkasan Intelijen:**`);
    lines.push(summary ?? 'Tidak ada ringkasan.');
    lines.push("");

    // -- Score Dashboard --
    lines.push("--- **SCOREBOARD** ---");
    if (dashboardData?.intelligence) {
        const intel = dashboardData.intelligence;
        lines.push(`🎯 **Rekomendasi:** ${intel.recommendation || "N/A"}`);
        lines.push(`📊 **Confidence:** ${intel.confidenceScore ? (intel.confidenceScore * 100).toFixed(0) + "%" : "N/A"}`);
        lines.push(`⚠️ **Rug Pull Warning:** ${intel.rugPullWarning || "N/A"}`);
        lines.push(`🐋 **Smart Money Activity:** ${intel.smartMoneyActivity || "N/A"}`);
        lines.push(`📢 **Narrative Strength:** ${intel.narrativeStrength || "N/A"}`);
        lines.push(`💎 **Opportunity Score:** ${intel.opportunityScore ? (intel.opportunityScore * 100).toFixed(0) + "%" : "N/A"}`);
        lines.push("");
    } else {
        lines.push(`🎯 **Skor Risiko:** ${riskScore.toFixed(2)}/1.0`);
        lines.push(`📢 **Skor Narasi:** ${narrativeScore.toFixed(2)}/1.0`);
        lines.push(`🐋 **Skor Smart Money:** ${smartMoneyScore.toFixed(2)}/1.0`);
        lines.push(`🛡️ **Skor Survival:** ${survivalScore.toFixed(2)}/1.0`);
        lines.push(`💎 **Skor Peluang:** ${opportunityScore.toFixed(2)}/1.0`);
        lines.push("");
    }

    // -- On-Chain Insights --
    if (onchainAnalysis) {
        lines.push("--- **ON-CHAIN INSIGHTS** ---");
        const whaleWallets = onchainAnalysis.whaleActivity?.whaleWallets ?? (dashboardData?.intelligence?.keyInsights?.some(k => k.includes('whale')) ? '?' : 0);
        lines.push(`🐳 **Aktivitas Whale:** ${whaleWallets} dompet besar terdeteksi`);
        lines.push(`📈 **Pertumbuhan Holder:** ${onchainAnalysis.holderGrowth?.newHolders ?? 0} holder baru`);
        lines.push(`🔒 **Likuiditas Terkunci:** ${onchainAnalysis.liquidityAnalysis?.lockedLiquidity ? "✅ Aman" : "❌ Tidak terkunci"}`);
        const rugScore = onchainAnalysis.rugPullIndicators?.overallRugScore ?? 0;
        lines.push(`🚨 **Risiko Rug Pull:** ${rugScore > 0.6 ? "TINGGI 🚨" : rugScore > 0.3 ? "Sedang ⚠️" : "Rendah ✅"}`);
        lines.push(`🧪 **Kontak Terverifikasi:** ${onchainAnalysis.contractAnalysis?.isVerified ? "✅ Ya" : "❌ Tidak"}`);
        lines.push(`🔏 **Mint Authority:** ${onchainAnalysis.contractAnalysis?.mintAuthority ? "❌ ADA (Risk!)" : "✅ Tidak ada"}`);
        lines.push("");
    }

    // -- Market Pulse --
    if (marketAnalysis) {
        lines.push("--- **MARKET PULSE** ---");
        const priceChange = marketAnalysis.priceTrend?.change24h ?? 0;
        lines.push(`💵 **Harga:** ${marketAnalysis.priceTrend?.current ? `$${marketAnalysis.priceTrend.current.toFixed(8)}` : "N/A"}`);
        lines.push(`📉 **Perubahan 24j:** ${(priceChange * 100).toFixed(2)}% ${priceChange > 0 ? "🟢" : "🔴"}`);
        lines.push(`📊 **Volume 24j:** ${marketAnalysis.volumeAnalysis?.volume24h ? `$${marketAnalysis.volumeAnalysis.volume24h.toLocaleString()}` : "N/A"}`);
        lines.push(`🌊 **Volatilitas:** ${(marketAnalysis.volatilityScore ?? 0) > 0.5 ? "Tinggi ⚡" : "Normal"}`);
        const sentiment = marketAnalysis.sentimentAnalysis?.sentimentScore ?? 0;
        lines.push(`💬 **Sentimen:** ${sentiment > 0.5 ? "Positif 😊" : sentiment > 0.3 ? "Netral 😐" : "Negatif 😠"}`);
        lines.push("");
    }

    // -- Narrative & Social --
    if (narrativeAnalysis) {
        lines.push("--- **NARRATIVE & SOCIAL** ---");
        lines.push(`📢 **Tren Narasi:** ${(narrativeAnalysis?.narrativeScore ?? 0) > 0.5 ? "Kuat 🔥" : "Lemah"}`);
    if ((narrativeAnalysis?.trendingTopics?.length ?? 0) > 0) {
        lines.push(`🏷️ **Topik Trending:** ${narrativeAnalysis!.trendingTopics!.slice(0, 5).join(", ")}`);
    }
    if ((narrativeAnalysis?.influencerActivity?.topInfluencers?.length ?? 0) > 0) {
        lines.push(`👑 **Influencer Aktif:** ${narrativeAnalysis!.influencerActivity!.topInfluencers!.slice(0, 3).join(", ")}`);
    }
        lines.push("");
    }

    // -- Opportunity Analysis --
    if (opportunityAnalysis) {
        lines.push("--- **OPPORTUNITY ANALYSIS** ---");
        const eoi = (opportunityAnalysis as any).eoiScore ?? 0;
        lines.push(`💎 **EOI Score:** ${eoi > 70 ? `${eoi}/100 (Strong! 🔥)` : `${eoi}/100 (Moderate)`}`);
        const rating = (opportunityAnalysis as any).rating ?? "N/A";
        lines.push(`📊 **Rating:** ${rating}`);
        if ((opportunityAnalysis as any).entryStrategy?.suggestedEntryPrice) {
            lines.push(`🎯 **Entry Strategy:** Suggested at $${(opportunityAnalysis as any).entryStrategy.suggestedEntryPrice.toFixed(8)}`);
        }
        lines.push("");
    }

    // -- Survival Analysis --
    if (survivalAnalysis) {
        lines.push("--- **SURVIVAL ANALYSIS** ---");
        const survivalPct = (survivalAnalysis.survivalProbability ?? 0) * 100;
        lines.push(`🛡️ **Survival Probability:** ${survivalPct.toFixed(1)}%`);
        const liquidityHealth = survivalAnalysis.liquidityHealth?.sustainability ?? "N/A";
        lines.push(`💧 **Liquidity Health:** ${liquidityHealth}`);
        lines.push(`📈 **Holder Retention:** ${(survivalAnalysis.holderRetention?.retentionRate ?? 0) > 0.5 ? "Good ✅" : "Low ⚠️"}`);
        lines.push("");
    }

    // -- Key Insights from dashboard intelligence --
    if (dashboardData?.intelligence?.keyInsights && dashboardData.intelligence.keyInsights.length > 0) {
        lines.push("--- **KEY INSIGHTS** ---");
        dashboardData.intelligence.keyInsights.forEach(k => lines.push(`🔍 ${k}`));
        lines.push("");
    }

    // -- Recommendations --
    lines.push("--- **REKOMENDASI** ---");
    if (dashboardData?.intelligence?.recommendation) {
        lines.push(dashboardData.intelligence.recommendation);
    } else {
        (recommendations ?? ['Tidak ada rekomendasi.']).forEach(r => lines.push(`- ${r}`));
    }
    lines.push("");

    return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type ChatRole = "user" | "system";

interface ChatMessage {
    id: string;
    role: ChatRole;
    text: string;
    tokenAddress?: string;
    timestamp?: number;
}

type Intent =
    | "rug"
    | "whale"
    | "flow"
    | "narrative"
    | "opportunity"
    | "market"
    | "summary"
    | "general";

/* ------------------------------------------------------------------ */
/* Intent detection (keyword-based NLP-lite)                          */
/* ------------------------------------------------------------------ */

const INTENT_KEYWORDS: Record<Intent, string[]> = {
    rug: ["rug", "scam", "aman", "safe", "aman gak", "aman ga", "bahaya", "risk", "rugpull", "rug pull", "penipuan", "curang"],
    whale: ["whale", "smart money", "smartmoney", "celana", "ikus", "ikus masuk", "whale masuk", "big buyer", "insider", "cerdas"],
    flow: ["flow", "momentum", "pump", "dump", "volume", "buy pressure", "sell pressure", "arus", "aliran", "mafia", "dca"],
    narrative: ["narrative", "story", "hype", "katalis", "news", "berita", "sosmed", "social", "trending", "cerita", "narasi"],
    opportunity: ["opportunity", "early", "gem", "alpha", "potensi", "peluang", "untung", "moon", "opport"],
    market: ["market", "price", "harga", "trend", "tren", "kapitalisasi", "marketcap", "mc", "fdv"],
    summary: ["analisis", "analysis", "analyze", "overview", "ringkasan", "summary", "laporan", "report", "gimana", "gimana nih", "kenapa", "bagaimana", "tampilkan"],
    general: [],
};

function detectIntent(message: string): Intent {
    const lower = message.toLowerCase();
    const scores: Record<Intent, number> = {
        rug: 0, whale: 0, flow: 0, narrative: 0,
        opportunity: 0, market: 0, summary: 0, general: 0,
    };
    (Object.keys(INTENT_KEYWORDS) as Intent[]).forEach((intent) => {
        INTENT_KEYWORDS[intent].forEach((kw) => {
            if (lower.includes(kw)) scores[intent] += kw.length;
        });
    });
    let best: Intent = "general";
    let bestScore = 0;
    (Object.keys(scores) as Intent[]).forEach((k) => {
        if (scores[k] > bestScore) { bestScore = scores[k]; best = k; }
    });
    return best;
}

/* ------------------------------------------------------------------ */
/* AI Chat Service                                                     */
/* ------------------------------------------------------------------ */

interface AIConfig {
    url: string;
    key: string;
    model: string;
}

/**
 * Ekstrak konten dari response AI — fallback ke reasoning_content kalo content kosong.
 * Beberapa model (kaya "arblok") naruh response di field reasoning_content.
 */
function extractContent(msg: any): string | null {
    return msg?.content?.trim() || msg?.reasoning_content?.trim() || null;
}

function getAIConfig(): AIConfig | null {
    // 1) 9Router Gateway (Primary AI)
    const gwUrl = import.meta.env.VITE_AI_GATEWAY_URL as string | undefined;
    const gwKey =
        (import.meta.env.VITE_AI_GATEWAY_KEY as string | undefined) ||
        (import.meta.env.VITE_9ROUTER_API_KEY as string | undefined);
    if (gwUrl && gwKey && !gwKey.startsWith("#") && !gwKey.startsWith(" ")) {
        return {
            url: `${gwUrl.replace(/\/+$/, "")}/chat/completions`,
            key: gwKey,
            model: "arblok", // Menggunakan model "arblok" yang lebih stabil
        };
    }

    // 2) OpenRouter (Fallback AI — Free Models)
    const orUrl = import.meta.env.VITE_OPENROUTER_ENDPOINT as string | undefined;
    const orKey = import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined;
    const orEnabled = import.meta.env.VITE_OPENROUTER_ENABLED as string | undefined;
    if (orUrl && orKey && !orKey.startsWith("#") && !orKey.startsWith(" ") && orEnabled === "true") {
        return {
            url: orUrl,
            key: orKey,
            model: "openai/gpt-3.5-turbo",
        };
    }

    return null;
}

async function askAI(
    tokenSymbol: string,
    tokenAddress: string,
    userMessage: string,
    history: ChatMessage[],
): Promise<string> {
    // Try primary AI config first
    let cfg = getAIConfig();
    if (!cfg) {
        throw new Error("AI_NOT_CONFIGURED");
    }

    const intent = detectIntent(userMessage);

    let dashboardContext = "";
    if (tokenAddress && tokenAddress !== "N/A" && intent !== "general") {
        try {
            dashboardContext = await getDashboardContext(tokenAddress);
            console.log("[AI] Berhasil ambil data dashboard Onyx:", dashboardContext.slice(0, 200) + "...");
        } catch (e) {
            console.error("[AI] Gagal ambil data dashboard:", e);
            dashboardContext = "⚠️ Data dashboard tidak tersedia untuk token ini. Jawab berdasarkan pengetahuan umummu tentang crypto trading.";
        }
    }

    const systemPrompt = `Kamu adalah ONYX AI Assistant — asisten trading crypto yang membantu analisis token berdasarkan data REAL-TIME dari dashboard Onyx Terminal.

🎯 KEMAMPUANMU:
- Analisis token berdasarkan data market real-time (DexScreener)
- Rug check & risk assessment menggunakan AMD Intelligence
- Deteksi smart money activity & whale movements
- Analisis momentum, volume, dan buy/sell pressure
- Rekomendasi trading berdasarkan data on-chain

📊 TOKEN AKTIF: ${tokenSymbol} (${tokenAddress})

${dashboardContext
            ? `📈 DATA DASHBOARD ONYX (REAL-TIME):\n${dashboardContext}\n\n✅ PENTING: Data di atas adalah data LIVE dari dashboard Onyx Terminal yang terintegrasi dengan DexScreener, WebSocket real-time feeds, dan AMD Intelligence agents. Gunakan data ini sebagai basis utama analisismu. Data ini mencakup:\n- Price movements (5m, 1h, 6h, 24h)\n- Volume analysis & transaction counts\n- Buy/sell pressure & liquidity\n- AMD Intelligence Report (rug check, smart money, narrative strength)\n- Market cap, FDV, dan token age\n\nJawab pertanyaan user dengan DETAIL menggunakan data di atas.`
            : "⚠️ Data dashboard tidak tersedia untuk token ini. Jawab berdasarkan pengetahuan umummu tentang crypto trading."}

🗣️ GAYA BICARA: Ramah, profesional, pakai emoji untuk clarity. Jawab dalam Bahasa Indonesia. Kalau ada warning penting (rug risk tinggi), kasih tau dengan jelas.`;

    const messages: any[] = [{ role: "system", content: systemPrompt }];

    const recentHistory = history.slice(-6);
    for (const msg of recentHistory) {
        messages.push({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.text,
        });
    }

    messages.push({ role: "user", content: userMessage });

    try {
        const response = await fetch(cfg.url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${cfg.key}`,
            },
            body: JSON.stringify({
                model: cfg.model,
                messages,
                max_tokens: 1000,
                temperature: 0.4,
                stream: false,
            }),
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => "Unknown error");
            throw new Error(`AI API error (${response.status}): ${errText.slice(0, 200)}`);
        }

        const result = await response.json();
        const content = extractContent(result?.choices?.[0]?.message);
        if (!content) {
            throw new Error("AI returned empty response");
        }
        return content;
    } catch (error) {
        // If primary AI fails (connection refused, etc.), try fallback to OpenRouter
        console.error("[AI] Primary AI failed:", error);

        // Get fallback config (OpenRouter)
        const orUrl = import.meta.env.VITE_OPENROUTER_ENDPOINT as string | undefined;
        const orKey = import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined;
        const orEnabled = import.meta.env.VITE_OPENROUTER_ENABLED as string | undefined;

        if (orUrl && orKey && !orKey.startsWith("#") && !orKey.startsWith(" ") && orEnabled === "true") {
            console.log("[AI] Trying fallback to OpenRouter...");

            try {
                const response = await fetch(orUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${orKey}`,
                        "HTTP-Referer": "https://onyx-terminal.vercel.app",
                        "X-Title": "Onyx Terminal"
                    },
                    body: JSON.stringify({
                        model: "openai/gpt-3.5-turbo",
                        messages,
                        max_tokens: 1000,
                        temperature: 0.4,
                        stream: false,
                    }),
                });

                if (!response.ok) {
                    const errText = await response.text().catch(() => "Unknown error");
                    throw new Error(`OpenRouter API error (${response.status}): ${errText.slice(0, 200)}`);
                }

                const result = await response.json();
                const orContent = extractContent(result?.choices?.[0]?.message);
                if (!orContent) {
                    throw new Error("OpenRouter returned empty response");
                }
                return orContent;
            } catch (fallbackError) {
                console.error("[AI] OpenRouter fallback failed:", fallbackError);
                throw new Error(`AI_FALLBACK_FAILED: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
            }
        }

        throw new Error(`AI_FAILED: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/* ------------------------------------------------------------------ */
/* Quick prompts                                                       */
/* ------------------------------------------------------------------ */

const QUICK_PROMPTS = [
    "Analisis token ini",
    "Rug check aman gak?",
    "Smart money masuk?",
    "Momentum gimana?",
];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

const FloatingChat: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const activeToken = useUIStore((s) => s.activeToken);
    const tokenAddress = activeToken?.address || activeToken?.tokenAddress;
    const tokenSymbol = activeToken?.symbol || activeToken?.name || "TOKEN";

    /* Auto-scroll */
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    /* Focus input */
    useEffect(() => {
        if (open && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [open]);

    /* ---------------------------------------------------------------- */
    /* Send message                                                     */
    /* ---------------------------------------------------------------- */
    const handleSend = useCallback(async (msgOverride?: string) => {
        const text = (msgOverride ?? input).trim();
        if (!text || loading) return;

        setError(null);
        setInput("");

        const userMsg: ChatMessage = {
            id: `u-${Date.now()}`,
            role: "user",
            text,
            timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setLoading(true);

        try {
            const intent = detectIntent(text);
            let responseText: string;

            // If intent is analysis-related and token is selected, use the powerful local agent orchestrator.
            if (tokenAddress && (intent === 'summary' || intent === 'rug' || intent === 'whale' || intent === 'flow')) {
                const thinkingMsg: ChatMessage = {
                    id: `s-${Date.now()}-thinking`,
                    role: 'system',
                    text: `🤖 Menganalisis ${tokenSymbol} menggunakan AMD Intelligence...`
                };
                setMessages(prev => [...prev, thinkingMsg]);

                const report = await analyzeToken(tokenAddress, tokenSymbol);
                responseText = formatAnalysisReport(report);

                // Replace "thinking" message with the actual report
                setMessages(prev => prev.filter(m => m.id !== thinkingMsg.id));

            } else {
                // Otherwise, use the conversational AI for general questions.
                responseText = await askAI(tokenSymbol, tokenAddress || "N/A", text, messages);
            }

            const sysMsg: ChatMessage = {
                id: `s-${Date.now()}`,
                role: "system",
                text: responseText,
                tokenAddress,
                timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, sysMsg]);

        } catch (e: any) {
            let errorMessage = e?.message || "unknown error";
            if (errorMessage.includes("AI returned empty response")) {
                errorMessage = "AI mengembalikan respons kosong. Ini mungkin berarti model 'arblok' di 9Router Gateway Anda tidak merespons dengan benar atau konfigurasinya salah. Pastikan 9Router Gateway berjalan dengan baik dan model 'arblok' dikonfigurasi dengan benar.";
            } else if (errorMessage.includes("AI API error")) {
                errorMessage = `AI Assistant gagal: ${errorMessage}. Pastikan 9Router Gateway berjalan atau OpenRouter API key valid.`;
            } else if (errorMessage.includes("AI_NOT_CONFIGURED")) {
                errorMessage = "AI Assistant tidak dikonfigurasi. Pastikan variabel lingkungan VITE_AI_GATEWAY_URL dan VITE_AI_GATEWAY_KEY (atau OpenRouter) diatur dengan benar.";
            }
             const newErrMsg: ChatMessage = {
                id: `s-${Date.now()}`,
                role: "system",
                text: `❌ AI Assistant gagal: ${errorMessage}`,
            };
            setMessages((prev) => [...prev, newErrMsg]);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [input, loading, tokenAddress, tokenSymbol, messages]);

    /* ---------------------------------------------------------------- */
    /* Quick prompt click                                               */
    /* ---------------------------------------------------------------- */
    const handleQuickPrompt = useCallback((prompt: string) => {
        handleSend(prompt);
    }, [handleSend]);

    /* ---------------------------------------------------------------- */
    /* Enter key to send                                               */
    /* ---------------------------------------------------------------- */
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }, [handleSend]);

    /* ---------------------------------------------------------------- */
    /* Render                                                          */
    /* ---------------------------------------------------------------- */
    return (
        <>
            {/* FAB Toggle Button */}
            <button
                className={styles.fab}
                onClick={() => setOpen((v) => !v)}
                aria-label="Toggle AI Chat"
                title="Onyx AI Assistant"
            >
                🤖
                {!open && messages.length === 0 && <span className={styles.dot} />}
            </button>

            {/* Chat Panel */}
            {open && (
                <div className={styles.panel}>
                    {/* Header */}
                    <div className={styles.header}>
                        <span className={styles.headerTitle}>ONYX AI · {tokenSymbol}</span>
                        <button
                            onClick={() => setOpen(false)}
                            style={{
                                background: "none",
                                border: "none",
                                color: "#555566",
                                cursor: "pointer",
                                fontSize: "14px",
                                fontWeight: 700,
                            }}
                            aria-label="Close chat"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Messages */}
                    <div className={styles.messages}>
                        {messages.length === 0 && !loading && (
                            <div className={styles.welcome}>
                                <div className={styles.welcomeIcon}>🤖</div>
                                <div className={styles.welcomeTitle}>Onyx AI Assistant</div>
                                <div className={styles.welcomeText}>
                                    Tanya apapun soal token aktif ({tokenSymbol}).<br />
                                    Contoh: "rug check?", "smart money?", "momentum?"
                                </div>
                                {/* Quick Prompts */}
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "12px", justifyContent: "center" }}>
                                    {QUICK_PROMPTS.map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => handleQuickPrompt(p)}
                                            style={{
                                                background: "#1a1a1e",
                                                border: "1px solid #2a2a30",
                                                color: "#8888a0",
                                                padding: "4px 8px",
                                                borderRadius: "4px",
                                                fontSize: "10px",
                                                cursor: "pointer",
                                                fontFamily: "monospace",
                                            }}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                                {!tokenAddress && (
                                    <div className={styles.errorText} style={{ marginTop: "8px" }}>
                                        ⚠️ Belum ada token dipilih. Pilih dari Watchlist dulu.
                                    </div>
                                )}
                            </div>
                        )}

                        {messages.map((m) => (
                            <div
                                key={m.id}
                                className={`${styles.bubble} ${m.role === "user" ? styles.bubbleUser : styles.bubbleSystem}`}
                            >
                                <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
                                {m.tokenAddress && (
                                    <div className={styles.bubbleAddress}>{m.tokenAddress.slice(0, 8)}…{m.tokenAddress.slice(-4)}</div>
                                )}
                            </div>
                        ))}

                        {loading && (
                            <div className={styles.loading}>
                                <div className={styles.spinner} />
                                <span>Onyx AI Assistant is typing…</span>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className={styles.inputArea}>
                        <input
                            ref={inputRef}
                            className={styles.inputField}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={tokenAddress ? `Tanya soal ${tokenSymbol}…` : "Pilih token dulu…"}
                            disabled={loading}
                        />
                        <button
                            className={styles.sendBtn}
                            onClick={() => handleSend()}
                            disabled={loading || !input.trim()}
                        >
                            KIRIM
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default FloatingChat;