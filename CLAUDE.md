# 一肢入魂(isshi-nyukon)

宅建(宅地建物取引士試験)学習ゲーム。4択を当てるゲームではなく、
全部の肢に理由をつけて決着をつけるゲーム。個人開発・個人利用(当面)。

## 現在地(シード段階)

まだNext.jsプロジェクトは未生成。このリポジトリには設計資料と移植元プロトタイプ
だけがある状態。作業は `docs/tasks-v1.md` の **T1(プロジェクト雛形)から順に** 進める。

- 設計の全体像: `docs/design-v1.md`(ジャンルカタログ・スキーマ・アーキテクチャ・ロードマップ)
- v1の作業手順と受け入れ条件: `docs/tasks-v1.md`
- 移植元(正): `reference/prototype/takken-zenshi-game.jsx`(挙動・見た目)/
  `reference/design/dashboard-final.html`(ダッシュボード)/ `reference/prototype/types-draft.ts`(型の出発点)
- `reference/` 配下は編集・import・ビルド対象にしない(移植元として参照するだけ)

## 最重要ルール

- **移植であって作り直しではない。** `reference/prototype/takken-zenshi-game.jsx` が
  挙動・見た目の正。迷ったらプロトタイプに合わせる
- 技術判断で迷ったら本ファイルの「既決事項」を優先。覆したい場合は実装前に提案・確認する
- タスクは `docs/tasks-v1.md` の順に、1タスク=1コミット単位で進める

## 技術スタック(v1)

- Next.js(App Router)+ TypeScript + React
- 永続化: localStorage(`lib/storage.ts` の `StorageAdapter` 経由でのみアクセス)
- DB・認証・サーバーAPIは v1 では使わない
- スタイリング: プロトタイプ同様のデザイントークンベース。CSSはトークン定数を参照する

## 既決事項(蒸し返さない)

- **ストレージ抽象化**: `StorageAdapter` インターフェース(getAttempts / saveAttempt)。
  v1はLocalStorageAdapter。将来のNeon移行はAdapter差し替えのみで済む設計を守る
- **成績データ**: `Attempt`(questionId, choiceIndex, pts, max, answeredAt)を全件履歴で保存。
  弱点判定=最新結果 / SRS=最終挑戦日 / 成長グラフ=全履歴
- **SRS**: SM-2簡易版(満点→間隔2倍、失点→リセット)。出題キューの優先度は
  弱点 > 復習期限切れ > 未着手 > その他
- **問題形式は3種**: `zenshi`(全肢判定)/ `calc`(途中式ビルダー)/ `spot`(間違い探し)。
  型は `reference/prototype/types-draft.ts` を出発点に `types/` へ整備
- **問題データ**: 過去問の丸写し禁止。条文・判例ベースの自作のみ。
  `data/questions/{kenri|gyoho|horei|zei}/` に1論点1ファイル
- **ダッシュボード**(トップページ): `reference/design/dashboard-final.html` の
  2a「検地帳×集印」を実装。マトリクスは1行6列固定(390px幅でタップ領域約50px確保のため)
- **spot広告レイアウト**: 現状ハードコードでよい。データ駆動化は広告2枚目を作る時に判断

## デザイントークン(プロトタイプと同一)

- 紙 `#ECEEE9` / カード `#FBFAF7` / 墨 `#26333B` / 藍(操作) `#33557E` /
  朱(判定・強調) `#BF3B33` / 緑(正解) `#3D7A55` / muted `#7C857F` / 罫線 `#D8DAD2`
- 見出し: 明朝(Hiragino Mincho ProN系)/ 本文: ゴシック(Hiragino Kaku Gothic系)。Webフォント不使用
- 角丸10px / 8pxの余白リズム / 朱印スタンプ演出(stampIn keyframes、prefers-reduced-motion対応)
- 見出しは「Eyebrow(11px・字間2.5)+明朝15px」の2段文法で統一
- モバイルファースト(コンテンツ幅 max 560px)、タップ領域44px以上、絵文字UIは使わない

## ディレクトリ(目標)

```
app/            # page(ダッシュボード) / play / result
components/     # engine/(Zenshi|Calc|Spot) Diagram TermPopup Stamp ほか
data/questions/ # 分野別・1論点1ファイル
data/terms.ts   # 用語辞書
lib/            # storage.ts scoring.ts srs.ts
types/          # Question / Attempt など
reference/      # 移植元(編集しない・importしない)
docs/           # 設計資料
```

## ドメイン注意

- 用語辞書・30秒レッスン・罠ラベルなど、法的な文言はプロトタイプから変更しない
  (レビュー済みのため)。新規問題の追加はこのマイルストーンではやらない
- 法改正の要注意ゾーン: 民法2020大改正 / 盛土規制法(2023)/ クーリングオフ告知の書面要件
