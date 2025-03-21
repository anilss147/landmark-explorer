# Landmark Explorer: Project Source Code

This document contains the source code for all key files in the Landmark Explorer project.

## Backend Files

### server/index.ts
```typescript
import express, { NextFunction, Request, Response } from "express";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";
import { createServer } from "http";
import { storage } from "./storage";

async function main() {
  const app = express();
  const httpServer = createServer(app);

  // Parse JSON request bodies
  app.use(express.json());

  // Log all requests
  app.use((req, _res, next) => {
    log(`${req.method} ${req.url}`);
    next();
  });

  // Register API routes
  const server = await registerRoutes(app);

  // Set up Vite development server in development mode
  if (process.env.NODE_ENV !== "production") {
    await setupVite(app, server);
  }

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  });

  // Start the server
  const port = process.env.PORT || 5000;
  httpServer.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });

  // Clean expired cache entries every 30 minutes
  setInterval(() => {
    storage.clearExpiredCache();
  }, 30 * 60 * 1000);
}

main().catch(console.error);
```

### server/routes.ts
```typescript
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { fetchLandmarks, fetchLandmarkDetails, searchWikipedia } from "./api/wikipedia";
import axios from "axios";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get landmarks within map bounds
  app.get("/api/landmarks", async (req, res) => {
    try {
      const north = parseFloat(req.query.north as string);
      const south = parseFloat(req.query.south as string);
      const east = parseFloat(req.query.east as string);
      const west = parseFloat(req.query.west as string);

      if (isNaN(north) || isNaN(south) || isNaN(east) || isNaN(west)) {
        return res.status(400).json({ message: "Invalid bounds parameters" });
      }

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
      const expiryTime = Date.now() + 1000 * 60 * 15; // 15 minutes
      await storage.cacheData(cacheKey, landmarksWithDetails, expiryTime);

      res.json(landmarksWithDetails);
    } catch (error) {
      console.error("Error fetching landmarks:", error);
      res.status(500).json({ message: "Failed to fetch landmarks" });
    }
  });

  // Geocode locations
  app.get("/api/geocode", async (req, res) => {
    try {
      const query = req.query.q as string;
      
      if (!query) {
        return res.status(400).json({ message: "Query parameter is required" });
      }
      
      // Try to find location through Wikipedia first
      try {
        const wikiResults = await searchWikipedia(query);
        if (wikiResults.length > 0) {
          return res.json({
            lat: wikiResults[0].lat,
            lon: wikiResults[0].lon,
            display_name: wikiResults[0].title
          });
        }
      } catch (error) {
        console.error("Error searching Wikipedia:", error);
        // Fall through to OSM if Wikipedia search fails
      }
      
      // Fall back to OpenStreetMap Nominatim API
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search`,
        {
          params: {
            q: query,
            format: 'json',
            limit: 1
          },
          headers: {
            'User-Agent': 'LandmarkExplorer/1.0'
          }
        }
      );
      
      if (response.data && response.data.length > 0) {
        const location = response.data[0];
        res.json({
          lat: parseFloat(location.lat),
          lon: parseFloat(location.lon),
          display_name: location.display_name
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
```

### server/storage.ts
```typescript
import { Cache, InsertCache } from "@/schema";

export interface IStorage {
  getCachedData(key: string): Promise<any | null>;
  cacheData(key: string, value: any, expiryTime: number): Promise<void>;
  clearExpiredCache(): Promise<void>;
}

export class MemStorage implements IStorage {
  private cache: Map<string, Cache>;

  constructor() {
    this.cache = new Map<string, Cache>();
  }

  async getCachedData(key: string): Promise<any | null> {
    const cacheEntry = this.cache.get(key);
    
    if (!cacheEntry) {
      return null;
    }
    
    // Check if cache has expired
    if (cacheEntry.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return cacheEntry.value;
  }

  async cacheData(key: string, value: any, expiryTime: number): Promise<void> {
    const cacheEntry: InsertCache = {
      key,
      value,
      expires: expiryTime
    };
    
    this.cache.set(key, { 
      ...cacheEntry, 
      id: this.cache.size + 1 
    });
  }

  async clearExpiredCache(): Promise<void> {
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires < now) {
        this.cache.delete(key);
      }
    }
  }
}

// Create singleton instance
export const storage = new MemStorage();
```

### server/api/wikipedia.ts
```typescript
import axios from "axios";
import { WikiGeosearchResult, WikiLandmarkDetails, Landmark } from "@/types";

const WIKIPEDIA_API_URL = "https://en.wikipedia.org/w/api.php";

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
    // Calculate center point of the bounds
    const centerLat = (north + south) / 2;
    const centerLon = (east + west) / 2;
    
    // Calculate radius in meters (approximate)
    const radius = 
      Math.max(
        haversineDistance(centerLat, centerLon, north, centerLon),
        haversineDistance(centerLat, centerLon, centerLat, east)
      ) * 1000;
    
    // Fetch landmarks from Wikipedia's geosearch
    const response = await axios.get(WIKIPEDIA_API_URL, {
      params: {
        action: "query",
        list: "geosearch",
        gscoord: `${centerLat}|${centerLon}`,
        gsradius: Math.min(radius, 10000), // Max 10km
        gslimit: 50,
        format: "json",
        origin: "*"
      }
    });

    if (response.data?.query?.geosearch) {
      const results: WikiGeosearchResult[] = response.data.query.geosearch;
      
      // Convert to our Landmark format
      return results.map(result => ({
        pageid: result.pageid,
        title: result.title,
        lat: result.lat,
        lon: result.lon,
        distance: result.dist / 1000, // Convert meters to km
      }));
    }
    
    return [];
  } catch (error) {
    console.error("Error fetching landmarks from Wikipedia:", error);
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
        origin: "*"
      }
    });
    
    if (response.data?.query?.pages && response.data.query.pages[pageId]) {
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
    console.error(`Error fetching details for page ${pageId}:`, error);
    throw error;
  }
}

