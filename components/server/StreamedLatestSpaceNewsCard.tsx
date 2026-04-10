import { LatestSpaceNewsCard } from "@/components/LatestSpaceNewsCard";
import { fetchLatestSpaceNews } from "@/lib/news";
import { getSessionUserFromRequest } from "@/lib/server/auth";
import { getUserPreferences } from "@/lib/server/db";

export async function StreamedLatestSpaceNewsCard() {
  const sessionUser = await getSessionUserFromRequest();
  const syncedPreferences = sessionUser
    ? await getUserPreferences(sessionUser.id)
    : null;
  const initialData = await fetchLatestSpaceNews({
    preferredTopics: syncedPreferences?.newsTopics,
  }).catch(() => null);

  return <LatestSpaceNewsCard initialData={initialData} />;
}
