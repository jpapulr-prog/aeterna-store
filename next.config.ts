import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/catalogo',
        destination: '/',
      },
      {
        source: '/coleccion',
        destination: '/',
      },
      {
        source: '/producto/:id',
        destination: '/',
      },
      {
        source: '/admin',
        destination: '/',
      },
      {
        source: '/login',
        destination: '/',
      },
    ];
  },
};

export default nextConfig;
