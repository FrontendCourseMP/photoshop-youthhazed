import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Для GitHub Pages проектная страница публикуется по пути /<repo>/,
// поэтому base задаётся только для сборки. В dev-режиме остаётся "/".
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/photoshop-youthhazed/' : '/',
  plugins: [react()],
}));
