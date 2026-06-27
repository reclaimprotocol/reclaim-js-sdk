import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  server: {
    allowedHosts: true
  },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  optimizeDeps: {
    // The local `@reclaimprotocol/js-sdk` dependency (linked via "../") ships a
    // CommonJS bundle. Vite skips dependency pre-bundling for linked packages by
    // default, which leaves the browser unable to load the CJS module. Forcing it
    // into `include` makes Vite pre-bundle (CJS -> ESM) it like any other dep.
    include: ['@reclaimprotocol/js-sdk'],
  },
})
