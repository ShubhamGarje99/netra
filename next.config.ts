import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

// Next walks up for lockfiles; c:\Users\taseen\ has another package-lock.json, which
// breaks Turbopack workspace root and can leave dev stuck on "Compiling…".
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/favicon.ico",
        destination: "/icon.svg",
      },
    ];
  },
};

export default nextConfig;
