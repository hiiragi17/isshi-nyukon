// CSS の副作用 import (例: `import "./globals.css"`) の型宣言。
// TypeScript 6 では noUncheckedSideEffectImports が既定で有効になり、宣言が無いとエラーになる。
declare module "*.css";
