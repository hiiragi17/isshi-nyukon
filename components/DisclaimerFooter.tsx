/**
 * 免責フッター(非公式・個人利用の明示)。
 * CLAUDE.md の著作権方針「公開・配布時は非公式・個人利用である旨を明示する」に対応。
 * 世界観(法律文書×朱印)に馴染むよう「附則」の見出し文法で控えめに常設する。
 * 色・フォント・罫線は lib/tokens.ts を参照し、値をハードコードしない。
 */
import { INK, SANS, SERIF, MUTED, LINE } from "@/lib/tokens";
import { Eyebrow } from "@/components/Eyebrow";

export function DisclaimerFooter() {
  return (
    <footer
      style={{
        marginTop: 32,
        paddingTop: 16,
        borderTop: `1px solid ${LINE}`,
        textAlign: "center",
      }}
    >
      <Eyebrow>附則</Eyebrow>
      <div
        style={{
          fontFamily: SERIF,
          fontSize: 15,
          color: INK,
          margin: "4px 0 0",
        }}
      >
        免責事項
      </div>
      <p
        style={{
          fontFamily: SANS,
          fontSize: 11,
          lineHeight: 1.9,
          color: MUTED,
          margin: "8px 0 0",
        }}
      >
        本アプリは宅建試験の非公式・個人利用の学習ツールです。問題は条文・判例に基づく自作で、過去問の転載ではありません。
      </p>
    </footer>
  );
}
