# v1 タスク(この順で・1タスク=1コミット目安)

## T1. プロジェクト雛形
Next.js(App Router・TypeScript)を初期化し、CLAUDE.mdの目標ディレクトリを作る。
デザイントークンを `lib/tokens.ts`(または globals.css のCSS変数)に定義。
- [ ] `pnpm dev` が起動し、紙色背景の空ページが出る
- [ ] reference/ 配下はビルド対象外(tsconfig exclude)

## T2. 型とデータ移植
`reference/prototype/types-draft.ts` を `types/` に整備(zenshi/calc/spotの3形式)。
プロトタイプの QUESTIONS を `data/questions/` に1論点1ファイルで分割、
TERMS を `data/terms.ts` に移す。
- [ ] 6テーマすべて型エラーなしで読み込める
- [ ] 文言はプロトタイプから一字も変えない(レビュー済み法的文言のため)

## T3. StorageAdapter
`lib/storage.ts` に StorageAdapter インターフェースと LocalStorageAdapter。
Attempt全件履歴 + 最新結果の導出関数(latestByItem)。
- [ ] リロードしても履歴が残る
- [ ] アプリ側コードは localStorage を直接触らない(Adapter経由のみ)

## T4. エンジン移植
components/engine/ に ZenshiEngine / CalcEngine / SpotEngine。
共通部品: Diagram / TermPopup / Stamp / Eyebrow。
play画面でセッション(範囲選択 → 出題 → 判決)がプロトタイプ同等に動く。
- [ ] プロトタイプと画面・挙動・得点が一致(6テーマ・満点34点)
- [ ] 弱点復習 / 落とした肢だけ再戦 が動く

## T5. SRS
`lib/srs.ts`: 満点→間隔2倍・失点→リセットの簡易SM-2と、
「本日の召喚状」キュー生成(弱点 > 期限切れ > 未着手 > その他)。
- [ ] ユニットテストで間隔計算とキュー順を検証

## T6. ダッシュボード(トップページ)
`reference/design/dashboard-final.html` の 2a を app/page.tsx として実装。
召喚状カード(SRSキュー)/ 検地帳マトリクス(6列)/ 集印カウンタ /
セル詳細パネル / 完璧到達時の朱印スタンプアニメーション。
- [ ] 召喚状の「開廷する」からセッションが始まり、結果がマトリクスに反映される
- [ ] 実データ(T3の履歴)で駆動。モックデータを残さない

## v1でやらないこと
成長グラフ / 新規問題の追加 / Neon / 認証 / 公開・ランキング
