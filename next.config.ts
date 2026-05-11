import type { NextConfig } from "next";

const appBasePath = process.env.NEXT_PUBLIC_APP_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  ...(appBasePath ? { basePath: appBasePath, assetPrefix: appBasePath } : {}),
  env: {
    NEXT_PUBLIC_APP_BASE_PATH: appBasePath,
    NEXT_PUBLIC_API_BASE_URL:
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.VITE_API_BASE_URL ||
      "/api",
    NEXT_PUBLIC_VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || "",
  },
};

export default nextConfig;
