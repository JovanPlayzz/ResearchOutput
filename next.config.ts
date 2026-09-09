import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Turbopack scoped to this folder (the parent has a stray package-lock.json).
  turbopack: { root: process.cwd() },
  // The floating dev badge sat on top of the sidebar footer.
  devIndicators: false,
  // The database client loads a native module for local files; keep it out of the bundler.
  serverExternalPackages: ["@libsql/client", "libsql"],
  experimental: {
    serverActions: {
      // Assignment submissions can include a file attachment.
      bodySizeLimit: "25mb",
      // Forms still work when the site is shared through a Tailscale Funnel address (`npm run share`).
      allowedOrigins: ["*.ts.net"],
    },
  },
};

export default nextConfig;
