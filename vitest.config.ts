import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: [
        "src/diagnostics/*.ts",
        "src/discovery/*.ts",
        "src/gate/*.ts",
        "src/normalizer/*.ts",
        "src/parser/*.ts",
        "src/profiles/productspec/{resolve,validate}.ts",
        "src/query/*.ts",
        "src/validator/{pathSafety,validateFile,validatePath,validateProfiles,validateSemantics,validateStructure}.ts"
      ],
      thresholds: { statements: 85, branches: 80, functions: 85, lines: 85 },
    },
  },
});
