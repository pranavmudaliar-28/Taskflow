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

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);

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
