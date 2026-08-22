import { notFound } from "next/navigation";
import { READINGS } from "@/data/readings";
import { QUESTIONS } from "@/data/questions";
import { itemKeysForTopic } from "@/lib/items";
import { ReadingView } from "@/components/ReadingView";

export default async function LearnPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  const reading = READINGS.get(topicId);
  if (!reading) notFound();
  // QUESTIONS(全問題データ)はサーバー側だけで読み、クライアントには
  // 計算済みの itemKey 配列だけを渡す(参考書モードの読み物ページは
  // 全論点の重い問題データをクライアントバンドルに含める必要がないため)
  const solveKeys = itemKeysForTopic(reading.topicId, QUESTIONS);
  return <ReadingView reading={reading} solveKeys={solveKeys} />;
}
