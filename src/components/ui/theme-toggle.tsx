import * as React from "react"
import { Moon, Sun, Laptop } from "lucide-react"
import { Button } from "./button"
import { themeUtils } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface ThemeToggleProps {
  className?: string
  showLabel?: boolean
  size?: "default" | "sm" | "lg" | "icon"
}

export function ThemeToggle({ 
  className, 
  showLabel = false,
  size = "icon" 
}: ThemeToggleProps) {
  const [theme, setThemeState] = React.useState<'dark' | 'light' | 'system'>(
    () => themeUtils.getTheme()
  )

  React.useEffect(() => {
    const handleSystemThemeChange = () => {
      if (theme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        document.documentElement.classList.toggle('dark', isDark)
      }
    }

    // Set initial theme
    themeUtils.setTheme(theme)

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', handleSystemThemeChange)
    
    // Listen for theme change events from other components
    const handleThemeChange = (e: CustomEvent) => {
      setThemeState(e.detail.theme)
    }
    
    window.addEventListener('theme-change', handleThemeChange as EventListener)
    
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
      window.removeEventListener('theme-change', handleThemeChange as EventListener)
    }
  }, [theme])

  function cycleTheme() {
    const nextTheme = themeUtils.cycleTheme()
    setThemeState(nextTheme)
  }

  const getThemeLabel = () => {
    switch (theme) {
      case 'dark': return 'Dark'
      case 'light': return 'Light'
      case 'system': return 'System'
    }
  }

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={cycleTheme}
      className={className}
      title={`Current theme: ${theme}. Click to switch.`}
      animate
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={theme}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.15 }}
          className="flex items-center"
        >
          {theme === 'dark' ? (
            <Moon className="size-4" />
          ) : theme === 'light' ? (
            <Sun className="size-4" />
          ) : (
            <Laptop className="size-4" />
          )}
          
          {showLabel && (
            <span className="ml-2">{getThemeLabel()}</span>
          )}
        </motion.div>
      </AnimatePresence>
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}