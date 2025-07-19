/**
 * Performance optimization utilities for ChatWindow and message rendering
 */

// Debounce function for scroll events and other high-frequency operations
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
}

// Throttle function for scroll events to improve performance
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Request animation frame wrapper for smooth operations
export function rafThrottle<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;
  
  return function executedFunction(this: any, ...args: Parameters<T>) {
    if (rafId) return;
    
    rafId = requestAnimationFrame(() => {
      func.apply(this, args);
      rafId = null;
    });
  };
}

// Intersection Observer for efficient visibility detection
export class VisibilityObserver {
  private observer: IntersectionObserver;
  private callbacks = new Map<Element, (isVisible: boolean) => void>();
  
  constructor(options: IntersectionObserverInit = {}) {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const callback = this.callbacks.get(entry.target);
        if (callback) {
          callback(entry.isIntersecting);
        }
      });
    }, {
      rootMargin: '100px 0px', // Start loading 100px before element is visible
      threshold: 0.1,
      ...options
    });
  }
  
  observe(element: Element, callback: (isVisible: boolean) => void) {
    this.callbacks.set(element, callback);
    this.observer.observe(element);
  }
  
  unobserve(element: Element) {
    this.callbacks.delete(element);
    this.observer.unobserve(element);
  }
  
  disconnect() {
    this.observer.disconnect();
    this.callbacks.clear();
  }
}

// Memory-efficient message chunking for large conversations
export function chunkMessages<T>(
  messages: T[],
  chunkSize: number = 20
): T[][] {
  const chunks: T[][] = [];
  
  for (let i = 0; i < messages.length; i += chunkSize) {
    chunks.push(messages.slice(i, i + chunkSize));
  }
  
  return chunks;
}

// Efficient scroll position management
export class ScrollPositionManager {
  private element: HTMLElement;
  private isNearBottom = true;
  private threshold = 150;
  private callbacks = new Set<(isNearBottom: boolean) => void>();
  
  constructor(element: HTMLElement, threshold = 150) {
    this.element = element;
    this.threshold = threshold;
    
    // Use throttled scroll handler for better performance
    const handleScroll = throttle(() => {
      this.updatePosition();
    }, 16); // ~60fps
    
    this.element.addEventListener('scroll', handleScroll, { passive: true });
  }
  
  private updatePosition() {
    const { scrollTop, scrollHeight, clientHeight } = this.element;
    const scrollBottom = scrollHeight - scrollTop - clientHeight;
    const wasNearBottom = this.isNearBottom;
    
    this.isNearBottom = scrollBottom < this.threshold;
    
    // Only notify if state changed
    if (wasNearBottom !== this.isNearBottom) {
      this.callbacks.forEach(callback => callback(this.isNearBottom));
    }
  }
  
  onPositionChange(callback: (isNearBottom: boolean) => void) {
    this.callbacks.add(callback);
    
    // Return cleanup function
    return () => {
      this.callbacks.delete(callback);
    };
  }
  
  scrollToBottom(behavior: ScrollBehavior = 'smooth') {
    try {
      this.element.scrollTo({
        top: this.element.scrollHeight,
        behavior
      });
    } catch (error) {
      // Fallback for older browsers
      this.element.scrollTop = this.element.scrollHeight;
    }
  }
  
  getIsNearBottom() {
    return this.isNearBottom;
  }
  
  destroy() {
    this.callbacks.clear();
  }
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics = new Map<string, number[]>();
  
  static getInstance() {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  startMeasure(name: string) {
    performance.mark(`${name}-start`);
  }
  
  endMeasure(name: string) {
    try {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
      
      const measure = performance.getEntriesByName(name, 'measure')[0];
      if (measure) {
        if (!this.metrics.has(name)) {
          this.metrics.set(name, []);
        }
        
        const measurements = this.metrics.get(name)!;
        measurements.push(measure.duration);
        
        // Keep only last 100 measurements
        if (measurements.length > 100) {
          measurements.shift();
        }
      }
      
      // Clean up marks and measures
      performance.clearMarks(`${name}-start`);
      performance.clearMarks(`${name}-end`);
      performance.clearMeasures(name);
    } catch (error) {
      console.warn('Performance measurement failed:', error);
    }
  }
  
  getAverageTime(name: string): number {
    const measurements = this.metrics.get(name);
    if (!measurements || measurements.length === 0) return 0;
    
    return measurements.reduce((sum, time) => sum + time, 0) / measurements.length;
  }
  
  getMetrics() {
    const result: Record<string, { average: number; count: number }> = {};
    
    this.metrics.forEach((measurements, name) => {
      result[name] = {
        average: this.getAverageTime(name),
        count: measurements.length
      };
    });
    
    return result;
  }
  
  clearMetrics() {
    this.metrics.clear();
  }
}

// React hook for performance monitoring
export function usePerformanceMonitor(name: string) {
  const monitor = PerformanceMonitor.getInstance();
  
  return {
    start: () => monitor.startMeasure(name),
    end: () => monitor.endMeasure(name),
    getAverage: () => monitor.getAverageTime(name)
  };
}

// Memory usage utilities
export function getMemoryUsage() {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return {
      used: Math.round(memory.usedJSHeapSize / 1048576), // MB
      total: Math.round(memory.totalJSHeapSize / 1048576), // MB
      limit: Math.round(memory.jsHeapSizeLimit / 1048576) // MB
    };
  }
  return null;
}

// Efficient array comparison for memoization
export function shallowCompareArrays<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  
  return true;
}

// Deep comparison for objects (use sparingly)
export function deepCompare(a: any, b: any): boolean {
  if (a === b) return true;
  
  if (a == null || b == null) return false;
  
  if (typeof a !== typeof b) return false;
  
  if (typeof a !== 'object') return a === b;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepCompare(a[key], b[key])) return false;
  }
  
  return true;
}

// Batch DOM updates for better performance
export function batchDOMUpdates(callback: () => void) {
  requestAnimationFrame(() => {
    callback();
  });
}

// Efficient event delegation
export class EventDelegator {
  private element: HTMLElement;
  private handlers = new Map<string, Map<string, (event: Event) => void>>();
  
  constructor(element: HTMLElement) {
    this.element = element;
    this.element.addEventListener('click', this.handleEvent.bind(this));
    this.element.addEventListener('keydown', this.handleEvent.bind(this));
  }
  
  private handleEvent(event: Event) {
    const target = event.target as HTMLElement;
    const eventHandlers = this.handlers.get(event.type);
    
    if (!eventHandlers) return;
    
    // Walk up the DOM tree to find matching selectors
    let currentElement: HTMLElement | null = target;
    
    while (currentElement && currentElement !== this.element) {
      eventHandlers.forEach((handler, selector) => {
        if (currentElement!.matches(selector)) {
          handler(event);
        }
      });
      
      currentElement = currentElement.parentElement;
    }
  }
  
  on(eventType: string, selector: string, handler: (event: Event) => void) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Map());
    }
    
    this.handlers.get(eventType)!.set(selector, handler);
  }
  
  off(eventType: string, selector: string) {
    const eventHandlers = this.handlers.get(eventType);
    if (eventHandlers) {
      eventHandlers.delete(selector);
    }
  }
  
  destroy() {
    this.handlers.clear();
  }
}