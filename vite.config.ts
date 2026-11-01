/// <reference types="vitest/config" />
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fontsPlugin, licensesPlugin, playerPlugin } from './build/vite-plugins.ts';

// ツール本体を単一の index.html にビルドする（file:// で開いても動くように）
export default defineConfig({
  base: './',
  plugins: [tailwindcss(), svelte(), playerPlugin(), fontsPlugin(), licensesPlugin(), viteSingleFile()],
  build: {
    chunkSizeWarningLimit: 100_000,
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
