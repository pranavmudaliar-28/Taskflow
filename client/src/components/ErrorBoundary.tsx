import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }

    public componentDidCatch(error: any, errorInfo: ErrorInfo) {
        console.error('[ErrorBoundary] Caught render error:', error);
        console.error('[ErrorBoundary] Component stack:', errorInfo?.componentStack);

        // Update state with error info for detailed display
        this.setState({ error, errorInfo });

        // NOTE: We intentionally do NOT auto-reload here.
        // Auto-reloads created an infinite blank-screen loop because the page
        // reloaded before the error card could stabilize. Users can manually
        // reload via the button in the error UI.
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Use inline styles as a safety net — if Tailwind CSS variables
            // aren't loaded, the error card is still visually readable.
            return (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f9fafb',
                    padding: '16px',
                    fontFamily: 'system-ui, sans-serif',
                }}>
                    <div style={{
                        maxWidth: '600px',
                        width: '100%',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        padding: '32px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <span style={{ fontSize: '32px' }}>⚠️</span>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>
                                    Something went wrong
                                </h2>
                                <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6b7280' }}>
                                    An unexpected error occurred. Please try again.
                                </p>
                            </div>
                        </div>

                        {this.state.error && (
                            <div style={{
                                backgroundColor: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: '8px',
                                padding: '12px',
                                marginBottom: '20px',
                                overflow: 'auto',
                            }}>
                                <p style={{ margin: 0, fontFamily: 'monospace', fontSize: '13px', color: '#dc2626', fontWeight: 600 }}>
                                    {this.state.error.message || String(this.state.error)}
                                </p>
                                {this.state.errorInfo && (
                                    <pre style={{ margin: '8px 0 0', fontSize: '11px', color: '#9f1239', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                                        {this.state.errorInfo.componentStack}
                                    </pre>
                                )}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <button
                                onClick={this.handleReset}
                                style={{
                                    padding: '8px 20px',
                                    backgroundColor: '#7c3aed',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                style={{
                                    padding: '8px 20px',
                                    backgroundColor: 'transparent',
                                    color: '#374151',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Reload Page
                            </button>
                            <button
                                onClick={() => { window.history.length > 1 ? window.history.back() : window.location.href = '/'; }}
                                style={{
                                    padding: '8px 20px',
                                    backgroundColor: 'transparent',
                                    color: '#374151',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Go Back
                            </button>
                            <button
                                onClick={() => {
                                    const text = `Error: ${this.state.error?.message}\n\nStack: ${this.state.errorInfo?.componentStack}`;
                                    navigator.clipboard.writeText(text);
                                    alert('Error details copied to clipboard');
                                }}
                                style={{
                                    padding: '8px 20px',
                                    backgroundColor: 'transparent',
                                    color: '#374151',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Copy Error
                            </button>
                            <button
                                onClick={() => { window.location.href = '/'; }}
                                style={{
                                    padding: '8px 20px',
                                    backgroundColor: 'transparent',
                                    color: '#374151',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Go Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
