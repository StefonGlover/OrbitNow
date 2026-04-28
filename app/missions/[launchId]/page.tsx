import { notFound } from "next/navigation";
import { MissionDetailView } from "@/components/MissionDetailView";
import { fetchMissionDetail } from "@/lib/space-data";

type MissionDetailPageProps = {
  params: {
    launchId: string;
  };
};

export default async function MissionDetailPage({
  params,
}: MissionDetailPageProps) {
  const mission = await fetchMissionDetail(params.launchId).catch(() => null);

  if (!mission) {
    notFound();
  }

  return <MissionDetailView mission={mission} />;
}
