# 一肢入魂(isshi-nyukon)

宅建(宅地建物取引士試験)の学習ゲーム。4択を当てるゲームではなく、
**全部の肢に理由をつけて決着をつける**ゲームです。判定(○×) → 誤り箇所タップ →
理由選択 の3段階でスコアリングし、勘の正解では点が伸びません。通勤中などにスマホで、
1セッション5〜10分を想定しています。

> 本アプリは宅建試験の**非公式・個人利用**の学習ツールです。問題は条文・判例に基づく
> 自作で、過去問の転載ではありません。

## 技術構成

- **Next.js(App Router)+ TypeScript + React**
- 永続化は **localStorage のみ**(`lib/storage.ts` の `StorageAdapter` 経由)。
  DB・認証・サーバーAPIは使いません。**環境変数なしで動作**します。
- スタイリングはデザイントークンベース(`lib/tokens.ts` / `app/globals.css`)。
  Webフォント不使用(日本語システムフォントのみ)。
- パッケージマネージャは **pnpm**。

設計の詳細は `CLAUDE.md` と `docs/design-v1.md` を参照してください。

## ローカル開発

```bash
pnpm install       # 依存インストール
pnpm dev           # 開発サーバ起動(http://localhost:3000)
pnpm build         # 本番ビルド
pnpm start         # 本番ビルドの起動
pnpm lint          # Lint
pnpm test          # ユニットテスト(scoring / srs / storage ほか)
```

## Vercel へのデプロイ

完全静的 + クライアント(localStorage)のみで、**DB・環境変数は不要**のため、
Vercel にそのままデプロイできます。

1. GitHub 等のリポジトリを Vercel の **New Project → Import Git Repository** で取り込む。
2. フレームワークは **Next.js** として自動検出される。パッケージマネージャも
   `pnpm-lock.yaml` から **pnpm** が自動選択されるため、ビルド設定の変更は不要
   (Build Command / Output Directory はデフォルトのまま)。
3. **環境変数の設定は不要**。任意で OGP の絶対URLを固定したい場合のみ、
   `NEXT_PUBLIC_SITE_URL`(例: `https://<your-app>.vercel.app`)を設定する。
   未設定でも Vercel が注入する `VERCEL_URL` にフォールバックする。
4. **Deploy** を押すと公開URLが発行される。以降は push で自動デプロイ。

> 公開URLを持つこと自体は Neon(DB)移行のトリガーではありません。成績データは
> 引き続き各端末の localStorage に保存されます(方針: issue #50)。

## ライセンス・著作権

個人開発・個人利用のプロジェクトです。問題の肢は過去問の「論点」だけを借りた自作で、
丸写しではありません。詳細は `CLAUDE.md` の「著作権対応」を参照してください。
