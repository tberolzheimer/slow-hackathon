import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "juliaberolzheimer.com",
        pathname: "/wp-content/uploads/**",
      },
    ],
  },
}

export default nextConfig
