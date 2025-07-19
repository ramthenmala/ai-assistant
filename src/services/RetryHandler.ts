// Retry handler for model service operations with exponential backoff
export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBackoff: boolean;
  jitter: boolean;
  retryCondition?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalDuration: number;
}

export class RetryHandler {
  private options: Required<RetryOptions>;

  constructor(options: Partial<RetryOptions> = {}) {
    this.options = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      exponentialBackoff: true,
      jitter: true,
      retryCondition: (error: Error) => this.shouldRetry(error),
      onRetry: () => {},
      ...options
    };
  }

  async execute<T>(operation: () => Promise<T>): Promise<RetryResult<T>> {
    const startTime = Date.now();
    let lastError: Error | undefined;
    let attempts = 0;

    while (attempts < this.options.maxAttempts) {
      attempts++;
      
      try {
        const result = await operation();
        return {
          success: true,
          result,
          attempts,
          totalDuration: Date.now() - startTime
        };
      } catch (error) {
        lastError = error as Error;
        
        // Check if we should retry this error
        if (!this.options.retryCondition(lastError)) {
          break;
        }
        
        // Don't wait after the last attempt
        if (attempts < this.options.maxAttempts) {
          this.options.onRetry(attempts, lastError);
          await this.delay(attempts);
        }
      }
    }

    return {
      success: false,
      error: lastError,
      attempts,
      totalDuration: Date.now() - startTime
    };
  }

  private async delay(attempt: number): Promise<void> {
    let delay = this.options.baseDelay;
    
    if (this.options.exponentialBackoff) {
      delay = Math.min(
        this.options.baseDelay * Math.pow(2, attempt - 1),
        this.options.maxDelay
      );
    }
    
    if (this.options.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private shouldRetry(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    // Retry on network errors
    if (message.includes('network') || 
        message.includes('timeout') || 
        message.includes('connection') ||
        message.includes('fetch')) {
      return true;
    }
    
    // Retry on rate limiting
    if (message.includes('rate limit') || 
        message.includes('too many requests') ||
        message.includes('429')) {
      return true;
    }
    
    // Retry on temporary server errors
    if (message.includes('500') || 
        message.includes('502') || 
        message.includes('503') || 
        message.includes('504')) {
      return true;
    }
    
    // Don't retry on client errors (4xx except 429)
    if (message.includes('400') || 
        message.includes('401') || 
        message.includes('403') || 
        message.includes('404')) {
      return false;
    }
    
    // Don't retry on API key issues
    if (message.includes('api key') || 
        message.includes('unauthorized') || 
        message.includes('authentication')) {
      return false;
    }
    
    // Default: retry for unknown errors
    return true;
  }
}

// Enhanced model service with retry logic
export class RetryableModelService {
  private retryHandler: RetryHandler;
  
  constructor(retryOptions: Partial<RetryOptions> = {}) {
    this.retryHandler = new RetryHandler({
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      exponentialBackoff: true,
      jitter: true,
      onRetry: (attempt, error) => {
        console.warn(`Model service retry attempt ${attempt} after error:`, error.message);
      },
      ...retryOptions
    });
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string = 'Model operation'
  ): Promise<T> {
    const result = await this.retryHandler.execute(operation);
    
    if (result.success) {
      return result.result!;
    }
    
    // Log retry information
    console.error(`${context} failed after ${result.attempts} attempts (${result.totalDuration}ms):`, result.error);
    
    throw result.error;
  }
}

// Circuit breaker pattern for model services
export class CircuitBreaker {
  private failureCount = 0;
  private nextAttempt = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private maxFailures: number = 5,
    private timeout: number = 60000,
    private onStateChange?: (state: string) => void
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
      this.onStateChange?.('HALF_OPEN');
    }

    try {
      const result = await operation();
      
      if (this.state === 'HALF_OPEN') {
        this.reset();
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure(): void {
    this.failureCount++;
    
    if (this.failureCount >= this.maxFailures) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      this.onStateChange?.('OPEN');
    }
  }

  private reset(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.nextAttempt = 0;
    this.onStateChange?.('CLOSED');
  }

  getState(): string {
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }
}

// Rate limiter for API calls
export class RateLimiter {
  private requests: number[] = [];

  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60000
  ) {}

  async acquire(): Promise<void> {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(
      timestamp => now - timestamp < this.windowMs
    );
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.acquire();
      }
    }
    
    this.requests.push(now);
  }

  getRemainingRequests(): number {
    const now = Date.now();
    this.requests = this.requests.filter(
      timestamp => now - timestamp < this.windowMs
    );
    return Math.max(0, this.maxRequests - this.requests.length);
  }
}

// Timeout wrapper for operations
export class TimeoutHandler {
  static async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    timeoutMessage: string = 'Operation timed out'
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });

    return Promise.race([operation(), timeoutPromise]);
  }
}

// Combined resilience handler
export class ResilienceHandler {
  private retryHandler: RetryHandler;
  private circuitBreaker: CircuitBreaker;
  private rateLimiter: RateLimiter;

  constructor(
    retryOptions: Partial<RetryOptions> = {},
    circuitBreakerOptions: {
      maxFailures?: number;
      timeout?: number;
    } = {},
    rateLimitOptions: {
      maxRequests?: number;
      windowMs?: number;
    } = {}
  ) {
    this.retryHandler = new RetryHandler(retryOptions);
    this.circuitBreaker = new CircuitBreaker(
      circuitBreakerOptions.maxFailures,
      circuitBreakerOptions.timeout,
      (state) => console.info(`Circuit breaker state changed to: ${state}`)
    );
    this.rateLimiter = new RateLimiter(
      rateLimitOptions.maxRequests,
      rateLimitOptions.windowMs
    );
  }

  async execute<T>(
    operation: () => Promise<T>,
    timeoutMs: number = 30000,
    context: string = 'Operation'
  ): Promise<T> {
    // Apply rate limiting
    await this.rateLimiter.acquire();
    
    // Execute with circuit breaker, retry logic, and timeout
    const result = await this.retryHandler.execute(async () => {
      return await this.circuitBreaker.execute(async () => {
        return await TimeoutHandler.executeWithTimeout(
          operation,
          timeoutMs,
          `${context} timed out after ${timeoutMs}ms`
        );
      });
    });

    if (result.success) {
      return result.result!;
    }

    throw result.error;
  }

  getStatus() {
    return {
      circuitBreakerState: this.circuitBreaker.getState(),
      failureCount: this.circuitBreaker.getFailureCount(),
      remainingRequests: this.rateLimiter.getRemainingRequests()
    };
  }
}