/**
 * Search Wikipedia for a location
 */
export async function searchWikipedia(query: string): Promise<WikiGeosearchResult[]> {
  try {
    // First search for the page
    const searchResponse = await axios.get(WIKIPEDIA_API_URL, {
      params: {
        action: "query",
        list: "search",
        srsearch: query,
        srlimit: 5,
        format: "json",
        origin: "*"
      }
    });
    
    if (!searchResponse.data?.query?.search || 
        searchResponse.data.query.search.length === 0) {
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
        origin: "*"
      }
    });
    
    if (geoResponse.data?.query?.pages?.[pageId]?.coordinates?.[0]) {
      const coords = geoResponse.data.query.pages[pageId].coordinates[0];
      const title = geoResponse.data.query.pages[pageId].title;
      
      return [{
        pageid: pageId,
        ns: 0,
        title: title,
        lat: coords.lat,
        lon: coords.lon,
        dist: 0,
        primary: "true"
      }];
    }
    
    return [];
  } catch (error) {
    console.error("Error searching Wikipedia:", error);
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
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}

function deg2rad(deg: number): number {
  return deg * (Math.PI/180);
}
```

### shared/schema.ts
```typescript
import { pgTable, text, serial, numeric, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define the landmark facts schema
const landmarkFactSchema = z.object({
  type: z.string(),
  label: z.string(),
  value: z.string(),
});

// Landmark table
export const landmarks = pgTable("landmarks", {
  id: serial("id").primaryKey(),
  pageid: numeric("pageid").notNull().unique(),
  title: text("title").notNull(),
  lat: numeric("lat").notNull(),
  lon: numeric("lon").notNull(),
  description: text("description"),
  thumbnail: text("thumbnail"),
  address: text("address"),
  facts: jsonb("facts").$type<Array<z.infer<typeof landmarkFactSchema>>>(),
});

// Cache table for storing API responses
export const caches = pgTable("caches", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  expires: numeric("expires").notNull(),
});

// Schema for inserting a landmark
export const insertLandmarkSchema = createInsertSchema(landmarks).omit({
  id: true,
});

// Schema for inserting a cache entry
export const insertCacheSchema = createInsertSchema(caches).omit({
  id: true,
});

