import {
  createFallbackSpaceNewsIntelligence,
  generateSpaceNewsIntelligence,
} from "@/lib/openai";
import { fetchLatestSpaceNewsFeed } from "@/lib/space-data";
import {
  LatestSpaceNewsApiResponse,
  LatestSpaceNewsFeedResponse,
  SpaceNewsStory,
} from "@/lib/types";

function getStories(feed: LatestSpaceNewsFeedResponse): SpaceNewsStory[] {
  return [feed.featuredStory, ...feed.articles].filter(
    (story): story is SpaceNewsStory => story !== null,
  );
}

export async function fetchLatestSpaceNews(): Promise<LatestSpaceNewsApiResponse> {
  const feed = await fetchLatestSpaceNewsFeed();
  const intelligence = await generateSpaceNewsIntelligence({ feed }).catch(() =>
    createFallbackSpaceNewsIntelligence({ feed }),
  );
  const stories = getStories(feed);
  const featuredStory =
    stories.find((story) => story.id === intelligence.featuredStoryId) ??
    feed.featuredStory ??
    stories[0] ??
    null;

  return {
    ...feed,
    featuredStory,
    articles: featuredStory
      ? stories.filter((story) => story.id !== featuredStory.id)
      : stories,
    intelligence,
  };
}
