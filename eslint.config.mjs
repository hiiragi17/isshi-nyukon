import coreWebVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...coreWebVitals,
  { ignores: ["reference/**", "coverage/**"] },
];

export default config;
