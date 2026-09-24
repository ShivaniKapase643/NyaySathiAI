// @ts-check
/** @type {import("next").NextConfig} */

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self' https://generativelanguage.googleapis.com",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

// Cache headers for static assets — improves Lighthouse performance + efficiency score
const staticCacheHeaders = [
  {
    key: "Cache-Control",
    value: "public, max-age=31536000, immutable",
  },
];

const nextConfig = {
  // Enable gzip/brotli compression for all responses
  compress: true,

  // Power header removed — reduces fingerprinting
  poweredByHeader: false,

  async headers() {
    return [
      // Security headers on all routes
      { source: "/(.*)", headers: securityHeaders },
      // Long-lived cache on Next.js static chunks (content-hashed filenames)
      {
        source: "/_next/static/(.*)",
        headers: staticCacheHeaders,
      },
      // Cache public assets
      {
        source: "/(.*)\\.(ico|png|jpg|jpeg|svg|webp|woff2|woff)",
        headers: staticCacheHeaders,
      },
    ];
  },

  // Reduce bundle size by marking large server-only packages as external
  experimental: {
    serverComponentsExternalPackages: ["@google/genai", "pdfjs-dist"],
  },

  webpack: (config, { isServer }) => {
    // Prevent canvas (pdfjs optional dep) from breaking browser build
    if (!isServer) {
      config.resolve.alias["canvas"] = false;
    }
    return config;
  },
};

export default nextConfig;
