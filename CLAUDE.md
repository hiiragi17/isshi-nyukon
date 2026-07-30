# 一肢入魂(isshi-nyukon)

宅建(宅地建物取引士試験)学習ゲーム。4択を当てるゲームではなく、
**全部の肢に理由をつけて決着をつける**ゲーム。個人開発・個人利用(当面)。

判定(○×) → 誤り箇所タップ → 理由選択 の3段階スコアリング。勘の正解では点が伸びない。
利用者は通勤中などにスマホで遊ぶ社会人。1セッション5〜10分。

## 現在地(v1〜v2 ほぼ完了)

Next.js 本実装は完了済み。3エンジン(`zenshi` / `calc` / `spot`)・ダッシュボード・
SRS(本日の召喚状)・成長グラフ・バックアップ(エクスポート/インポート)・PWA(オフライン対応)
まで実装され、問題データは4分野・約75論点ある(1論点1ファイル。正確な数は `data/questions/**/*.ts` の実ファイル数)。ロードマップの v0〜v2 は実質完了し、
v3(Neon移行・公開)は**着手判断基準を満たすまで見送り**(Issue #50 / `docs/design-v1.md` 4章)。

現在の主な作業は、問題拡充(残イシューで管理)と精度担保(`verified` 運用)。

- 設計の全体像: `docs/design-v1.md`(ジャンルカタログ・スキーマ・アーキテクチャ・ロードマップ)
- v1の作業手順と受け入れ条件(消化済み・経緯の記録): `docs/tasks-v1.md`
- 移植元(正): `reference/prototype/takken-zenshi-game.jsx`(挙動・見た目)/
  `reference/design/dashboard-final.html`(ダッシュボード)/ `reference/prototype/types-draft.ts`(型の出発点)

## 最重要ルール

- **移植であって作り直しではない。** `reference/prototype/takken-zenshi-game.jsx` が
  挙動・見た目の正。迷ったらプロトタイプに合わせる
- `reference/` 配下は **編集・import・ビルド対象にしない**(移植元として参照するだけ。tsconfig で exclude)
- 技術判断で迷ったら本ファイルの「既決事項」を優先。覆したい場合は実装前に提案・確認する
- タスクは `docs/tasks-v1.md` の順に、**1タスク=1コミット単位**で進める
- 各タスク完了時は、そのタスクの受け入れ条件を自分で確認してからコミットする

## 技術スタック(v1)

- **Next.js(App Router)+ TypeScript + React**
- 永続化: **localStorage**(`lib/storage.ts` の `StorageAdapter` 経由でのみアクセス)
- DB・認証・サーバーAPIは v1 では使わない(将来 Neon へ移行 → ロードマップ参照)
- スタイリング: プロトタイプ同様のデザイントークンベース。CSSはトークン定数を参照する
- Webフォント不使用(日本語システムフォントのみ)
- パッケージマネージャ: **pnpm**

### コマンド

```bash
pnpm install       # 依存インストール
pnpm dev           # 開発サーバ起動
pnpm build         # 本番ビルド
pnpm lint          # Lint
pnpm test          # ユニットテスト(vitest)
pnpm test:e2e      # E2E スモークテスト(Playwright / e2e 配下)
```

E2E は `e2e/` 配下・Playwright で実行する(vitest の対象外)。ブラウザは
`playwright install` で用意する。プリインストール済みの Chromium を使う環境では
`PW_CHROMIUM_PATH` に実行ファイルパスを渡すと、その Chromium で実行できる。

## データ構成(v1: localStorage / 将来: Neon)

v1 にRDBは無い。データは「静的な問題データ(バンドル)」+「成績履歴(localStorage)」の2系統。
`StorageAdapter` を挟むことで、将来のNeon移行を1ファイルの差し替えで済ませる。

### 問題データ(静的・リポジトリ同梱)

- `data/questions/{kenri|gyoho|horei|zei}/` に **1論点1ファイル**(権利関係/宅建業法/法令上の制限/税・その他)
- `data/terms.ts` — 用語辞書(配列+エイリアス方式。最長一致マッチ)
- 過去問の丸写し禁止。条文・判例ベースの自作のみ

### 問題の精度担保(照合と `verified`)

新規問題はまず `verified: false`(または未指定)で追加し、次の手順で検証する:

1. 各肢の判定・理由・数字を、一次ソース(e-Gov法令検索 / 国税庁 / 国土交通省 / REINS / 公式過去問など)の**原文**と突き合わせる
2. 照合結果を分野別シート `docs/verification/{kenri|gyoho|horei|zei}-verification.md` に記録(条文原文＋肢ごとの照合表＋承認欄。**1論点=1エントリ**)。照合表の列は **`肢` / `肢の正誤` / `根拠` / `照合結果`**(数字がある問題は `🚩数字` を追加)で4シート共通。`spot` は `ゾーン` / `違反/適法` に読み替え、`calc` は `段` / `計算` / `検算` の別様式。**正誤・根拠・突合せ結果を1つの列に混ぜない**
3. 人が原文を確認して承認できたら、その問題ファイルの `verified` を `true` にする

- `Question.verified`(`types/index.ts`)= 「**一次ソースで裏取り済みか**」の機械可読な記録。読み込み境界 `data/questions/index.ts` の `normalizeQuestion` で未指定は `false` に正規化される(現状 `verified` は出題フィルタには使わず、精度の証跡として持つ)
- **AIの下書き照合だけを根拠に `verified: true` にしない。** 最終判断は人が原文を見て行う
- `Question.source`(`SourceRef`)= 「**何で**裏取りしたか」。`verified` が「裏取りしたか」を記録するのに対し、こちらは根拠の強さを記録する。**未指定は `unverified` に正規化**(fail-closed)。`level` は問題全体(lesson を含む)の**最も弱い**水準、`answerLevel` は**肢の正誤を決める根拠**の水準(未指定は `level` と同じ)。**数値そのものが答えになる肢を含む問題は `answerLevel: primary` を必須**とする——lesson の補足だけが弱いケースで `level` を弱い側に倒しても、答えの根拠の強さが埋もれないようにするため
- `Question.lawVersion`(`LawVersion`)= 照合に用いた版と試験の法令基準日の関係。**未指定は `driftChecked: "unchecked"` に正規化**(fail-closed)。
  - `driftChecked: "not_required"` にできるのは**版と基準日が一致する**場合だけ。**施行日が基準日より前であることは根拠にならない**——それは「基準日までに効力を生じた」ことしか示さず、「基準日時点でもその内容のまま」であることを示さないため
  - `examBasisDate` は**導出値**。一次ソース(不動産適正取引推進機構「宅建試験の概要」)が「試験を実施する年度の4月1日現在施行されているもの」と**相対的に**定めているため、年度が変われば動く。導出は `lib/exam-basis.ts` の `examBasisDateFor()`(年度の境目は4月1日。1〜3月は前年度。判定は JST 基準)
- **年度が変わったら `examBasisDate` を更新する。** 更新漏れは `data/questions/integrity.test.ts` が機械的に検出する(記録済みの `examBasisDate` が現在の年度の基準日と一致するかを検査。落ちるとやるべきことがメッセージに出る)。**併せて `driftChecked` を再確認する**——基準日が動くと照合に使った版との関係も変わるため、`verifiedAgainst` が新しい基準日と一致しない限り `not_required` は使えず、`checked` / `analysed` も当て直すまでは `unchecked` に戻す。照合シートの基準日の記述も直す。特定年度の基準日を意図的に残す場合だけ、テスト内の `EXAM_BASIS_DATE_EXCEPTIONS` に理由を書いて登録する(通常の年度更新をここに逃がさない)
- 「数値肢は `answerLevel: primary`」は `data/questions/integrity.test.ts` で機械的に検査する。判定は **×肢の誤り箇所(`wrongIndex` の segment)に数値が含まれるか**で行い、`source.level` を記録済みの問題だけを対象にする(未記録の問題は `unverified` として内訳テストに残り続ける)。○肢の中の数値や理由文の数値は拾えないので**この検査は下限**であり、人が原文を見る手順を置き換えない。機械判定を人が覆す場合は、テスト内の `F8_EXCEPTIONS` に理由を書いて記録する
- 法的文言(30秒レッスン・肢・理由・解説・罠ラベル)は、照合で誤りが見つかったときだけ原文に合わせて最小限で直す

#### 照合の書き方(再発した誤りの防止)

- **条文文言のまま引用する。** 政令・省令に委任されている箇所は、**委任先の中身を推測して書かない**。原文を取得できていないなら「政令で定める」までで止める(fail-closed)
- **項番号には施行日を併記する。** 改正で項がずれるため、`38条9項(令和8年4月1日施行時点。改正前は7項)` のように、どの時点の項番号かがわかる形で書く
- **判例は旧法下のものかを注記する。** `最判昭35.2.9(旧借地法4条2項下の判例)` のように、どの法の下での判断かを明示する
- **「原文」と書くなら省略記号を使わない。** 逐語引用と要約は別物として、どちらであるかを明示して書き分ける
- 照合シートを部分更新するときは、**同じ論点に触れている他の箇所も必ず見る**。承認欄だけ更新して上の記述が古いまま、という不整合が起きやすい

### 型(`types/`。`reference/prototype/types-draft.ts` が出発点)

| 型 | 役割 |
|---|---|
| `Question` | 問題本体。`type` でエンジンを分岐(`zenshi` / `calc` / `spot`) |
| `Choice` / `Reason` | 全肢判定の肢と理由(○肢=根拠 / ×肢=誤りの理由) |
| `Diagram` | 登場人物の関係図(nodes / edges。省略可) |
| `CalcSpec` | 計算問題(報酬・建蔽率容積率・相続分)。given / answer / steps / distractors |
| `SpotSpec` / `AdElement` | マイソク間違い探し。layout / errors / errorCount |
| `Term` | 用語辞書エントリ(word / aliases / def / category) |
| `Attempt` | 成績1件(questionId / choiceIndex / pts / max / answeredAt) |
| `SourceRef` | 照合に使ったソースの強さ(`level`: primary / mirrored / secondary / unverified)。様式なら `fileId` も |
| `LawVersion` | 照合に用いた法令の版と試験の法令基準日の関係(`revisionId` / `verifiedAgainst` / `examBasisDate` / `driftChecked`) |
| `MasteryState` | `perfect` / `learning` / `untouched` |

問題形式は3種: `zenshi`(全肢判定)/ `calc`(途中式ビルダー)/ `spot`(間違い探し)。いずれも実装済み。
`type` で分岐するため、新しい形式を後から足してもデータ構造は壊れない。

### 成績データ(localStorage)

- `Attempt` を **全件履歴で保存**(最新だけでなく)
- 弱点判定=最新の結果 / SRS=最終挑戦日 / 成長グラフ=全履歴
- アクセスは `StorageAdapter` 経由のみ(アプリ側は localStorage を直接触らない)

## ディレクトリ構成(目標)

```text
app/            # page(ダッシュボード) / play / result
components/     # engine/(Zenshi|Calc|Spot) Diagram TermPopup Stamp Eyebrow ほか
data/
  questions/    # 分野別・1論点1ファイル(kenri/gyoho/horei/zei)
  terms.ts      # 用語辞書
lib/            # storage.ts scoring.ts srs.ts tokens.ts
types/          # Question / Attempt など
reference/      # 移植元(編集しない・importしない・ビルド対象外)
docs/           # 設計資料(design-v1.md / tasks-v1.md)
```

## 既決事項(蒸し返さない)

- **ストレージ抽象化**: `StorageAdapter` インターフェース(`getAttempts` / `saveAttempt` / `replaceAttempts`)。
  v1は `LocalStorageAdapter`。将来のNeon移行はAdapter差し替えのみで済む設計を守る
- **成績データ**: `Attempt` を全件履歴で保存。弱点判定=最新結果 / SRS=最終挑戦日 / 成長グラフ=全履歴
- **SRS**: SM-2簡易版(満点→間隔2倍、失点→リセット)。出題キューの優先度は
  **弱点 > 復習期限切れ > 未着手 > その他**
- **問題形式は3種**: `zenshi` / `calc` / `spot`。型は `types-draft.ts` を出発点に `types/` へ整備
- **問題データ**: 過去問の丸写し禁止。条文・判例ベースの自作のみ。1論点1ファイル
- **ダッシュボード**(トップページ): `reference/design/dashboard-final.html` の
  2a「検地帳×集印」を実装。マトリクスは **1行6列固定**(390px幅でタップ領域約50px確保のため)
- **spot広告レイアウト**: 現状ハードコードでよい。データ駆動化は広告2枚目を作る時に判断

## デザイントークン(プロトタイプと同一)

`reference/prototype/takken-zenshi-game.jsx` / `types-draft.ts` の `TOKENS` と値を一致させる。
`lib/tokens.ts`(または `globals.css` のCSS変数)に定義し、CSSはこの定数を参照する。

| 用途 | 色 |
|---|---|
| 紙(背景) | `#ECEEE9` |
| カード | `#FBFAF7` |
| 墨(テキスト) | `#26333B` |
| 藍(操作・インタラクティブ) | `#33557E` |
| 朱(判定・強調) | `#BF3B33` |
| 緑(正解) | `#3D7A55` |
| muted | `#7C857F` |
| 罫線 | `#D8DAD2` |

- 見出し: 明朝(Hiragino Mincho ProN系)/ 本文: ゴシック(Hiragino Kaku Gothic系)
- 角丸10px / 8pxの余白リズム / 朱印スタンプ演出(stampIn keyframes、`prefers-reduced-motion` 対応)
- 見出しは「Eyebrow(11px・字間2.5)+明朝15px」の2段文法で統一
- モバイルファースト(コンテンツ幅 max 560px)、タップ領域44px以上、絵文字UIは使わない
- ダークモードは対象外
- 世界観: 法律文書 × 朱印。「開廷する」「判決」「合格/追試のスタンプ」の司法モチーフ

## コーディング規約

- **トークン参照**: 色・フォント・角丸などは `lib/tokens.ts` を参照し、値をハードコードしない
- **ストレージは Adapter 経由**: `localStorage` を直接呼ばない。必ず `StorageAdapter`
- **移植の忠実性**: 画面・挙動・得点はプロトタイプと一致させる(6テーマ・満点46点。
  肢の得点は ○肢=2点 / ×肢=3点、calc=2点、spot=`errorCount`。`reference/prototype/takken-zenshi-game.jsx` の `maxOf` が正)
- **法的文言は改変しない**: 用語辞書・30秒レッスン・罠ラベルなどはレビュー済み。プロトタイプから一字も変えない
- **テスト**: SRSの間隔計算とキュー順はユニットテストで検証(`lib/srs.ts`)

## 著作権対応

- 問題の肢は過去問の「論点」だけ借りて自作(丸写し禁止)
- 用語辞書・レッスン等の法的文言はプロトタイプ準拠(レビュー済み)
- 公開・配布時は非公式・個人利用である旨を明示する

## ドメイン注意

- 法改正の要注意ゾーン: 民法2020大改正 / 盛土規制法(2023)/ クーリングオフ告知の書面・電磁的方法の扱い
- 統計分野は毎年データが変わるため鮮度管理が必要。優先度は最低(試験直前に鮮度つきで)
- 新規問題の追加は問題拡充イシューの単位で行い、「問題の精度担保(照合と `verified`)」の手順に従う

## GitHub PR ルール

- PR本文は**日本語**で書く
- assignee に `hiiragi17` を設定する
- 関連する issue がある場合は本文に `Closes #<番号>`(または `Refs #<番号>`)を含めて紐付ける
- マージ後のブランチは削除する(リポジトリ設定の `Automatically delete head branches` を有効化しておく)
- PRはユーザーが明示的に依頼したときだけ作成する

## レビューコメント対応ルール

PR には CodeRabbit / Codex などの bot レビューが付くことがある。基本方針:

### 適用判断

- **レビューの「おすすめ書き換え」を無条件採用しない。** 条文・条番号・法的文言に関する指摘は、**一次ソースに当てて検証してから**適用する。適用しない判断をしたときは理由を返信に明記する
  - 指摘のほうが誤っていることがある(PR #122: 「閲覧所の根拠は規則5条ではなく5条の2」という指摘は、原文を確認したら誤りだった)
  - 逆に、こちらの照合記録が壊れていて正しい指摘を却下しかけたこともある(同PR C1: 76条の引用が部分引用になっていた)。**指摘も自分の記録も、どちらも無条件には信頼しない**
- **小さく明確な指摘**(typo / lint / 表記揺れ / docs整合性)→ 即座に修正コミット
- **セキュリティ / データ整合性の指摘**(履歴の破損、境界値、SRS計算の誤り等)→ 妥当性を検証して修正
- **アーキテクチャに影響する指摘**(責務分離、Adapter方針、型設計の変更等)→ 自己判断せず `AskUserQuestion` で確認してから対応
- **複数 bot から同一指摘**は1つの commit でまとめて反映する

### 返信ポリシー

- bot / 人間問わずレビューコメントにはスレッド返信する(`add_reply_to_pull_request_comment`)
- 返信には「対応コミットの hash」+「何をどう変えたかの要約」を含める
- 修正した thread は可能なら resolve する(`resolve_review_thread`)
- 「対応しない」判断は理由を明記して返信

### スキップしてよいケース

- bot の "Review in progress" の進捗通知
- 既にコミット済みの修正と重複する指摘(既対応を伝えるだけでOK)
- 自分の返信が webhook で echo されてきたケース / bot の「お礼・確認」自動返信(返信すると無限ループになる)

## 詳細ドキュメント

- `docs/design-v1.md` — 出題ジャンル全カタログ、データ設計(スキーマ全文)、アーキテクチャ、ロードマップ
- `docs/tasks-v1.md` — v1タスク(T1〜T6)と受け入れ条件、v1でやらないこと
- `reference/design/claude-design-brief.md` — calc / spot / ダッシュボード実装時のデザイン依頼メモ(実装済み・経緯の記録)

### ロードマップ(要約)

| フェーズ | 内容 | ストレージ |
|---|---|---|
| v0(済) | プロトタイプ: zenshi エンジン、4テーマ、弱点復習 | メモリ |
| v1(済) | Next.js化、localStorage、業法+民法の拡充 | localStorage |
| v1.5(済) | 間隔反復、成長グラフ、法令上の制限追加 | localStorage |
| v2(済) | 計算エンジン(報酬・建蔽率容積率)、間違い探しエンジン(マイソク) | localStorage |
| v3(当面見送り) | Neon移行、公開、ランキング(任意)。着手条件は `docs/design-v1.md` 4章 / Issue #50 | Neon |
