/**
 * API Rate Limiter for 42 API
 * Handles rate limiting, retry logic, and token rotation
 */

interface QueuedRequest {
  execute: () => Promise<Response>;
  resolve: (value: Response) => void;
  reject: (reason?: any) => void;
  retries: number;
}

class ApiRateLimiter {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private lastRequestTime = 0;
  private minDelay = 100; // Minimum delay between requests in ms
  private maxRetries = 3;
  private retryDelay = 1000; // Initial retry delay in ms
  
  // Token rotation
  private tokens: string[] = [];
  private currentTokenIndex = 0;

  async initTokens() {
    if (this.tokens.length > 0) return;

    const tokenPromises = [];
    
    const clientId1 = process.env.NEXT_PUBLIC_CLIENT_ID;
    const clientSecret1 = process.env.CLIENT_SECRET_NEXT1;
    if (clientId1 && clientSecret1) {
      tokenPromises.push(
        this.getToken(clientId1, clientSecret1).catch(err => {
          console.warn(`Failed to get token 1:`, err.message);
          return null;
        })
      );
    }

    for (let i = 2; i <= 6; i++) {
      const clientId = process.env[`CLIENT_ID${i}`];
      const clientSecret = process.env[`CLIENT_SECRET${i}`];
      
      if (clientId && clientSecret) {
        tokenPromises.push(
          this.getToken(clientId, clientSecret).catch(err => {
            console.warn(`Failed to get token ${i}:`, err.message);
            return null;
          })
        );
      }
    }

    const tokens = await Promise.all(tokenPromises);
    this.tokens = tokens.filter((t): t is string => t !== null);
    
    if (this.tokens.length === 0) {
      throw new Error('Failed to obtain any API tokens');
    }
    
    console.log(`[API Rate Limiter] Initialized with ${this.tokens.length} tokens`);
  }

  private async getToken(clientId: string, clientSecret: string): Promise<string | null> {
    try {
      const response = await fetch("https://api.intra.42.fr/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      return null;
    }
  }

  private getNextToken(): string {
    if (this.tokens.length === 0) {
      throw new Error('No tokens available');
    }
    const token = this.tokens[this.currentTokenIndex];
    this.currentTokenIndex = (this.currentTokenIndex + 1) % this.tokens.length;
    return token;
  }

  async fetch(path: string, options: RequestInit = {}): Promise<Response> {
    await this.initTokens();

    return new Promise((resolve, reject) => {
      const execute = async (): Promise<Response> => {
        const token = this.getNextToken();
        return fetch(`https://api.intra.42.fr/v2${path}`, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${token}`,
          },
        });
      };

      this.queue.push({
        execute,
        resolve,
        reject,
        retries: 0,
      });

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;

      // Wait if we need to respect the minimum delay
      if (timeSinceLastRequest < this.minDelay) {
        await this.sleep(this.minDelay - timeSinceLastRequest);
      }

      const request = this.queue.shift()!;
      this.lastRequestTime = Date.now();

      try {
        const response = await request.execute();

        // Handle rate limiting
        if (response.status === 429) {
          console.warn('[API Rate Limiter] Rate limited, retrying...');
          
          if (request.retries < this.maxRetries) {
            // Exponential backoff
            const delay = this.retryDelay * Math.pow(2, request.retries);
            await this.sleep(delay);
            
            request.retries++;
            this.queue.unshift(request); // Put it back at the front
            continue;
          } else {
            console.error('[API Rate Limiter] Max retries reached for request');
            request.resolve(response); // Return the 429 response
            continue;
          }
        }

        request.resolve(response);
      } catch (error) {
        console.error('[API Rate Limiter] Request failed:', error);
        request.reject(error);
      }
    }

    this.processing = false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get the queue size for monitoring
  getQueueSize(): number {
    return this.queue.length;
  }

  // Clear the queue (useful for cleanup)
  clearQueue() {
    this.queue.forEach(req => {
      req.reject(new Error('Queue cleared'));
    });
    this.queue = [];
  }
}

// Singleton instance
export const apiRateLimiter = new ApiRateLimiter();
