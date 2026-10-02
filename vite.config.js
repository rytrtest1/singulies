import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  server: { port: 5190, strictPort: true, host: true },
  preview: { port: 5191, strictPort: true },
  test: { include: ['tests/unit/**/*.test.js'] },
});
