import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Codigo gerado pelo Convex — nao deve ser lintado.
    "convex/_generated/**",
  ]),
  {
    // Divida de tipos legada: visivel como warning (nao bloqueia o lint), a ser
    // paga incrementalmente. Codigo novo deve evitar `any`. Ver issue de limpeza.
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      // O Convex gera tipos profundos que disparam TS2589 em useQuery; permitir
      // a supressao desde que descrita (ex: "// @ts-ignore Convex TS2589").
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-ignore": "allow-with-description",
          "ts-expect-error": "allow-with-description",
          minimumDescriptionLength: 3,
        },
      ],
      // Regras novas do React Compiler (eslint-plugin-react-hooks v6): sinalizam
      // padroes legados pervasivos. Mantidas como warning (visiveis, nao
      // bloqueiam) ate serem pagas. Ver issue de limpeza.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/refs": "warn",
    },
  },
]);

export default eslintConfig;
