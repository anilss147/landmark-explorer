import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { fetchLandmarks, fetchLandmarkDetails, searchWikipedia } from "./api/wikipedia";
import axios from "axios";
import rateLimit from "express-rate-limit";
import { z } from "zod";

// Constants
const CACHE_EXPIRY_TIME = 1000 * 60 * 15; // 15 minutes
const NOMINATIM_API_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "LandmarkExplorer/1.0";

// Input validation schemas
const boundsSchema = z.object({
  north: z.number().min(-90).max(90),
  south: z.number().min(-90).max(90),
  east: z.number().min(-180).max(180),
  west: z.number().min(-180).max(180),
});

const querySchema = z.object({
  q: z.string().min(1, "Query parameter is required"),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Rate limiting middleware
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: "Too many requests, please try again later.",
  });

  app.use("/api", limiter);

  // Get landmarks within map bounds
  app.get("/api/landmarks", async (req, res) => {
    try {
      // Validate input bounds
      const { north, south, east, west } = boundsSchema.parse({
        north: parseFloat(req.query.north as string),
        south: parseFloat(req.query.south as string),
        east: parseFloat(req.query.east as string),
        west: parseFloat(req.query.west as string),
      });

      // Get cached results first
      const cacheKey = `landmarks_${north.toFixed(4)}_${south.toFixed(4)}_${east.toFixed(4)}_${west.toFixed(4)}`;
      const cachedLandmarks = await storage.getCachedData(cacheKey);

      if (cachedLandmarks) {
        return res.json(cachedLandmarks);
      }

      // Fetch landmarks from Wikipedia
      const landmarks = await fetchLandmarks(north, south, east, west);

      // Get additional details for each landmark
      const landmarksWithDetails = await Promise.all(
        landmarks.map(async (landmark) => {
          try {
            const details = await fetchLandmarkDetails(landmark.pageid);
            return {
              ...landmark,
              description: details.extract,
              thumbnail: details.thumbnail?.source,
            };
          } catch (error) {
            console.error(`Error fetching details for ${landmark.title}:`, error);
            return landmark;
          }
        })
      );

      // Cache the results
      await storage.cacheData(cacheKey, landmarksWithDetails, Date.now() + CACHE_EXPIRY_TIME);

      res.json(landmarksWithDetails);
    } catch (error) {
      console.error("Error fetching landmarks:", error);
      res.status(500).json({ message: "Failed to fetch landmarks" });
    }
  });

  // Geocode locations
  app.get("/api/geocode", async (req, res) => {
    try {
      // Validate query parameter
      const { q } = querySchema.parse({ q: req.query.q });

      // Try to find location through Wikipedia first
      try {
        const wikiResults = await searchWikipedia(q);
        if (wikiResults.length > 0) {
          return res.json({
            lat: wikiResults[0].lat,
            lon: wikiResults[0].lon,
            display_name: wikiResults[0].title,
          });
        }
      } catch (error) {
        console.error("Error searching Wikipedia:", error);
        // Fall through to OSM if Wikipedia search fails
      }

      // Fall back to OpenStreetMap Nominatim API
      const response = await axios.get(NOMINATIM_API_URL, {
        params: {
          q,
          format: "json",
          limit: 1,
        },
        headers: {
          "User-Agent": USER_AGENT,
        },
      });

      if (response.data && response.data.length > 0) {
        const location = response.data[0];
        res.json({
          lat: parseFloat(location.lat),
          lon: parseFloat(location.lon),
          display_name: location.display_name,
        });
      } else {
        res.status(404).json({ message: "Location not found" });
      }
    } catch (error) {
      console.error("Error geocoding location:", error);
      res.status(500).json({ message: "Failed to geocode location" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
