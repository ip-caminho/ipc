import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  // inclui mdx para permitir conteudo estatico (site publico)
  pageExtensions: ["ts", "tsx", "js", "jsx", "mdx"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.yhc.com.br",
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, must-revalidate',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  experimental: {
    optimizeCss: false,
    viewTransition: true,
  },
};

// Sem plugins remark/rehype: mantem compatibilidade com Turbopack (Next 16),
// que exige plugins referenciados por string, nao funcao.
const withMDX = createMDX({});

export default withMDX(nextConfig);