// Types
export type InsertLandmark = z.infer<typeof insertLandmarkSchema>;
export type Landmark = typeof landmarks.$inferSelect;
export type InsertCache = z.infer<typeof insertCacheSchema>;
export type Cache = typeof caches.$inferSelect;
```

## Frontend Files

### client/src/App.tsx
```typescript
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
```

### client/src/main.tsx
```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

### client/src/pages/Home.tsx
```typescript
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import MapContainer from "@/components/MapContainer";
import LandmarkPanel from "@/components/LandmarkPanel";
import DetailView from "@/components/DetailView";
import { Landmark } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useMapBounds } from "@/hooks/use-map-bounds";

export default function Home() {
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOption, setSortOption] = useState<string>("distance");
  const { bounds, setBounds, center, setCenter } = useMapBounds();
  const { toast } = useToast();

  const { data: landmarks, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/landmarks', bounds?.getNorth(), bounds?.getSouth(), bounds?.getEast(), bounds?.getWest()],
    enabled: !!bounds,
    queryFn: async ({ queryKey }) => {
      const [url, north, south, east, west] = queryKey as [string, number, number, number, number];
      const params = new URLSearchParams({
        north: north.toString(),
        south: south.toString(),
        east: east.toString(),
        west: west.toString()
      });
      const response = await fetch(`${url}?${params}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch landmarks');
      }
      return response.json();
    },
  });

  const handleSelectLandmark = (landmark: Landmark) => {
    setSelectedLandmark(landmark);
  };

  const handleCloseDetail = () => {
    setSelectedLandmark(null);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleSortChange = (option: string) => {
    setSortOption(option);
  };

  const handleMapSearch = async (location: string) => {
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(location)}`);
      
      if (!response.ok) {
        throw new Error("Location not found");
      }
      
      const data = await response.json();
      
      if (data && data.lat && data.lon) {
        setCenter([data.lat, data.lon]);
        toast({
          title: "Location found",
          description: `Showing landmarks near ${location}`,
        });
      } else {
        toast({
          title: "Location not found",
          description: "Could not find the specified location",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to search for location",
        variant: "destructive"
      });
    }
  };

  // Filter landmarks based on search query
  const filteredLandmarks = landmarks?.filter(landmark => 
    !searchQuery || landmark.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort landmarks
  const sortedLandmarks = filteredLandmarks ? [...filteredLandmarks].sort((a, b) => {
    if (sortOption === "alphabetical") {
      return a.title.localeCompare(b.title);
    } else if (sortOption === "distance" && center) {
      // Calculate distance from center (basic approximation)
      const distA = Math.sqrt(
        Math.pow(a.lat - center[0], 2) + Math.pow(a.lon - center[1], 2)
      );
      const distB = Math.sqrt(
        Math.pow(b.lat - center[0], 2) + Math.pow(b.lon - center[1], 2)
      );
      return distA - distB;
    }
    return 0;
  }) : [];

  return (
    <div className="flex flex-col h-screen">
      <Header />
      
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        <MapContainer 
          landmarks={sortedLandmarks || []} 
          selectedLandmark={selectedLandmark}
          onSelectLandmark={handleSelectLandmark}
          loading={isLoading}
          error={error ? String(error) : null}
          onBoundsChange={setBounds}
          onSearchLocation={handleMapSearch}
          center={center}
          setCenter={setCenter}
          onRefetch={refetch}
        />
        
        <LandmarkPanel 
          landmarks={sortedLandmarks || []} 
          selectedLandmark={selectedLandmark}
          onSelectLandmark={handleSelectLandmark}
          loading={isLoading}
          onFilterChange={handleSearch}
          onSortChange={handleSortChange}
          filterValue={searchQuery}
          sortValue={sortOption}
        />
      </div>
      
      {selectedLandmark && (
        <DetailView 
          landmark={selectedLandmark}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
}
```

### client/src/components/MapContainer.tsx
```typescript
import { useEffect, useRef, useState } from 'react';
import { MapContainer as LeafletMap, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import { LatLngBounds, LatLngExpression } from 'leaflet';
import LandmarkMarker from './LandmarkMarker';
import Loading from './Loading';
import ErrorDisplay from './ErrorDisplay';
import { Landmark } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, Minus, Crosshair } from 'lucide-react';

type MapContainerProps = {
  landmarks: Landmark[];
  selectedLandmark: Landmark | null;
  onSelectLandmark: (landmark: Landmark) => void;
  loading: boolean;
  error: string | null;
  onBoundsChange: (bounds: LatLngBounds) => void;
  onSearchLocation: (location: string) => void;
  center: LatLngExpression | null;
  setCenter: (center: LatLngExpression) => void;
  onRefetch: () => void;
};

// This component updates parent with map bounds
function MapBoundsHandler({ onBoundsChange }: { onBoundsChange: (bounds: LatLngBounds) => void }) {
  const map = useMap();
  
  const mapEvents = useMapEvents({
    moveend: () => {
      onBoundsChange(map.getBounds());
    },
    zoomend: () => {
      onBoundsChange(map.getBounds());
    },
    load: () => {
      onBoundsChange(map.getBounds());
    }
  });
  
  useEffect(() => {
    onBoundsChange(map.getBounds());
  }, [map, onBoundsChange]);
  
  return null;
}

// This component recenter the map when center prop changes
function MapCenterHandler({ center }: { center: LatLngExpression | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, 13);
    }
  }, [map, center]);
  
  return null;
}

const MapContainer = ({
  landmarks,
  selectedLandmark,
  onSelectLandmark,
  loading,
  error,
  onBoundsChange,
  onSearchLocation,
  center,
  setCenter,
  onRefetch
}: MapContainerProps) => {
  const [searchValue, setSearchValue] = useState('');
  const mapRef = useRef(null);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      onSearchLocation(searchValue);
    }
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCenter([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  };

  const defaultCenter: LatLngExpression = center || [51.505, -0.09]; // Default to London

  return (
    <div className="relative flex-1">
      <LeafletMap 
        center={defaultCenter} 
        zoom={13} 
        zoomControl={false}
        className="h-full w-full"
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapBoundsHandler onBoundsChange={onBoundsChange} />
        {center && <MapCenterHandler center={center} />}
        
        {landmarks.map((landmark) => (
          <LandmarkMarker
            key={landmark.pageid}
            landmark={landmark}
            isSelected={selectedLandmark?.pageid === landmark.pageid}
            onSelect={() => onSelectLandmark(landmark)}
          />
        ))}
        
        <ZoomControl position="topright" />
      </LeafletMap>
      
      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2">
        <Button 
          variant="secondary" 
          size="icon" 
          className="rounded-full shadow"
          onClick={() => mapRef.current?._leafletRef.zoomIn()}
          aria-label="Zoom In"
        >
          <Plus className="h-5 w-5" />
        </Button>
        <Button 
          variant="secondary" 
          size="icon" 
          className="rounded-full shadow"
          onClick={() => mapRef.current?._leafletRef.zoomOut()}
          aria-label="Zoom Out"
        >
          <Minus className="h-5 w-5" />
        </Button>
        <Button 
          variant="secondary" 
          size="icon" 
          className="rounded-full shadow"
          onClick={handleGetCurrentLocation}
          aria-label="Use Current Location"
        >
          <Crosshair className="h-5 w-5 text-blue-500" />
        </Button>
      </div>

      {/* Map Search */}
      <div className="absolute top-4 left-4 w-64 sm:w-80 z-10">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Input
            type="text"
            placeholder="Search for location..."
            className="pl-10 pr-4 py-2 shadow-md"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        </form>
      </div>

      {/* Loading Overlay */}
      {loading && <Loading />}

      {/* Error Overlay */}
      {error && <ErrorDisplay error={error} onRetry={onRefetch} />}
    </div>
  );
};

export default MapContainer;
```

### client/src/components/LandmarkMarker.tsx
```typescript
import { Marker, Tooltip } from 'react-leaflet';
import { Icon } from 'leaflet';
import { Landmark } from '@/types';

type LandmarkMarkerProps = {
  landmark: Landmark;
  isSelected: boolean;
  onSelect: () => void;
};

const LandmarkMarker = ({ landmark, isSelected, onSelect }: LandmarkMarkerProps) => {
  // Create custom marker icons
  const defaultIcon = new Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  const selectedIcon = new Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  return (
    <Marker 
      position={[landmark.lat, landmark.lon]} 
      icon={isSelected ? selectedIcon : defaultIcon}
      eventHandlers={{
        click: onSelect
      }}
    >
      <Tooltip direction="top" offset={[0, -20]} opacity={1}>
        <div className="text-sm font-medium">{landmark.title}</div>
        {landmark.distance && (
          <div className="text-xs text-gray-500">{landmark.distance.toFixed(2)} km</div>
        )}
      </Tooltip>
    </Marker>
  );
};

export default LandmarkMarker;
```

### client/src/components/LandmarkPanel.tsx
```typescript
import { useState } from 'react';
import { Landmark } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { SearchX, Search, MapPin, Info } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import Loading from './Loading';

type LandmarkPanelProps = {
  landmarks: Landmark[];
  selectedLandmark: Landmark | null;
  onSelectLandmark: (landmark: Landmark) => void;
  loading: boolean;
  onFilterChange: (query: string) => void;
  onSortChange: (option: string) => void;
  filterValue: string;
  sortValue: string;
};

const LandmarkPanel = ({
  landmarks,
  selectedLandmark,
  onSelectLandmark,
  loading,
  onFilterChange,
  onSortChange,
  filterValue,
  sortValue
}: LandmarkPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange(e.target.value);
  };

  const handleSortChange = (value: string) => {
    onSortChange(value);
  };

  return (
    <div className={`border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col ${
      isExpanded ? 'w-full md:w-80 lg:w-96' : 'w-14'
    } transition-all duration-300`}>
      {/* Panel Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        {isExpanded && (
          <h2 className="text-lg font-semibold">
            {landmarks.length} Landmarks
          </h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsExpanded(!isExpanded)}
          className="ml-auto"
        >
          {isExpanded ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          )}
        </Button>
      </div>

      {/* Search and Filter Controls - Only shown when expanded */}
      {isExpanded && (
        <div className="p-4 space-y-3 border-b border-gray-200 dark:border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Filter landmarks..." 
              className="pl-9"
              value={filterValue}
              onChange={handleFilterChange}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Sort by:</span>
            <Select value={sortValue} onValueChange={handleSortChange}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alphabetical">Alphabetical</SelectItem>
                <SelectItem value="distance">Distance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Landmark List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loading />
          </div>
        ) : landmarks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-4 text-center text-gray-500">
            <SearchX className="h-12 w-12 mb-2" />
            <p>No landmarks found in this area.</p>
            <p className="text-sm">Try moving the map or searching for a different location.</p>
          </div>
        ) : (
          <div className={isExpanded ? "" : "py-2"}>
            {landmarks.map((landmark) => (
              <div 
                key={landmark.pageid}
                className={`${
                  isExpanded 
                    ? 'p-3 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer border-b border-gray-100 dark:border-gray-800' 
                    : 'p-2 flex justify-center'
                } ${
                  selectedLandmark?.pageid === landmark.pageid 
                    ? 'bg-blue-50 dark:bg-blue-950' 
                    : ''
                }`}
                onClick={() => onSelectLandmark(landmark)}
              >
                {isExpanded ? (
                  <>
                    <div className="font-medium truncate">{landmark.title}</div>
                    {landmark.distance !== undefined && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center mt-1">
                        <MapPin className="h-3 w-3 mr-1" /> 
                        {landmark.distance.toFixed(2)} km away
                      </div>
                    )}
                    {landmark.description && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                        {landmark.description.substring(0, 80)}...
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800" title={landmark.title}>
                    <Info className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default LandmarkPanel;
```

### client/src/components/DetailView.tsx
```typescript
import { Landmark } from '@/types';
import { X, MapPin, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

type DetailViewProps = {
  landmark: Landmark;
  onClose: () => void;
};

const DetailView = ({ landmark, onClose }: DetailViewProps) => {
  return (
    <Dialog open={!!landmark} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{landmark.title}</DialogTitle>
          <DialogClose />
        </DialogHeader>
        
        {landmark.thumbnail && (
          <div className="relative w-full h-48 sm:h-64 rounded-md overflow-hidden">
            <img 
              src={landmark.thumbnail} 
              alt={landmark.title} 
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="space-y-4">
          {landmark.distance !== undefined && (
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <MapPin className="h-4 w-4 mr-1" /> 
              Approximately {landmark.distance.toFixed(2)} km away
            </div>
          )}
          
          {landmark.description && (
            <div className="text-sm sm:text-base">
              {landmark.description}
            </div>
          )}
          
          <Separator />
          
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <span>Coordinates: </span>
              <span className="font-mono">{landmark.lat.toFixed(6)}, {landmark.lon.toFixed(6)}</span>
            </div>
            
            <Button 
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              asChild
            >
              <a 
                href={`https://en.wikipedia.org/?curid=${landmark.pageid}`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                View on Wikipedia <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DetailView;
```

### client/src/components/Header.tsx
```typescript
import { Explore } from './icons/Explore';
import { ModeToggle } from './ui/mode-toggle';

const Header = () => {
  return (
    <header className="border-b border-gray-200 dark:border-gray-800 py-3 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Explore className="h-7 w-7 text-blue-500" />
        <h1 className="text-xl font-bold tracking-tight">Landmark Explorer</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <ModeToggle />
      </div>
    </header>
  );
};

export default Header;
```

### client/src/components/Loading.tsx
```typescript
const Loading = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-900/50 z-50">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">Loading landmarks...</p>
      </div>
    </div>
  );
};

