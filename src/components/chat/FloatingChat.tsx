/**
 * @file FloatingChat.tsx
 * @layer component
 * @desc AI Chat Assistant for Onyx Terminal — conversational interface to AMD Intelligence.
 *       User asks in natural language → intent routed → analyzeToken() → formatted answer.
 * @exposes FloatingChat
 * @deps amd_integration (analyzeToken), core/store/ui.store, OnyxChat.module.css
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useUIStore } from "@/core/store/ui.store";
import styles from "./OnyxChat.module.css";
import { analyzeToken, IntelligenceReport } from "@amd_integration";
import { getDashboardContext } from "@/services/dashboardDataService";

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

function getAIConfig(): AIConfig | null {
    const gwUrl = import.meta.env.VITE_AI_GATEWAY_URL as string | undefined;
    const gwKey = import.meta.env.VITE_AI_GATEWAY_KEY as string | undefined;
    if (gwUrl && gwKey) {
        return {
            url: `${gwUrl.replace(/\/+$/, "")}/chat/completions`,
            key: gwKey,
            model: "arblok",
        };
    }
    const orUrl = import.meta.env.VITE_OPENROUTER_ENDPOINT as string | undefined;
    const orKey = import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined;
    const orEnabled = import.meta.env.VITE_OPENROUTER_ENABLED as string | undefined;
    if (orUrl && orKey && orEnabled === "true") {
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
    const cfg = getAIConfig();
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
            : "⚠️ Data dashboard tidak tersedia untuk token ini. Jawab berdasarkan pengetahuan umummu tentang crypto trading."
        }

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
    const content = result?.choices?.[0]?.message?.content?.trim();
    if (!content) {
        throw new Error("AI returned empty response");
    }
    return content;
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
            const response = await askAI(tokenSymbol, tokenAddress || "N/A", text, messages);

            const sysMsg: ChatMessage = {
                id: `s-${Date.now()}`,
                role: "system",
                text: response,
                tokenAddress,
                timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, sysMsg]);
        } catch (e: any) {
            const errMsg: ChatMessage = {
                id: `s-${Date.now()}`,
                role: "system",
                text: `❌ AI Assistant gagal: ${e?.message || "unknown error"}. Coba lagi ya. Pastikan 9Router Gateway berjalan atau OpenRouter API key valid.`,
            };
            // BEGIN FIX: Improved error handling messages
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
            // END FIX: Improved error handling messages
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