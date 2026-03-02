import type { Config } from '@react-router/dev/config';
import glob from 'glob';

export default {
  ssr: true,
  future: {
    v8_middleware: true,
    unstable_viteEnvironmentApi: true,
  },
  async prerender() {
    const mdxFiles = glob.sync('docs/**/*.mdx');
    const mdxPaths = mdxFiles.map((file: string) => `/${file.replace('.mdx', '')}`);
    return ['/', ...mdxPaths];
  },
} satisfies Config;
