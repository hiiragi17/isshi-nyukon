import { notFound } from "next/navigation";
import { READINGS } from "@/data/readings";
import { ReadingView } from "@/components/ReadingView";

export default async function LearnPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  const reading = READINGS.get(topicId);
  if (!reading) notFound();
  return <ReadingView reading={reading} />;
}
