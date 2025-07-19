import React, { Component, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  level?: 'page' | 'component' | 'critical';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      errorInfo,
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error to storage for reporting
    this.logErrorToStorage(error, errorInfo);
  }

  private logErrorToStorage(error: Error, errorInfo: React.ErrorInfo) {
    try {
      const errorLog = {
        id: this.state.errorId,
        timestamp: new Date().toISOString(),
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        errorInfo: {
          componentStack: errorInfo.componentStack,
        },
        userAgent: navigator.userAgent,
        url: window.location.href,
        level: this.props.level || 'component',
      };

      // Store in localStorage for now (in production, send to error reporting service)
      const existingErrors = JSON.parse(localStorage.getItem('app_error_logs') || '[]');
      existingErrors.push(errorLog);
      
      // Keep only last 50 errors to prevent storage bloat
      if (existingErrors.length > 50) {
        existingErrors.splice(0, existingErrors.length - 50);
      }
      
      localStorage.setItem('app_error_logs', JSON.stringify(existingErrors));
    } catch (loggingError) {
      console.error('Failed to log error to storage:', loggingError);
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private copyErrorDetails = () => {
    const errorDetails = `
Error ID: ${this.state.errorId}
Timestamp: ${new Date().toISOString()}
Error: ${this.state.error?.message}
Stack: ${this.state.error?.stack}
Component Stack: ${this.state.errorInfo?.componentStack}
User Agent: ${navigator.userAgent}
URL: ${window.location.href}
    `.trim();

    navigator.clipboard.writeText(errorDetails).then(() => {
      // Could show a toast notification here
      console.log('Error details copied to clipboard');
    });
  };

  render() {
    if (this.state.hasError) {
      // If custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI based on error level
      const { level = 'component' } = this.props;
      const { error, errorId } = this.state;

      if (level === 'critical') {
        return (
          <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <motion.div
              className="max-w-lg w-full text-center space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Critical Error</h1>
                <p className="text-muted-foreground">
                  The application has encountered a critical error and needs to be restarted.
                </p>
                <div className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                  Error ID: {errorId}
                </div>
              </div>
              
              <div className="space-y-3">
                <Button onClick={this.handleReload} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Restart Application
                </Button>
                <Button 
                  variant="outline" 
                  onClick={this.copyErrorDetails}
                  className="w-full"
                >
                  <Bug className="h-4 w-4 mr-2" />
                  Copy Error Details
                </Button>
              </div>
            </motion.div>
          </div>
        );
      }

      if (level === 'page') {
        return (
          <div className="flex-1 flex items-center justify-center p-8">
            <motion.div
              className="max-w-md w-full text-center space-y-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">Page Error</h2>
                <p className="text-muted-foreground text-sm">
                  This page encountered an error. You can try reloading or go back to the home page.
                </p>
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded text-left">
                    {error?.message}
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Button onClick={this.handleRetry} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button 
                  variant="outline" 
                  onClick={this.handleGoHome}
                  className="w-full"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </div>
            </motion.div>
          </div>
        );
      }

      // Component level error (default)
      return (
        <motion.div
          className="border border-destructive/20 bg-destructive/5 rounded-lg p-4 m-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1 space-y-2">
              <h3 className="text-sm font-medium text-foreground">
                Component Error
              </h3>
              <p className="text-xs text-muted-foreground">
                This component failed to load. Try refreshing or contact support if the problem persists.
              </p>
              {process.env.NODE_ENV === 'development' && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Error Details
                  </summary>
                  <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                    {error?.message}
                  </pre>
                </details>
              )}
              <Button 
                size="sm" 
                variant="outline" 
                onClick={this.handleRetry}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </div>
          </div>
        </motion.div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easy wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Hook for manual error reporting
export function useErrorHandler() {
  return (error: Error, context?: string) => {
    const errorLog = {
      id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context: context || 'Manual error report',
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    try {
      const existingErrors = JSON.parse(localStorage.getItem('app_error_logs') || '[]');
      existingErrors.push(errorLog);
      localStorage.setItem('app_error_logs', JSON.stringify(existingErrors));
    } catch (loggingError) {
      console.error('Failed to log manual error:', loggingError);
    }

    // In development, also log to console
    if (process.env.NODE_ENV === 'development') {
      console.error('Manual error report:', error, context);
    }
  };
}