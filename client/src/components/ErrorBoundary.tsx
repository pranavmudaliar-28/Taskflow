import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
        // Use a very robust way to get the error message
        const errorMessage = (error?.message || String(error) || '').toLowerCase();

        console.error('ErrorBoundary caught an error:', error);
        console.group('Error Details');
        console.log('Message:', errorMessage);
        console.log('Stack:', error?.stack);
        console.log('Info:', errorInfo?.componentStack);
        console.groupEnd();

        // Handle chunk load errors/dynamic import failures
        const isChunkLoadError =
            errorMessage.includes('failed to fetch dynamically imported module') ||
            errorMessage.includes('css_chunk_load_failed') ||
            errorMessage.includes('loading chunk') ||
            errorMessage.includes('module not found') ||
            errorMessage.includes('script error');

        if (isChunkLoadError) {
            console.warn('Chunk load error detected. Attempting automatic recovery...');

            const RELOAD_KEY = 'last_chunk_load_reload';
            const now = Date.now();
            const lastReload = sessionStorage.getItem(RELOAD_KEY);

            // Allow up to 2 reloads in short succession, then stop
            const reloadCountKey = 'chunk_load_reload_count';
            const reloadCount = parseInt(sessionStorage.getItem(reloadCountKey) || '0');

            if (!lastReload || (now - parseInt(lastReload) > 30000)) {
                // If it's been more than 30 seconds since last reload, reset count
                sessionStorage.setItem(reloadCountKey, '1');
                sessionStorage.setItem(RELOAD_KEY, now.toString());

                console.log('Reloading page to refresh modules...');
                window.location.href = window.location.href; // Force a hard-ish reload
                return;
            } else if (reloadCount < 2) {
                // Allow one more retry within the 30s window
                sessionStorage.setItem(reloadCountKey, (reloadCount + 1).toString());
                sessionStorage.setItem(RELOAD_KEY, now.toString());

                console.log(`Reload attempt ${reloadCount + 1}. Refreshing...`);
                window.location.reload();
                return;
            } else {
                console.error('Recovery failed after multiple attempts. Manual intervention required.');
            }
        }

        this.setState({
            error,
            errorInfo,
        });

        // TODO: Log to error tracking service (Sentry, LogRocket, etc.)
        // logErrorToService(error, errorInfo);
    }

    private handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    private handleGoHome = () => {
        window.location.href = '/';
    };

    public render() {
        if (this.state.hasError) {
            // Use custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI
            return (
                <div className="min-h-screen flex items-center justify-center bg-background p-4">
                    <Card className="max-w-2xl w-full">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="h-8 w-8 text-destructive" />
                                <div>
                                    <CardTitle className="text-2xl">Something went wrong</CardTitle>
                                    <CardDescription>
                                        We're sorry, but something unexpected happened. Please try again.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {process.env.NODE_ENV === 'development' && this.state.error && (
                                <div className="bg-muted p-4 rounded-lg overflow-auto">
                                    <p className="font-mono text-sm text-destructive font-semibold mb-2">
                                        {this.state.error.toString()}
                                    </p>
                                    {this.state.errorInfo && (
                                        <pre className="text-xs text-muted-foreground overflow-auto">
                                            {this.state.errorInfo.componentStack}
                                        </pre>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <Button onClick={this.handleReset} className="flex items-center gap-2">
                                    <RefreshCw className="h-4 w-4" />
                                    Try Again
                                </Button>
                                <Button onClick={this.handleGoHome} variant="outline" className="flex items-center gap-2">
                                    <Home className="h-4 w-4" />
                                    Go Home
                                </Button>
                            </div>

                            {process.env.NODE_ENV === 'production' && (
                                <p className="text-sm text-muted-foreground">
                                    If this problem persists, please contact support with the time this error occurred.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}
