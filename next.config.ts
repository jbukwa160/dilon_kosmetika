import { readFileSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

// Product pictures are hot-linked from the suppliers listed by the last `npm run import`.
const imageHosts: string[] = JSON.parse(readFileSync(path.join(process.cwd(), "data/image-hosts.json"), "utf8"));

const nextConfig: NextConfig = {
  images: {
    remotePatterns: imageHosts.map((hostname) => ({ protocol: "https", hostname })),
    qualities: [75, 85],
    formats: ["image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  // The catalog is read from disk at run time; make sure it travels with the server build.
  outputFileTracingIncludes: { "/**": ["./data/catalog.json"] },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
