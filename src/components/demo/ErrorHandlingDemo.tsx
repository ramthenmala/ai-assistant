import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToastActions } from '@/components/ui/toast';
import { useErrorHandler } from '@/components/ErrorBoundary';
import { AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';

export function ErrorHandlingDemo() {
  const [shouldThrowError, setShouldThrowError] = useState(false);
  const { success, error, warning, info } = useToastActions();
  const reportError = useErrorHandler();

  // This will trigger an error boundary
  if (shouldThrowError) {
    throw new Error('This is a demo error to test the Error Boundary!');
  }

  const handleManualError = () => {
    const demoError = new Error('This is a manually reported error');
    reportError(demoError, 'Demo error reporting');
    error('This error was manually reported and logged');
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Error Handling & Notifications Demo</h2>
        <p className="text-muted-foreground">
          Test the error boundaries and toast notification system
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Toast Notifications */}
        <div className="space-y-4 p-4 border rounded-lg">
          <h3 className="font-semibold flex items-center">
            <Info className="h-4 w-4 mr-2" />
            Toast Notifications
          </h3>
          <div className="space-y-2">
            <Button 
              onClick={() => success('Operation completed successfully!')}
              className="w-full"
              variant="outline"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Show Success Toast
            </Button>
            <Button 
              onClick={() => error('Something went wrong!', 'Error Title')}
              className="w-full"
              variant="outline"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Show Error Toast
            </Button>
            <Button 
              onClick={() => warning('This is a warning message')}
              className="w-full"
              variant="outline"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Show Warning Toast
            </Button>
            <Button 
              onClick={() => info('Here\'s some information')}
              className="w-full"
              variant="outline"
            >
              <Info className="h-4 w-4 mr-2" />
              Show Info Toast
            </Button>
          </div>
        </div>

        {/* Error Boundaries */}
        <div className="space-y-4 p-4 border rounded-lg">
          <h3 className="font-semibold flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Error Boundaries
          </h3>
          <div className="space-y-2">
            <Button 
              onClick={() => setShouldThrowError(true)}
              className="w-full"
              variant="destructive"
            >
              Trigger Component Error
            </Button>
            <Button 
              onClick={handleManualError}
              className="w-full"
              variant="outline"
            >
              Report Manual Error
            </Button>
            <Button 
              onClick={() => {
                // Simulate a promise error
                const failingPromise = Promise.reject(new Error('Async operation failed'));
                error('Promise rejected!');
              }}
              className="w-full"
              variant="outline"
            >
              Simulate Async Error
            </Button>
          </div>
        </div>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>
          Check the browser console and localStorage for error logs.
          The error boundary will show a recovery UI if a component error occurs.
        </p>
      </div>
    </div>
  );
}