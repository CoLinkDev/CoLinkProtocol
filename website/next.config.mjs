import { createMDX } from 'fumadocs-mdx/next';
import { fileURLToPath } from 'node:url';

const withMDX = createMDX();
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath,
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: repositoryRoot,
  },
};

export default withMDX(nextConfig);
