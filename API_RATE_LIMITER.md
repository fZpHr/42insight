# API Rate Limiter

This rate limiting system optimizes calls to the 42 API to avoid 429 (Too Many Requests) errors.

## Features

### 1. **Queue System**
All API requests go through a queue that processes them sequentially, preventing API overload.

### 2. **Token Rotation**
The system uses up to 6 different API tokens in rotation, multiplying the rate limit by the number of available tokens.

### 3. **Retry with Exponential Backoff**
In case of 429 error:
- First attempt: waits 1 second
- Second attempt: waits 2 seconds
- Third attempt: waits 4 seconds
- Maximum 3 attempts before giving up

### 4. **Minimum delay between requests**
A minimum delay of 100ms is enforced between each request to avoid spamming the API.

### 5. **Cache with stale data**
If the rate limit is reached and cached data exists (even if expired), it is returned rather than completely failing.

## Configuration

### Required environment variables

The system tries to use up to 6 credential pairs:

```env
# Token 1 (required)
NEXT_PUBLIC_CLIENT_ID=your_client_id
CLIENT_SECRET_NEXT1=your_client_secret

# Tokens 2-6 (optional, but recommended)
CLIENT_ID2=your_client_id_2
CLIENT_SECRET2=your_client_secret_2

CLIENT_ID3=your_client_id_3
CLIENT_SECRET3=your_client_secret_3

CLIENT_ID4=your_client_id_4
CLIENT_SECRET4=your_client_secret_4

CLIENT_ID5=your_client_id_5
CLIENT_SECRET5=your_client_secret_5

CLIENT_ID6=your_client_id_6
CLIENT_SECRET6=your_client_secret_6
```

The more tokens you have, the better the performance and resilience against rate limiting.

## Usage

### In API routes

```typescript
import { apiRateLimiter } from "@/lib/api-rate-limiter";

// Instead of:
// const response = await fetch(`https://api.intra.42.fr/v2/users/${login}`);

// Use:
const response = await apiRateLimiter.fetch(`/users/${login}`);
```

The rate limiter automatically handles:
- Managing the authentication token
- Queueing the request
- Respecting delays
- Retrying on 429 errors

### Monitoring

```typescript
// See current queue size
const queueSize = apiRateLimiter.getQueueSize();
console.log(`Pending requests: ${queueSize}`);

// Clear the queue (useful for cleanup)
apiRateLimiter.clearQueue();
```

## Modified files

The following files have been updated to use the rate limiter:

- `/app/api/users/[login]/intra/route.tsx` - User data
- `/app/api/users/[login]/events/route.tsx` - User events
- `/app/api/events/[campus_name]/route.tsx` - Campus events
- `/app/api/events/[campus_name]/[event_id]/subscribers/route.tsx` - Event subscribers
- `/app/api/events/[campus_name]/[event_id]/feedbacks/route.tsx` - Event feedbacks

## Benefits

1. **Drastic reduction of 429 errors** - Requests are spaced out and intelligently managed
2. **Better quota utilization** - Token rotation multiplies capacity
3. **Resilience** - In case of rate limit, automatic retry or stale cache fallback
4. **Performance** - Client-side parallel requests are sequenced server-side
5. **Transparency** - Client code doesn't need to be modified, just replace `fetch` with `apiRateLimiter.fetch`

## Logs

The system logs important information:

```
[API Rate Limiter] Initialized with 6 tokens
[API Rate Limiter] Rate limited, retrying...
[API Rate Limiter] Max retries reached for request
[WARN] Rate limited fetching user hbelle. Serving stale cache.
```

## Notes

- The system is a singleton, there's only one shared instance in the entire application
- Tokens are retrieved on first call and reused
- The queue is automatically processed as soon as a request arrives
- In production, configure as many tokens as possible for better performance
