const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self'", // 'unsafe-eval' and 'unsafe-inline' intentionally omitted from prod; use a nonce for inline scripts if needed
      "worker-src 'self' blob:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://models.dev",
      "font-src 'self' https://fonts.gstatic.com https://frontend-cdn.perplexity.ai",
      "connect-src 'self' https://ai.hackclub.com https://api.supermemory.ai https://search.hackclub.com blob:",
      "media-src 'self'",
      "manifest-src 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig = {
  serverExternalPackages: ["@opentelemetry/api"],
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
