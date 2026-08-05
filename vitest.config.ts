import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: [
        "src/parser/parseMarkdown.ts",
        "src/normalizer/*.ts",
        "src/validator/pathSafety.ts",
        "src/query/applicability.ts"
      ],
      thresholds: { statements: 85, branches: 80, functions: 85, lines: 85 },
    },
  },
});
