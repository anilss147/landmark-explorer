import axios from "axios";
import { WikiGeosearchResult, WikiLandmarkDetails, Landmark } from "@/types";

const WIKIPEDIA_API_URL = "https://en.wikipedia.org/w/api.php";
const MAX_RADIUS = 10000; // Maximum radius in meters for geosearch

/**
 * Fetch landmarks within the given map bounds from Wikipedia API
 */
export async function fetchLandmarks(
  north: number,
  south: number,
  east: number,
  west: number
): Promise<Landmark[]> {
  try {
    // Validate input bounds
    if (north < south || east < west) {
      throw new Error("Invalid map bounds provided.");
    }

    // Calculate center point of the bounds
    const centerLat = (north + south) / 2;
    const centerLon = (east + west) / 2;

    // Calculate radius in meters (approximate)
    const radius = Math.min(
      Math.max(
        haversineDistance(centerLat, centerLon, north, centerLon),
        haversineDistance(centerLat, centerLon, centerLat, east)
      ) * 1000,
      MAX_RADIUS
    );

    // Fetch landmarks from Wikipedia's geosearch
    const response = await axios.get(WIKIPEDIA_API_URL, {
      params: {
        action: "query",
        list: "geosearch",
        gscoord: `${centerLat}|${centerLon}`,
        gsradius: radius,
        gslimit: 50,
        format: "json",
        origin: "*",
      },
    });

    if (response.data?.query?.geosearch) {
      const results: WikiGeosearchResult[] = response.data.query.geosearch;

      // Convert to our Landmark format
      return results.map((result) => ({
        pageid: result.pageid,
        title: result.title,
        lat: result.lat,
        lon: result.lon,
        distance: result.dist / 1000, // Convert meters to km
      }));
    }

    return [];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Axios error fetching landmarks from Wikipedia:", error.message);
    } else {
      console.error("Error fetching landmarks from Wikipedia:", error);
    }
    throw error;
  }
}

/**
 * Fetch additional details for a specific landmark
 */
export async function fetchLandmarkDetails(pageId: number): Promise<WikiLandmarkDetails> {
  try {
    const response = await axios.get(WIKIPEDIA_API_URL, {
      params: {
        action: "query",
        pageids: pageId,
        prop: "extracts|pageimages",
        exintro: true,
        explaintext: true,
        piprop: "thumbnail",
        pithumbsize: 500,
        format: "json",
        origin: "*",
      },
    });

    if (response.data?.query?.pages?.[pageId]) {
      const page = response.data.query.pages[pageId];
      return {
        pageid: page.pageid,
        title: page.title,
        extract: page.extract,
        thumbnail: page.thumbnail,
      };
    }

    return { pageid: pageId, title: "" };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`Axios error fetching details for page ${pageId}:`, error.message);
    } else {
      console.error(`Error fetching details for page ${pageId}:`, error);
    }
    throw error;
  }
}

/**
 * Search Wikipedia for a location
 */
export async function searchWikipedia(query: string): Promise<WikiGeosearchResult[]> {
  try {
    if (!query || query.trim().length === 0) {
      throw new Error("Search query cannot be empty.");
    }

    // First search for the page
    const searchResponse = await axios.get(WIKIPEDIA_API_URL, {
      params: {
        action: "query",
        list: "search",
        srsearch: query,
        srlimit: 5,
        format: "json",
        origin: "*",
      },
    });

    if (!searchResponse.data?.query?.search || searchResponse.data.query.search.length === 0) {
      return [];
    }

    // Get first page ID
    const pageId = searchResponse.data.query.search[0].pageid;

    // Try to get coordinates for this page
    const geoResponse = await axios.get(WIKIPEDIA_API_URL, {
      params: {
        action: "query",
        pageids: pageId,
        prop: "coordinates",
        format: "json",
        origin: "*",
      },
    });

    if (geoResponse.data?.query?.pages?.[pageId]?.coordinates?.[0]) {
      const coords = geoResponse.data.query.pages[pageId].coordinates[0];
      const title = geoResponse.data.query.pages[pageId].title;

      return [
        {
          pageid: pageId,
          ns: 0,
          title: title,
          lat: coords.lat,
          lon: coords.lon,
          dist: 0,
          primary: "true",
        },
      ];
    }

    return [];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Axios error searching Wikipedia:", error.message);
    } else {
      console.error("Error searching Wikipedia:", error);
    }
    throw error;
  }
}

/**
 * Calculate distance between two coordinates using the Haversine formula
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}
