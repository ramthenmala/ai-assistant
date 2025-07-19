# AI Chat Assistant UI Component Library

This directory contains reusable UI components built with ShadCN UI, Tailwind CSS, and Framer Motion for animations. These components are designed to be accessible, responsive, and themeable.

## Overview

The UI component library provides a consistent design system for the AI Chat Assistant application. It includes:

- **Core Components**: Buttons, badges, inputs, cards, etc.
- **Animation Support**: Built-in animations using Framer Motion
- **Theme Support**: Light/dark mode with CSS variables
- **Accessibility**: ARIA attributes and keyboard navigation
- **Responsive Design**: Mobile-friendly components

## Getting Started

To use these components in your application:

```tsx
// Import components
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";

// Use in your component
function MyComponent() {
  return (
    <Card>
      <h2>Hello World</h2>
      <Button>Click Me</Button>
      <ThemeToggle />
    </Card>
  );
}
```

## Available Components

For detailed documentation on each component, see the [COMPONENTS.md](./COMPONENTS.md) file.

### Core Components

- **Button**: Multi-variant buttons with loading states and icon support
- **Badge**: Status indicators with removable option
- **Input**: Text inputs with icon and error handling
- **Textarea**: Multi-line text inputs
- **Card**: Content containers with header/footer sections
- **Tooltip**: Informational hover tooltips
- **ThemeToggle**: Theme switching control

### Animation Support

All components support optional animations through the `animate` prop. Animation utilities are available in `@/lib/animations.ts` and can be imported from `@/lib/utils`.

```tsx
import { fadeIn, slideInLeft } from "@/lib/utils";
import { motion } from "framer-motion";

<motion.div
  variants={fadeIn}
  initial="hidden"
  animate="visible"
  exit="exit"
>
  Animated content
</motion.div>
```

### Theme Support

The component library supports light and dark themes using CSS variables. Theme can be controlled programmatically:

```tsx
import { themeUtils } from "@/lib/utils";

// Get current theme
const theme = themeUtils.getTheme();

// Set theme
themeUtils.setTheme("dark");
themeUtils.setTheme("light");
themeUtils.setTheme("system");

// Check if dark mode
const isDark = themeUtils.isDarkMode();

// Cycle through themes
themeUtils.cycleTheme();
```

## Customization

Components can be customized using Tailwind classes:

```tsx
<Button 
  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
>
  Custom Gradient Button
</Button>
```

## Best Practices

1. **Consistency**: Use the provided components instead of creating new ones
2. **Accessibility**: Include proper ARIA attributes and labels
3. **Responsiveness**: Test components on different screen sizes
4. **Performance**: Use animations sparingly on performance-critical paths
5. **Theme Support**: Ensure custom styles work in both light and dark modes

## Contributing

When adding new components:

1. Follow the existing component patterns
2. Include TypeScript interfaces for props
3. Add animation support where appropriate
4. Ensure dark/light theme compatibility
5. Document usage in COMPONENTS.md
6. Add accessibility attributes
7. Write tests for the component

## Related Files

- `src/lib/animations.ts`: Animation variants for Framer Motion
- `src/lib/utils.ts`: Utility functions including theme management
- `src/index.css`: CSS variables for theming