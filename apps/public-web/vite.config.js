import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../..', '')
  const port = Number(env.PUBLIC_WEB_PORT || 5173)

  return {
    envDir: '../..',
    plugins: [vue()],
    server: { port, strictPort: true },
    preview: { port, strictPort: true }
  }
})
