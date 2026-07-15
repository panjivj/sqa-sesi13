import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../..', '')
  const port = Number(env.ADMIN_DASHBOARD_PORT || 5174)

  return {
    envDir: '../..',
    plugins: [vue()],
    server: { port, strictPort: true },
    preview: { port, strictPort: true }
  }
})
