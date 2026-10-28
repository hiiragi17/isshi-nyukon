import coreWebVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...coreWebVitals,
  {
    // eslint-config-next 16 で追加された React Compiler 系ルール。移植元(プロトタイプ)の
    // 挙動を維持するため、既存コードの書き換えは行わず warn に留める。
    rules: {
      "react-hooks/static-components": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
  { ignores: ["reference/**", "coverage/**"] },
];

export default config;
