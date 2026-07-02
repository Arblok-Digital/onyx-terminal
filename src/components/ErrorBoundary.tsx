/**
 * @file ErrorBoundary.tsx
 * @layer components
 * @desc React Error Boundary to catch rendering errors and prevent full white screen crash.
 *       Wraps the entire app or specific panels that might throw (e.g. chart, swap).
 * @exposes ErrorBoundary, withErrorBoundary HOC
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string; // Component name for logging
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const name = this.props.name || 'Unknown';
    console.error(`[ErrorBoundary:${name}] Caught error:`, error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      // Default fallback UI
      return (
        <div
          style={{
            padding: '2rem',
            margin: '1rem',
            border: '1px solid #ef4444',
            borderRadius: '0.5rem',
            backgroundColor: '#1a0a0a',
            color: '#fca5a5',
            fontFamily: 'monospace',
          }}
        >
          <h2 style={{ marginTop: 0, color: '#ef4444' }}>
            ⚠️ Panel Error
          </h2>
          <p style={{ color: '#f87171' }}>
            {this.props.name
              ? `Terjadi error pada panel "${this.props.name}".`
              : 'Terjadi error saat merender komponen.'}
          </p>
          <details style={{ cursor: 'pointer', marginTop: '0.5rem' }}>
            <summary style={{ color: '#fbbf24' }}>Detail Error</summary>
            <pre
              style={{
                marginTop: '0.5rem',
                padding: '0.75rem',
                backgroundColor: '#0d0d0d',
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {this.state.error?.message}
            </pre>
          </details>
          <button
            onClick={this.handleRetry}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1.5rem',
              backgroundColor: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            🔄 Coba Lagi
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap any component with an ErrorBoundary.
 */
export function withErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  options?: Omit<Props, 'children'>
): React.FC<T> {
  const displayName = Component.displayName || Component.name || 'Anonymous';
  const Wrapped: React.FC<T> = (props) => (
    <ErrorBoundary name={displayName} {...options}>
      <Component {...(props as any)} />
    </ErrorBoundary>
  );
  Wrapped.displayName = `withErrorBoundary(${displayName})`;
  return Wrapped;
}