import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@features": path.resolve(__dirname, "features"),
      "@shared": path.resolve(__dirname, "shared"),
      "@convex": path.resolve(__dirname, "convex"),
    },
  },
});
