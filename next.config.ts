const nextConfig = {
  serverExternalPackages: ["@opentelemetry/api"],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
