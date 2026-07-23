import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm'],
  platform: 'browser',
  target: 'es2022',
  dts: true,
  clean: true,
  minify: true,
  treeshake: true,
  sourcemap: true,
  outDir: 'dist',
  // Bundle Shaka as an internal lazy chunk (renamed "mse") so the core entry
  // stays tiny — it only loads when a manifest actually needs MSE.
  noExternal: [/shaka-player/],
  outputOptions: {
    chunkFileNames: (info) => `${(info.name || 'chunk').includes('shaka') ? 'mse' : info.name}-[hash].js`,
  },
});
