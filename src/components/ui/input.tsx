import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode
  error?: string
  animate?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, error, animate = false, ...props }, ref) => {
    const Component = animate ? motion.input : "input"
    
    return (
      <div className="relative w-full">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none">
            {icon}
          </div>
        )}
        
        <Component
          type={type}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "aria-invalid:border-destructive aria-invalid:ring-destructive/30",
            icon && "pl-10",
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
Input.displayName = "Input"

export { Input }