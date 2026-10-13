"use client";

/**
 * 記録の控え(バックアップ)パネル。
 *
 * localStorage はこの端末・ブラウザに閉じているため、書き出し(控え)と
 * 読み戻し(復元)の導線をダッシュボード末尾に控えめに置く。設定的な導線として
 * 既定は畳んでおき、<details> で開いたときだけ操作を見せる。
 *
 * データアクセスは必ず lib/storage の StorageAdapter 経由(localStorage 直呼び禁止)。
 * 復元は「置換(上書き)」方針。不正・非対応の控えは parseBackup が storage を
 * 書き換える前に弾くので、読み込み失敗で既存の記録が壊れることはない。
 */
import { useRef, useState } from "react";
import type { Attempt } from "@/types";
import { storage } from "@/lib/storage";
import {
  serializeBackup,
  parseBackupFile,
  backupFilename,
  BackupError,
  type BackupContents,
} from "@/lib/backup";
import { Eyebrow } from "@/components/Eyebrow";
import { STORAGE_WRITE_ERROR } from "@/lib/storageErrors";
import { CARD, INK, AI_BLUE, SHU, GREEN, MUTED, LINE, SERIF, RADIUS } from "@/lib/tokens";

type Msg = { kind: "ok" | "error"; text: string } | null;

