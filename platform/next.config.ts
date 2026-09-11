import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
  },
  // P2-8 (FINAL-CLOSURE-PLAN): transpilar Recharts para que su ESM
  // sea compatible con Next.js 15 webpack en build time. Sin esto,
  // `extends PureComponent` falla con "Super expression must either
  // be null or a function" en /metas/convenio (que usa PieChart).
  transpilePackages: ["recharts"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
