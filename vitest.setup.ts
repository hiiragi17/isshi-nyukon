/**
 * vitest セットアップ。
 * @testing-library/jest-dom のマッチャ(toBeInTheDocument 等)を vitest の expect に拡張する。
 * lib/ の node 環境テストにも読み込まれるが、副作用は expect の拡張のみで無害。
 */
import "@testing-library/jest-dom/vitest";
