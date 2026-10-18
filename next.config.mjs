/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Documentos de verificação até 10 MB (limite do bucket "documentos").
    serverActions: { bodySizeLimit: '11mb' },
  },
};

export default nextConfig;
