import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  title?: string
  message: string
  type: ToastType
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

// Toast context
interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearAll: () => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

// Toast Provider
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const addToast = React.useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const newToast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000, // 5 seconds default
    }

    setToasts(prev => [...prev, newToast])

    // Auto-remove toast after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, newToast.duration)
    }
  }, [])

  const removeToast = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const clearAll = React.useCallback(() => {
    setToasts([])
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearAll }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

// Toast Container
function ToastContainer() {
  const { toasts } = useToast()

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      <AnimatePresence>
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  )
}

// Individual Toast Item
function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useToast()

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
      case 'error':
        return "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
      case 'warning':
        return "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950"
      case 'info':
        return "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950"
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "relative border rounded-lg p-4 shadow-lg backdrop-blur-sm",
        "flex items-start gap-3",
        getStyles()
      )}
    >
      {getIcon()}
      
      <div className="flex-1 space-y-1">
        {toast.title && (
          <h4 className="text-sm font-medium text-foreground">
            {toast.title}
          </h4>
        )}
        <p className="text-sm text-muted-foreground">
          {toast.message}
        </p>
        
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {toast.action.label}
          </button>
        )}
      </div>

      <button
        onClick={() => removeToast(toast.id)}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  )
}

// Convenience hook for common toast patterns
export function useToastActions() {
  const { addToast } = useToast()

  return {
    success: (message: string, title?: string) => 
      addToast({ type: 'success', message, title }),
    
    error: (message: string, title?: string) => 
      addToast({ type: 'error', message, title, duration: 7000 }),
    
    warning: (message: string, title?: string) => 
      addToast({ type: 'warning', message, title }),
    
    info: (message: string, title?: string) => 
      addToast({ type: 'info', message, title }),
    
    promise: function<T>(
      promise: Promise<T>,
      options: {
        loading: string;
        success: string | ((data: T) => string);
        error: string | ((err: any) => string);
      }
    ) {
      const loadingToast = { type: 'info' as const, message: options.loading, duration: 0 };
      addToast(loadingToast);

      promise
        .then((data) => {
          const successMessage = typeof options.success === 'function' ? options.success(data) : options.success;
          addToast({ type: 'success', message: successMessage });
        })
        .catch((err) => {
          const errorMessage = typeof options.error === 'function' ? options.error(err) : options.error;
          addToast({ type: 'error', message: errorMessage });
        });

      return promise;
    }
  }
}