import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import MapContainer from "@/components/MapContainer";
import LandmarkPanel from "@/components/LandmarkPanel";
import DetailView from "@/components/DetailView";
import WelcomeOverlay from "@/components/WelcomeOverlay";
import BookmarksPanel from "@/components/BookmarksPanel";
import { Landmark } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useMapBounds } from "@/hooks/use-map-bounds";
import { useUserLocation } from "@/hooks/use-user-location";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { calculateDistance } from "@/lib/distance";

export default function Home() {
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOption, setSortOption] = useState<string>("distance");
  const [followUserMode, setFollowUserMode] = useState<boolean>(false);
  const { bounds, setBounds, center, setCenter } = useMapBounds();
  const { 
    position: userPosition, 
    accuracy: userAccuracy, 
    loading: locationLoading, 
    error: locationError,
    tracking: locationTracking,
    startTracking: startLocationTracking,
    stopTracking: stopLocationTracking,
    getUserLocation
  } = useUserLocation();
  const { toast } = useToast();
  const { bookmarks, isBookmarked, toggleBookmark } = useBookmarks();

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

  // Calculate distances to user position if available
  useEffect(() => {
    if (userPosition && filteredLandmarks) {
      // Update distances based on user location
      filteredLandmarks.forEach(landmark => {
        landmark.distance = calculateDistance(
          userPosition, 
          [landmark.lat, landmark.lon]
        );
      });
    }
  }, [userPosition, filteredLandmarks]);

  // Toggle user location tracking
  const toggleLocationTracking = () => {
    if (locationTracking) {
      stopLocationTracking();
      setFollowUserMode(false);
      toast({
        title: "Location tracking stopped",
        description: "Your location is no longer being tracked."
      });
    } else {
      const stopTracking = startLocationTracking();
      setFollowUserMode(true);
      toast({
        title: "Location tracking started",
        description: "Your location is now being tracked."
      });
    }
  };

  // Sort landmarks
  const sortedLandmarks = filteredLandmarks ? [...filteredLandmarks].sort((a, b) => {
    if (sortOption === "alphabetical") {
      return a.title.localeCompare(b.title);
    } else if (sortOption === "distance") {
      if (userPosition && a.distance !== undefined && b.distance !== undefined) {
        // Sort by distance to user if tracking
        return a.distance - b.distance;
      } else if (center) {
        // Fallback to center point distance
        const distA = Math.sqrt(
          Math.pow(a.lat - (Array.isArray(center) ? center[0] : center.lat), 2) + 
          Math.pow(a.lon - (Array.isArray(center) ? center[1] : center.lng), 2)
        );
        const distB = Math.sqrt(
          Math.pow(b.lat - (Array.isArray(center) ? center[0] : center.lat), 2) + 
          Math.pow(b.lon - (Array.isArray(center) ? center[1] : center.lng), 2)
        );
        return distA - distB;
      }
    }
    return 0;
  }) : [];

  // Update bookmark status in landmarks
  useEffect(() => {
    if (filteredLandmarks && bookmarks.length > 0) {
      filteredLandmarks.forEach(landmark => {
        landmark.isBookmarked = isBookmarked(landmark.pageid);
      });
    }
  }, [filteredLandmarks, bookmarks, isBookmarked]);

  // Handle toggling bookmark status
  const handleToggleBookmark = (landmark: Landmark) => {
    toggleBookmark(landmark);
    toast({
      title: isBookmarked(landmark.pageid) ? "Bookmark removed" : "Bookmark added",
      description: isBookmarked(landmark.pageid) 
        ? `${landmark.title} has been removed from your bookmarks.` 
        : `${landmark.title} has been added to your bookmarks.`,
    });
  };

  // Auto-center map on user location when follow mode is active
  useEffect(() => {
    if (followUserMode && userPosition) {
      setCenter(userPosition);
    }
  }, [followUserMode, userPosition, setCenter]);

  return (
    <div className="flex flex-col h-screen">
      <WelcomeOverlay />
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
          userPosition={userPosition}
          userAccuracy={userAccuracy}
          locationTracking={locationTracking}
          followUserMode={followUserMode}
          toggleLocationTracking={toggleLocationTracking}
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
          onToggleBookmark={handleToggleBookmark}
          isBookmarked={isBookmarked(selectedLandmark.pageid)}
        />
      )}

      {/* Bookmarks Panel */}
      <BookmarksPanel 
        bookmarks={bookmarks}
        onSelectLandmark={handleSelectLandmark}
        onRemoveBookmark={(landmarkId) => {
          const bookmark = bookmarks.find(b => b.pageid === landmarkId);
          if (bookmark) {
            handleToggleBookmark(bookmark);
          }
        }}
      />
    </div>
  );
}
