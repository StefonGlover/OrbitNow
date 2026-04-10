import { LatestSpaceNewsCard } from "@/components/LatestSpaceNewsCard";
import { fetchLatestSpaceNews } from "@/lib/news";

export async function StreamedLatestSpaceNewsCard() {
  const initialData = await fetchLatestSpaceNews().catch(() => null);

  return <LatestSpaceNewsCard initialData={initialData} />;
}