export default Loading;
```

### client/src/components/ErrorDisplay.tsx
```typescript
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ErrorDisplayProps = {
  error: string;
  onRetry: () => void;
};

const ErrorDisplay = ({ error, onRetry }: ErrorDisplayProps) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 z-50">
      <div className="max-w-md p-6 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-red-200 dark:border-red-900">
        <div className="flex flex-col items-center text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Landmarks</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          <Button onClick={onRetry}>Try Again</Button>
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;
```

### client/src/hooks/use-map-bounds.ts
```typescript
import { useState } from 'react';
import { LatLngBounds, LatLngExpression } from 'leaflet';

export function useMapBounds() {
  const [bounds, setBounds] = useState<LatLngBounds | null>(null);
  const [center, setCenter] = useState<LatLngExpression | null>(null);

  return {
    bounds,
    setBounds,
    center,
    setCenter
  };
}
```

### client/src/types/index.ts
```typescript
export interface Landmark {
  pageid: number;
  title: string;
  lat: number;
  lon: number;
  description?: string;
  thumbnail?: string;
  address?: string;
  distance?: number;
  facts?: Array<{
    type: string;
    label: string;
    value: string;
  }>;
}

export interface WikiGeosearchResult {
  pageid: number;
  ns: number;
  title: string;
  lat: number;
  lon: number;
  dist: number;
  primary: string;
}

