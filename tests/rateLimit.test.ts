/**
 * Tests for the in-memory sliding-window rate limiter.
 */
import { describe, it, expect, beforeEach } from "vitest";

// Set env BEFORE importing the module (vitest hoists vi.mock but not process.env)
process.env.RATE_LIMIT_WINDOW_MS = "500";
process.env.RATE_LIMIT_MAX_REQUESTS = "3";
process.env.DAILY_CAP_PER_IP = "100";

import { checkRateLimit, clearRateLimitStore } from "@/lib/security/rateLimit";

// Use a counter to generate unique IPs per test to avoid cross-test pollution
let ipCounter = 100;
function nextIP(): string {
  return "192.168." + Math.floor(ipCounter / 256) + "." + (ipCounter++ % 256);
}

describe("checkRateLimit", () => {
  beforeEach(() => {
    clearRateLimitStore();
  });

  it("allows requests within the limit", () => {
    const ip = nextIP();
    expect(checkRateLimit(ip).allowed).toBe(true);
    expect(checkRateLimit(ip).allowed).toBe(true);
    expect(checkRateLimit(ip).allowed).toBe(true);
  });

  it("blocks after exceeding the window limit", () => {
    const ip = nextIP();
    checkRateLimit(ip); // 1
    checkRateLimit(ip); // 2
    checkRateLimit(ip); // 3
    const result = checkRateLimit(ip); // 4 -- should be blocked
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("window");
  });

  it("returns a retryAfterMs for blocked requests", () => {
    const ip = nextIP();
    checkRateLimit(ip);
    checkRateLimit(ip);
    checkRateLimit(ip);
    const result = checkRateLimit(ip);
    expect(result.allowed).toBe(false);
    expect(typeof result.retryAfterMs).toBe("number");
    expect(result.retryAfterMs!).toBeGreaterThan(0);
  });

  it("different IPs are tracked independently", () => {
    const ip1 = nextIP();
    const ip2 = nextIP();
    checkRateLimit(ip1);
    checkRateLimit(ip1);
    checkRateLimit(ip1);
    checkRateLimit(ip1); // ip1 blocked

    expect(checkRateLimit(ip2).allowed).toBe(true);
  });

  it("allows requests after window resets", async () => {
    const ip = nextIP();
    checkRateLimit(ip);
    checkRateLimit(ip);
    checkRateLimit(ip);
    expect(checkRateLimit(ip).allowed).toBe(false);

    // Wait for window (500ms + 100ms buffer)
    await new Promise((r) => setTimeout(r, 650));
    expect(checkRateLimit(ip).allowed).toBe(true);
  }, 3000);
});
