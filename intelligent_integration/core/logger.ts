/**
 * @file logger.ts
 * @layer core
 * @desc Structured logger for Onyx Terminal.
 *       Provides consistent log formatting with levels, timestamps, and context.
 *       In production, swap the backend to Pino for high-performance logging.
 *
 * @usage
 *   const log = createLogger('AgentRouter');
 *   log.info('Routing decision made', { primaryAgent: '9router', confidence: 0.95 });
 *   log.error('Analysis failed', { tokenAddress, error: err.message });
 *
 * @exposes createLogger, Logger, LogLevel
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    context: string;
    message: string;
    data?: Record<string, unknown>;
    error?: string;
}

export interface Logger {
    /** Debug-level log (verbose diagnostics) */
    debug(message: string, data?: Record<string, unknown>): void;
    /** Info-level log (normal operations) */
    info(message: string, data?: Record<string, unknown>): void;
    /** Warning-level log (non-critical issues) */
    warn(message: string, data?: Record<string, unknown>): void;
    /** Error-level log (failures requiring attention) */
    error(message: string, data?: Record<string, unknown>): void;
    /** Get all buffered log entries (for diagnostics) */
    getEntries(): LogEntry[];
    /** Clear buffered log entries */
    clearEntries(): void;
}

/**
 * Create a structured logger for a given context/module.
 *
 * @param context - Module name (e.g., 'AgentRouter', 'OpenRouterProvider')
 * @param minLevel - Minimum level to output (default: 'debug')
 * @returns Logger instance
 */
export function createLogger(context: string, minLevel: LogLevel = 'debug'): Logger {
    const minPriority = LOG_LEVELS[minLevel];
    const entries: LogEntry[] = [];
    const MAX_ENTRIES = 1000;

    function shouldLog(level: LogLevel): boolean {
        return LOG_LEVELS[level] >= minPriority;
    }

    function log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
        if (!shouldLog(level)) return;

        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            context,
            message,
            data: data && Object.keys(data).length > 0 ? data : undefined,
            error: data?.error as string | undefined,
        };

        // Store in ring buffer
        entries.push(entry);
        if (entries.length > MAX_ENTRIES) {
            entries.shift();
        }

        // Console output with consistent format
        const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${context}]`;
        const dataStr = data && Object.keys(data).length > 0
            ? ` ${JSON.stringify(data, safeStringifyReplacer)}`
            : '';

        switch (level) {
            case 'error':
                console.error(`${prefix} ${message}${dataStr}`);
                break;
            case 'warn':
                console.warn(`${prefix} ${message}${dataStr}`);
                break;
            case 'info':
                console.log(`${prefix} ${message}${dataStr}`);
                break;
            case 'debug':
                console.debug(`${prefix} ${message}${dataStr}`);
                break;
        }
    }

    return {
        debug: (message, data?) => log('debug', message, data),
        info: (message, data?) => log('info', message, data),
        warn: (message, data?) => log('warn', message, data),
        error: (message, data?) => log('error', message, data),
        getEntries: () => [...entries],
        clearEntries: () => (entries.length = 0),
    };
}

/**
 * Safe JSON replacer that handles circular references and Error objects.
 */
function safeStringifyReplacer(_key: string, value: unknown): unknown {
    if (value instanceof Error) {
        return {
            message: value.message,
            name: value.name,
            stack: value.stack,
        };
    }
    if (typeof value === 'object' && value !== null) {
        // Detect circular references
        if ((value as Record<string, unknown>)._circular) {
            return '[Circular]';
        }
    }
    return value;
}