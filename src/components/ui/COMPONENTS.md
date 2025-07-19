# UI Component Library Documentation

This document provides detailed information about the UI components available in the AI Chat Assistant application. These components are built with ShadCN UI, Tailwind CSS, and Framer Motion for animations.

## Table of Contents

1. [Button](#button)
2. [Badge](#badge)
3. [Input](#input)
4. [Textarea](#textarea)
5. [Card](#card)
6. [Tooltip](#tooltip)
7. [ThemeToggle](#themetoggle)
8. [Animation Utilities](#animation-utilities)

## Button

A versatile button component with multiple variants, sizes, and animation support.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | 'default' \| 'destructive' \| 'outline' \| 'secondary' \| 'ghost' \| 'link' | 'default' | The visual style of the button |
| size | 'default' \| 'sm' \| 'lg' \| 'icon' | 'default' | The size of the button |
| asChild | boolean | false | Whether to render as a child component |
| animate | boolean | false | Whether to apply hover/tap animations |
| loading | boolean | false | Whether to show a loading spinner |
| loadingText | string | undefined | Text to show when loading |
| icon | ReactNode | undefined | Icon to display in the button |
| iconPosition | 'left' \| 'right' | 'left' | Position of the icon |

### Examples

```tsx
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

// Basic usage
<Button>Click me</Button>

// With variants
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>
<Button variant="destructive">Delete</Button>

// With sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon">+</Button>

// With animation
<Button animate>Animated Button</Button>

// With loading state
<Button loading loadingText="Saving...">Save</Button>

// With icon
<Button icon={<Plus />}>Add Item</Button>
<Button icon={<Plus />} iconPosition="right">Add Item</Button>
```

## Badge

A badge component for displaying short status descriptors.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | 'default' \| 'secondary' \| 'destructive' \| 'outline' \| 'success' \| 'warning' \| 'info' | 'default' | The visual style of the badge |
| size | 'default' \| 'sm' \| 'lg' | 'default' | The size of the badge |
| asChild | boolean | false | Whether to render as a child component |
| animate | boolean | false | Whether to apply entrance/exit animations |
| icon | ReactNode | undefined | Icon to display in the badge |
| removable | boolean | false | Whether the badge can be removed |
| onRemove | () => void | undefined | Callback when remove button is clicked |

### Examples

```tsx
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

// Basic usage
<Badge>New</Badge>

// With variants
<Badge variant="secondary">Secondary</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="info">Info</Badge>

// With sizes
<Badge size="sm">Small</Badge>
<Badge size="default">Default</Badge>
<Badge size="lg">Large</Badge>

// With animation
<Badge animate>Animated</Badge>

// With icon
<Badge icon={<Check />}>Completed</Badge>

// Removable badge
<Badge removable onRemove={() => console.log('Badge removed')}>
  Removable
</Badge>
```

## Input

A text input component with icon support and error handling.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| icon | ReactNode | undefined | Icon to display inside the input |
| error | string | undefined | Error message to display |
| animate | boolean | false | Whether to apply entrance animations |

### Examples

```tsx
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

// Basic usage
<Input placeholder="Enter your name" />

// With icon
<Input 
  icon={<Search className="h-4 w-4" />} 
  placeholder="Search..." 
/>

// With error
<Input 
  error="This field is required" 
  aria-invalid="true"
/>

// With animation
<Input animate placeholder="Animated input" />
```

## Textarea

A multi-line text input component.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| error | string | undefined | Error message to display |
| animate | boolean | false | Whether to apply entrance animations |

### Examples

```tsx
import { Textarea } from "@/components/ui/textarea";

// Basic usage
<Textarea placeholder="Enter your message" />

// With error
<Textarea 
  error="Please enter at least 10 characters" 
  aria-invalid="true"
/>

// With animation
<Textarea animate placeholder="Animated textarea" />
```

## Card

A container component for grouping related content.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| animate | boolean | false | Whether to apply entrance/exit animations |

### Examples

```tsx
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Basic usage
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description goes here</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>

// With animation
<Card animate>
  <CardHeader>
    <CardTitle>Animated Card</CardTitle>
  </CardHeader>
  <CardContent>
    <p>This card animates when it appears</p>
  </CardContent>
</Card>
```

## Tooltip

A component for displaying additional information on hover.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| content | ReactNode | required | Content to display in the tooltip |
| side | 'top' \| 'right' \| 'bottom' \| 'left' | 'top' | Position of the tooltip relative to the trigger |
| align | 'start' \| 'center' \| 'end' | 'center' | Alignment of the tooltip |
| delay | number | 700 | Delay before showing the tooltip (ms) |
| className | string | undefined | Additional CSS classes |

### Examples

```tsx
import { Tooltip } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

// Basic usage
<Tooltip content="This is a tooltip">
  <Button>Hover me</Button>
</Tooltip>

// With positioning
<Tooltip content="Tooltip on the right" side="right">
  <Button>Right</Button>
</Tooltip>

<Tooltip content="Tooltip at the bottom" side="bottom">
  <Button>Bottom</Button>
</Tooltip>

// With alignment
<Tooltip content="Aligned to start" align="start">
  <Button>Start aligned</Button>
</Tooltip>

// With custom delay
<Tooltip content="Quick tooltip" delay={300}>
  <Button>Quick hover</Button>
</Tooltip>
```

## ThemeToggle

A component for toggling between light, dark, and system themes.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | undefined | Additional CSS classes |
| showLabel | boolean | false | Whether to show the theme name |
| size | 'default' \| 'sm' \| 'lg' \| 'icon' | 'icon' | Size of the toggle button |

### Examples

```tsx
import { ThemeToggle } from "@/components/ui/theme-toggle";

// Basic usage
<ThemeToggle />

// With label
<ThemeToggle showLabel />

// With custom size
<ThemeToggle size="default" />

// With custom class
<ThemeToggle className="absolute top-4 right-4" />
```

## Animation Utilities

The UI components use Framer Motion for animations. You can also use the animation utilities directly:

```tsx
import { motion } from "framer-motion";
import { fadeIn, slideInLeft, slideInRight, popIn, staggerContainer } from "@/lib/utils";

// Fade in animation
<motion.div
  initial="hidden"
  animate="visible"
  exit="exit"
  variants={fadeIn}
>
  Content that fades in
</motion.div>

// Slide in from left animation
<motion.div
  initial="hidden"
  animate="visible"
  exit="exit"
  variants={slideInLeft}
>
  Content that slides in from left
</motion.div>

// Slide in from right animation
<motion.div
  initial="hidden"
  animate="visible"
  exit="exit"
  variants={slideInRight}
>
  Content that slides in from right
</motion.div>

// Pop in animation with spring physics
<motion.div
  initial="hidden"
  animate="visible"
  exit="exit"
  variants={popIn}
>
  Content that pops in
</motion.div>

// Staggered children animation
<motion.ul
  initial="hidden"
  animate="visible"
  variants={staggerContainer}
>
  <motion.li variants={fadeIn}>Item 1</motion.li>
  <motion.li variants={fadeIn}>Item 2</motion.li>
  <motion.li variants={fadeIn}>Item 3</motion.li>
</motion.ul>
```

## Theme Utilities

The UI components use CSS variables for theming. You can use the theme utilities to programmatically change the theme:

```tsx
import { themeUtils } from "@/lib/utils";

// Get current theme
const currentTheme = themeUtils.getTheme(); // 'dark', 'light', or 'system'

// Set theme
themeUtils.setTheme('dark');
themeUtils.setTheme('light');
themeUtils.setTheme('system');

// Check if dark mode is active
const isDark = themeUtils.isDarkMode();

// Cycle through themes (dark -> light -> system -> dark)
const nextTheme = themeUtils.cycleTheme();

// Initialize theme from localStorage or default
themeUtils.initTheme();
```