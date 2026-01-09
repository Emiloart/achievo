/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  async headers() {
    if (process.env.NODE_ENV !== "development") return [];
    const connectSrc = ["'self'", "ws:", "wss:", "data:"];
    if (process.env.BASE_SEPOLIA_RPC) {
      connectSrc.push(process.env.BASE_SEPOLIA_RPC);
    }
    // Allow Base public RPC as fallback for dev
    connectSrc.push("https://sepolia.base.org", "https://base-sepolia.g.alchemy.com");
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      // Allow https images (e.g. IPFS gateways) in dev to prevent broken avatars.
      "img-src 'self' data: blob: https:",
      `connect-src ${connectSrc.join(" ")}`,
    ].join("; ");
    return [
      {
        source: "/(.*)",
        headers: [{ key: "Content-Security-Policy", value: csp }],
      },
    ];
  },
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = { ...(config.resolve.alias || {}), "pino-pretty": false };
    return config;
  },
};

export default nextConfig;
