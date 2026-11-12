import type { NextConfig } from "next";

// Supabase serves product photos and the API. Its origin is the only third party the page talks to.
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
  : "";

// Static pages can't carry per-request nonces, so inline scripts are allowed (Next's hydration payload is inline).
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""),
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabase}`.trim(),
  "font-src 'self'",
  `connect-src 'self' ${supabase}`.trim(),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const dashboardCsp = csp
  .replace(/connect-src ([^;]*)/, "connect-src $1 https://huggingface.co https://*.hf.co")
  .replace(/script-src ([^;]*)/, "script-src $1 'wasm-unsafe-eval'")
  .concat("; worker-src 'self' blob:");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  // Cache Components stay off: OpenNext Cloudflare has open bugs with them (D-020).
  // Next image optimisation is paid on Cloudflare; photos are pre-sized and served as-is (D-011).
  images: { unoptimized: true },
  poweredByHeader: false,
  turbopack: {
    rules: {
      // Only the Tailwind entry file. A "*.css" rule also turned CSS Modules into global CSS and dropped their class names.
      "globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The team editor also downloads the background-removal model from Hugging Face (D-036). Shop pages never do.
      { source: "/dashboard/:path*", headers: [{ key: "Content-Security-Policy", value: dashboardCsp }] },
      { source: "/dashboard", headers: [{ key: "Content-Security-Policy", value: dashboardCsp }] },
    ];
  },
};

export default nextConfig;

import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());