export interface WikiLandmarkDetails {
  pageid: number;
  title: string;
  extract?: string;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
}

export interface GeocodeResult {
  lat: number;
  lon: number;
  display_name: string;
}
```

### client/src/index.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 210 40% 98%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
  
  /* Leaflet map styles */
  .leaflet-container {
    height: 100%;
    width: 100%;
  }
}
```

## Configuration Files

### package.json
```json
{
  "name": "rest-express",
  "version": "1.0.0",
  "license": "MIT",
  "scripts": {
    "dev": "tsx server/index.ts",
    "build": "vite build",
    "start": "node dist/server/index.js"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.3.4",
    "@jridgewell/trace-mapping": "0.3.9",
    "@neondatabase/serverless": "^0.6.0",
    "@radix-ui/react-accordion": "^1.1.2",
    "@radix-ui/react-alert-dialog": "^1.0.5",
    "@radix-ui/react-aspect-ratio": "^1.0.3",
    "@radix-ui/react-avatar": "^1.0.4",
    "@radix-ui/react-checkbox": "^1.0.4",
    "@radix-ui/react-collapsible": "^1.0.3",
    "@radix-ui/react-context-menu": "^2.1.5",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-hover-card": "^1.0.7",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-menubar": "^1.0.4",
    "@radix-ui/react-navigation-menu": "^1.1.4",
    "@radix-ui/react-popover": "^1.0.7",
    "@radix-ui/react-progress": "^1.0.3",
    "@radix-ui/react-radio-group": "^1.1.3",
    "@radix-ui/react-scroll-area": "^1.0.5",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-separator": "^1.0.3",
    "@radix-ui/react-slider": "^1.1.2",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-switch": "^1.0.3",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.5",
    "@radix-ui/react-toggle": "^1.0.3",
    "@radix-ui/react-toggle-group": "^1.0.4",
    "@radix-ui/react-tooltip": "^1.0.7",
    "@replit/vite-plugin-cartographer": "^0.0.5",
    "@replit/vite-plugin-runtime-error-modal": "^0.0.5",
    "@replit/vite-plugin-shadcn-theme-json": "^2.0.0",
    "@tailwindcss/typography": "^0.5.10",
    "@tanstack/react-query": "^5.8.4",
    "@types/connect-pg-simple": "^7.0.3",
    "@types/express": "^4.17.21",
    "@types/express-session": "^1.17.10",
    "@types/node": "^20.9.2",
    "@types/passport": "^1.0.16",
    "@types/passport-local": "^1.0.38",
    "@types/react": "^18.2.37",
    "@types/react-dom": "^18.2.15",
    "@types/ws": "^8.5.10",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.16",
    "axios": "^1.6.5",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "cmdk": "^0.2.0",
    "connect-pg-simple": "^9.0.1",
    "date-fns": "^2.30.0",
    "drizzle-kit": "^0.20.4",
    "drizzle-orm": "^0.29.0",
    "drizzle-zod": "^0.5.1",
    "embla-carousel-react": "^8.0.0-rc14",
    "esbuild": "0.18.20",
    "express": "^4.18.2",
    "express-session": "^1.17.3",
    "framer-motion": "^10.16.5",
    "input-otp": "^1.0.0",
    "leaflet": "^1.9.4",
    "lucide-react": "^0.288.0",
    "memorystore": "^1.6.7",
    "passport": "^0.6.0",
    "passport-local": "^1.0.0",
    "postcss": "^8.4.31",
    "react": "^18.3.1",
    "react-day-picker": "^8.9.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.48.2",
    "react-icons": "^4.12.0",
    "react-leaflet": "^4.2.1",
    "react-resizable-panels": "^0.0.55",
    "recharts": "^2.9.3",
    "tailwind-merge": "^2.0.0",
    "tailwindcss": "^3.3.5",
    "tailwindcss-animate": "^1.0.7",
    "tsx": "^4.6.0",
    "typescript": "^5.2.2",
    "vaul": "^0.7.9",
    "vite": "^5.0.0",
    "wouter": "^2.12.1",
    "ws": "^8.14.2",
    "zod": "^3.22.4",
    "zod-validation-error": "^2.1.0"
  }
}
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "sourceMap": true,
    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    /* Linting */
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./client/src/*"],
      "@shared/*": ["./shared/*"],
      "@/schema": ["./shared/schema"]
    }
  },
  "include": ["client/src", "shared", "server"],
  "exclude": ["node_modules"]
}
```

### vite.config.ts
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { themeJsonPlugin } from "@replit/vite-plugin-shadcn-theme-json";
import cartographerPlugin from "@replit/vite-plugin-cartographer";
import errorModalPlugin from "@replit/vite-plugin-runtime-error-modal";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    themeJsonPlugin(),
    cartographerPlugin(),
    errorModalPlugin()
  ],
  server: {
    hmr: {
      clientPort: 443,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
      "@shared": path.resolve(__dirname, "./shared"),
      "@/schema": path.resolve(__dirname, "./shared/schema"),
    },
  },
  clearScreen: false,
});
```

### tailwind.config.ts
```typescript
import { fontFamily } from "tailwindcss/defaultTheme";
import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./client/src/**/*.{ts,tsx}",
    "./client/src/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["Inter", ...fontFamily.sans],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;

export default config;
```