export function BackupPanel({
  attempts,
  favorites,
  favoritesError,
  onImported,
}: {
  attempts: Attempt[];
  /** いまのお気に入り(itemKey の配列)。null は読み込み中。控えに含めて書き出す */
  favorites: string[] | null;
  /** お気に入りを読み込めなかったとき。この間の favorites は信用できないので控えに含めない */
  favoritesError: boolean;
  onImported: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<Msg>(null);

  // お気に入りの読み込み前に書き出すと、未読み込みを「0件」として控えに入れてしまい、
  // 復元で本来のお気に入りが消える。読み込みが終わるまで書き出さない。
  // 読み込みに失敗したときは、お気に入りを含めずに成績だけ書き出す(復元でお気に入りに触れない)
  const favoritesLoading = favorites === null;
  const exportFavorites =
    favorites !== null && !favoritesError ? favorites : undefined;
  // 成績もお気に入りも無いときだけ、書き出す中身が無い
  const nothingToExport =
    attempts.length === 0 && (exportFavorites?.length ?? 0) === 0;
  const exportDisabled = favoritesLoading || nothingToExport;

  const handleExport = async () => {
    try {
      // 画面に持っている attempts / favorites は読み込み時点のもの。別タブで増減していても
      // 古い内容を控えに入れないよう、書き出しを始める時点で保存済みの最新を読み直す。
      // props は、ボタンを押せるか(読み込み済みか・中身があるか)の判定にだけ使う
      const latestAttempts = await storage.getAttempts();
      const latestFavorites = exportFavorites
        ? await storage.getFavorites()
        : undefined;
      const json = serializeBackup(latestAttempts, new Date(), latestFavorites);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = backupFilename();
      a.click();
      URL.revokeObjectURL(url);
      setMsg({
        kind: "ok",
        text: latestFavorites
          ? `控えを書き出しました(成績${latestAttempts.length}件・お気に入り${latestFavorites.length}肢)。`
          : `控えを書き出しました(成績${latestAttempts.length}件)。お気に入りは読み込めなかったため含まれていません。`,
      });
    } catch {
      setMsg({ kind: "error", text: "控えの書き出しに失敗しました。" });
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 同じファイルを続けて選べるよう input はここで必ずリセットする
    e.target.value = "";
    if (!file) return;

    // 1. 読み込み・検証。不正・非対応ならここで終わり、storage は一切触らない
    let restored: BackupContents;
    try {
      const text = await file.text();
      restored = parseBackupFile(text);
    } catch (err) {
      setMsg({
        kind: "error",
        text:
          err instanceof BackupError
            ? err.message
            : "控えの読み込みに失敗しました。",
      });
      return;
    }

    const ok = window.confirm(
      restored.favorites
        ? `いまの記録を、控え(成績${restored.attempts.length}件・お気に入り${restored.favorites.length}肢)で置き換えます。\nこの端末の現在の成績とお気に入りは失われます。よろしいですか?`
        : `いまの成績を、控え(${restored.attempts.length}件)で置き換えます。\nこの端末の現在の成績は失われます(この控えにお気に入りは含まれないため、お気に入りはそのまま残ります)。よろしいですか?`,
    );
    if (!ok) return;

    // 2. 置換。保存が失敗したのに「復元しました」と誤表示しないよう、
    //    replaceAttempts の例外(容量超過・プライベートモード等)を捕まえる
    try {
      await storage.replaceAttempts(restored.attempts);
    } catch {
      setMsg({
        kind: "error",
        text: STORAGE_WRITE_ERROR,
      });
      return;
    }
    // お気に入りは、控えに含まれているときだけ置き換える(旧形式の控えでは触らない)。
    // 成績は復元済みなので、ここで失敗したら「成績だけ戻った」と正直に伝える
    if (restored.favorites) {
      try {
        await storage.saveFavorites(restored.favorites);
      } catch {
        setMsg({
          kind: "error",
          text: `成績は復元しましたが、お気に入りは復元できませんでした。${STORAGE_WRITE_ERROR}`,
        });
        onImported();
        return;
      }
    }
    setMsg({
      kind: "ok",
      text: restored.favorites
        ? `控えから復元しました(成績${restored.attempts.length}件・お気に入り${restored.favorites.length}肢)。`
        : `控えから復元しました(成績${restored.attempts.length}件。この控えにお気に入りは含まれないため、お気に入りはそのままです)。`,
    });
    onImported();
  };

  return (
    <details style={{ marginTop: 16 }}>
      <summary
        style={{
          cursor: "pointer",
          listStyle: "none",
          color: MUTED,
          fontSize: 11.5,
          textAlign: "center",
          // タップ領域を44px以上にする(モバイルファーストのガイドライン)
          padding: "16px 0",
          userSelect: "none",
        }}
      >
        記録の控え(書き出し・復元)
      </summary>

      <div
        style={{
          background: CARD,
          border: `1px solid ${LINE}`,
          borderRadius: RADIUS,
          padding: "16px 18px",
          marginTop: 8,
        }}
      >
        <Eyebrow>記録の保全</Eyebrow>
        <div
          style={{
            fontFamily: SERIF,
            fontSize: 15,
            fontWeight: 800,
            margin: "4px 0 8px",
          }}
        >
          記録の控え
        </div>
        <p
          style={{
            fontSize: 12,
            color: MUTED,
            lineHeight: 1.9,
            margin: "8px 0 12px",
          }}
        >
          成績はこの端末(ブラウザ)にのみ保存されています。控えを書き出して
          保管しておけば、端末やブラウザを変えても復元できます。
          {exportFavorites || favoritesLoading
            ? "控えには成績の履歴とお気に入りが含まれます。"
            : "お気に入りを読み込めなかったため、今回の控えには成績の履歴だけが含まれます。"}
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={handleExport}
            disabled={exportDisabled}
            style={{
              flex: "1 1 140px",
              minHeight: 44,
              fontSize: 13,
              fontWeight: 700,
              fontFamily: SERIF,
              letterSpacing: 2,
              color: CARD,
              background: exportDisabled ? MUTED : AI_BLUE,
              border: "none",
              borderRadius: RADIUS,
              cursor: exportDisabled ? "default" : "pointer",
            }}
          >
            控えを書き出す
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              flex: "1 1 140px",
              minHeight: 44,
              fontSize: 13,
              fontWeight: 700,
              fontFamily: SERIF,
              letterSpacing: 2,
              color: INK,
              background: CARD,
              border: `1px solid ${AI_BLUE}`,
              borderRadius: RADIUS,
              cursor: "pointer",
            }}
          >
            控えから復元する
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            style={{ display: "none" }}
          />
        </div>

        {exportDisabled && (
          <p
            style={{
              fontSize: 12,
              color: MUTED,
              lineHeight: 1.8,
              margin: "12px 0 0",
            }}
          >
            {favoritesLoading
              ? "お気に入りを読み込んでいます…"
              : "まだ成績もお気に入りもないため書き出せません。"}
          </p>
        )}

        {msg && (
          <p
            role="status"
            style={{
              fontSize: 12,
              lineHeight: 1.8,
              margin: "12px 0 0",
              color: msg.kind === "ok" ? GREEN : SHU,
            }}
          >
            {msg.text}
          </p>
        )}
      </div>
    </details>
  );
}
