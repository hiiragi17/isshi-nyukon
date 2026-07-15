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
  parseBackup,
  backupFilename,
  BackupError,
} from "@/lib/backup";
import { Eyebrow } from "@/components/Eyebrow";
import { CARD, INK, AI_BLUE, SHU, GREEN, MUTED, LINE, SERIF, RADIUS } from "@/lib/tokens";

type Msg = { kind: "ok" | "error"; text: string } | null;

export function BackupPanel({
  attempts,
  onImported,
}: {
  attempts: Attempt[];
  onImported: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<Msg>(null);

  const handleExport = () => {
    try {
      const json = serializeBackup(attempts);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = backupFilename();
      a.click();
      URL.revokeObjectURL(url);
      setMsg({ kind: "ok", text: `控えを書き出しました(${attempts.length}件)。` });
    } catch {
      setMsg({ kind: "error", text: "控えの書き出しに失敗しました。" });
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 同じファイルを続けて選べるよう input はここで必ずリセットする
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const restored = parseBackup(text); // 不正ならここで例外 → storage は無傷
      const ok = window.confirm(
        `いまの記録を、控え(${restored.length}件)で置き換えます。\nこの端末の現在の成績は失われます。よろしいですか?`,
      );
      if (!ok) return;
      await storage.replaceAttempts(restored);
      setMsg({ kind: "ok", text: `控えから復元しました(${restored.length}件)。` });
      onImported();
    } catch (err) {
      const text =
        err instanceof BackupError
          ? err.message
          : "控えの読み込みに失敗しました。";
      setMsg({ kind: "error", text });
    }
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
          padding: "6px 0",
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
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={handleExport}
            disabled={attempts.length === 0}
            style={{
              flex: "1 1 140px",
              minHeight: 44,
              fontSize: 13,
              fontWeight: 700,
              fontFamily: SERIF,
              letterSpacing: 2,
              color: CARD,
              background: attempts.length === 0 ? MUTED : AI_BLUE,
              border: "none",
              borderRadius: RADIUS,
              cursor: attempts.length === 0 ? "default" : "pointer",
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
