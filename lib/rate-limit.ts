import { getRuntimeValue } from "./runtime-env";

type RateLimitRule = {
  windowSeconds: number;
  maxRequests: number;
};

const DEFAULT_RULES: Record<string, RateLimitRule> = {
  login: { windowSeconds: 300, maxRequests: 10 },
  recommend: { windowSeconds: 60, maxRequests: 30 },
  checkout: { windowSeconds: 60, maxRequests: 10 },
  webhook: { windowSeconds: 60, maxRequests: 60 },
};

// In-memory sliding-window buckets. Suitable for a single worker instance;
// for multi-region deployments, back this with a shared KV store instead.
const buckets = new Map<string, number[]>();

function ruleFor(name: string): RateLimitRule {
  const fallback = DEFAULT_RULES[name];
  if (!fallback) return { windowSeconds: 60, maxRequests: 30 };
  const maxRequests = Number(
    getRuntimeValue(`RATE_LIMIT_${name.toUpperCase()}_MAX`) ?? fallback.maxRequests,
  );
  const windowSeconds = Number(
    getRuntimeValue(`RATE_LIMIT_${name.toUpperCase()}_WINDOW_SECONDS`) ?? fallback.windowSeconds,
  );
  if (!Number.isFinite(maxRequests) || maxRequests < 1) return fallback;
  if (!Number.isFinite(windowSeconds) || windowSeconds < 1) return fallback;
  return { windowSeconds, maxRequests };
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }
  return request.headers.get("cf-connecting-ip") ?? "unknown";
}

export function checkRateLimit(
  key: string,
  name: string,
): { allowed: boolean; retryAfterSeconds: number } {
  const rule = ruleFor(name);
  const now = Date.now();
  const bucketKey = `${name}:${key}`;
  const timestamps = (buckets.get(bucketKey) ?? []).filter(
    (t) => now - t < rule.windowSeconds * 1000,
  );

  if (timestamps.length >= rule.maxRequests) {
    const oldest = timestamps[0];
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldest + rule.windowSeconds * 1000 - now) / 1000),
    );
    return { allowed: false, retryAfterSeconds };
  }

  timestamps.push(now);
  buckets.set(bucketKey, timestamps);
  return { allowed: true, retryAfterSeconds: 0 };
}

export function rateLimitResponse(retryAfterSeconds: number) {
  return Response.json(
    { error: "Too many requests. Please wait a moment and try again." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}