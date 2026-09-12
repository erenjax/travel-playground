import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig, loadEnv } from 'vite'
import { suggestionsPlugin } from './server/suggestions.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
  plugins: [
    suggestionsPlugin(env.GROK_API_KEY || env.XAI_API_KEY || env.VITE_GROK_API_KEY, env.GROK_MODEL || 'grok-4.6'),
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  }
})
