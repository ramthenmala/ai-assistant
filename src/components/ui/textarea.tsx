import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
  animate?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, animate = false, ...props }, ref) => {
    const Component = animate ? motion.textarea : "textarea"
    
    return (
      <div className="relative w-full">
        <Component
          className={cn(
            "flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "aria-invalid:border-destructive aria-invalid:ring-destructive/30",
            "resize-none",
            className
          )}
          ref={ref}
          aria-invalid={!!error}
          {...props}
          {...(animate && {
            initial: { opacity: 0, y: 5 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.2 }
          })}
        />
        
        {error && (
          <div className="text-xs text-destructive mt-1">{error}</div>
        )}
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }