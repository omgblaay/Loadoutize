/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {
    instrumentationHook: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  webpack(config) {
    config.module.rules.push(
      { test: /\.svg$/i, resourceQuery: /raw/, type: "asset/source" },
      { test: /\.svg$/i, resourceQuery: { not: [/raw/] }, type: "asset/resource" },
    );
    return config;
  },
};

export default nextConfig;
