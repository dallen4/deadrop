import mdx from '@mdx-js/rollup';
import { reactRouter } from '@react-router/dev/vite';
import remarkFrontmatter from 'remark-frontmatter';
import { defineConfig, PluginOption } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { cloudflare } from '@cloudflare/vite-plugin';

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    mdx({ remarkPlugins: [remarkFrontmatter] }) as PluginOption,
    reactRouter(),
    tsconfigPaths(),
  ],
  optimizeDeps: {
    exclude: ['virtual:react-router/server-build'],
  },
});
