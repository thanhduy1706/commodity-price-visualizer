/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude puppeteer and related packages from server-side webpack bundling
      config.externals = [
        ...config.externals,
        "puppeteer",
        "puppeteer-extra",
        "puppeteer-extra-plugin-stealth",
      ]
    }
    return config
  },
}

module.exports = nextConfig
