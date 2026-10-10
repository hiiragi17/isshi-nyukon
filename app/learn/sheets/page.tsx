import { redirect } from "next/navigation";
import { SHEETS } from "@/data/sheets";

/** 旧URL(`/learn/sheets`)。シートごとのページに分けたので、先頭のシートへ送る */
export default function SheetsIndexPage() {
  redirect(`/learn/sheets/${SHEETS[0].id}`);
}
