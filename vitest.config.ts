import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Git-fixture tests spawn many git processes; the 5s default times out under parallel load.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    globalSetup: ["test/support/buildCli.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: [
        "src/authority/**/*.ts",
        "src/config/**/*.ts",
        "src/diagnostics/*.ts",
        "src/discovery/*.ts",
        "src/gate/*.ts",
        "src/guard/**/*.ts",
        "src/normalizer/*.ts",
        "src/parser/*.ts",
        "src/policy/**/*.ts",
        "src/profiles/productspec/{resolve,validate}.ts",
        "src/query/*.ts",
        "src/receipts/**/*.ts",
        "src/routing/**/*.ts",
        "src/validator/{pathSafety,validateFile,validatePath,validateProfiles,validateSemantics,validateStructure}.ts",
        "src/cli/{adopt,finish,guard,next,work}.ts"
      ],
      thresholds: { statements: 85, branches: 80, functions: 85, lines: 85 },
    },
  },
});
