import React from 'react';
import { cn } from '@/lib/utils';

interface TestComponentProps {
  className?: string;
}

export function TestComponent({ className }: TestComponentProps) {
  return (
    <div className={cn(
      "p-4 bg-primary text-primary-foreground rounded-lg",
      className
    )}>
      <h2 className="text-lg font-bold">Test Component</h2>
      <p className="text-sm">This is a test component to verify that Tailwind CSS styles are working correctly.</p>
    </div>
  );
}