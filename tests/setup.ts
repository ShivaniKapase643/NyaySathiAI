import "@testing-library/jest-dom";
// Set a dummy API key so the Gemini provider can be instantiated in tests
// (even when mocked, some code paths may reach the constructor check)
process.env.GEMINI_API_KEY = "test-api-key-for-vitest";
process.env.RATE_LIMIT_WINDOW_MS = "500";
process.env.RATE_LIMIT_MAX_REQUESTS = "20";
process.env.DAILY_CAP_PER_IP = "1000";
