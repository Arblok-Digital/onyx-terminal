/**
 * @file logger.ts
 * @desc Centralized logging interface and concrete implementation.
 */

import { injectable } from 'inversify';

export interface LogEntry {
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
    message: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    context?: Record<string, any>;
}

export interface Logger {
    info(message: string, context?: Record<string, unknown>): void;
    warn(message: string, context?: Record<string, unknown>): void;
    error(message: string, error?: Error, context?: Record<string, unknown>): void;
    debug(message: string, context?: Record<string, unknown>): void;
}

const safeStringifyReplacer = () => {
    const seen = new WeakSet();
    return (key: string, value: any) => {
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
                return '[Circular]';
            }
            seen.add(value);
        }
        return value;
    };
};

@injectable()
export class ConsoleLogger implements Logger {
    private log(level: LogEntry['level'], message: string, context?: Record<string, unknown>) {
        const logEntry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            context,
        };
        const output = JSON.stringify(logEntry, safeStringifyReplacer(), 2);
        
        switch (level) {
            case 'INFO':
                console.info(output);
                break;
            case 'WARN':
                console.warn(output);
                break;
            case 'ERROR':
                console.error(output);
                break;
            case 'DEBUG':
                console.debug(output);
                break;
        }
    }

    info(message: string, context?: Record<string, unknown>): void {
        this.log('INFO', message, context);
    }

    warn(message: string, context?: Record<string, unknown>): void {
        this.log('WARN', message, context);
    }

    error(message: string, error?: Error, context?: Record<string, unknown>): void {
        this.log('ERROR', message, { ...context, error: error?.stack });
    }

    debug(message: string, context?: Record<string, unknown>): void {
        this.log('DEBUG', message, context);
    }
}

// Factory function — creates a ConsoleLogger instance
export function createLogger(): Logger {
    return new ConsoleLogger();
}
