import { defineConfig } from "vitest/config";
import path from "path";

const aliases = {
  "@": path.resolve(__dirname, "."),
  "@features": path.resolve(__dirname, "features"),
  "@shared": path.resolve(__dirname, "shared"),
  "@convex": path.resolve(__dirname, "convex"),
};

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: [
            "shared/**/__tests__/**/*.test.ts",
            "features/**/__tests__/**/*.test.ts",
            "convex/**/__tests__/**/*.test.ts",
          ],
          exclude: ["**/*.integration.test.ts"],
          environment: "node",
        },
        resolve: { alias: aliases },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["convex/**/*.integration.test.ts"],
          environment: "edge-runtime",
        },
        resolve: { alias: aliases },
      },
    ],
  },
});
