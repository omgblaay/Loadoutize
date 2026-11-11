/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    formats: ["image/avif", "image/webp"],
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
