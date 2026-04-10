import { ApodCard } from "@/components/ApodCard";
import {
  createApodFallback,
  fetchAstronomyPictureOfTheDay,
} from "@/lib/space-data";

export async function StreamedApodCard() {
  const initialData = await fetchAstronomyPictureOfTheDay().catch(() =>
    createApodFallback(),
  );

  return <ApodCard initialData={initialData} />;
}
