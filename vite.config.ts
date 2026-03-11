import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },

    proxy: {
      "/api": {
        target: "http://178.16.139.140:5000",
        changeOrigin: true,
        secure: false,
      },
      "/auth": {
        target: "http://178.16.139.140:5000",
        changeOrigin: true,
        secure: false,
      },
      "/uploads": {
        target: "http://178.16.139.140:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },

  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  preview: {
    port: 8080,
    host: true,
  },
}));