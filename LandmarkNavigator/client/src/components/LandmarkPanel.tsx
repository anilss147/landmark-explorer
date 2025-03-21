import { useState, useEffect } from 'react';
import { Landmark } from '@/types';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FilterIcon } from "lucide-react";

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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isPanelHidden, setIsPanelHidden] = useState(isMobile);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsPanelHidden(false);
      } else {
        setIsPanelHidden(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const togglePanel = () => {
    setIsPanelHidden(!isPanelHidden);
  };

  // Calculate distances (mock implementation)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  };

  const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
  };

  // Format distance
  const formatDistance = (distance: number) => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)} m`;
    } else if (distance < 10) {
      return `${distance.toFixed(1)} km`;
    } else {
      return `${Math.round(distance)} km`;
    }
  };

  return (
    <div 
      className={`w-full md:w-96 bg-white shadow-lg transform transition-transform duration-300 ${
        isPanelHidden && isMobile ? 'translate-x-full' : ''
      }`}
    >
      {/* Panel Header */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <h2 className="font-semibold text-lg">Landmarks in View</h2>
        <div className="flex items-center space-x-2">
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            {landmarks.length}
          </span>
          {isMobile && (
            <button 
              onClick={togglePanel}
              className="md:hidden p-2 rounded-full hover:bg-gray-200"
            >
              <span className="material-icons">menu</span>
            </button>
          )}
        </div>
      </div>

      {/* Filtering & Sorting Options */}
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Input 
              type="text" 
              placeholder="Filter landmarks..." 
              className="w-full pl-9 pr-3 py-2 text-sm"
              value={filterValue}
              onChange={(e) => onFilterChange(e.target.value)}
            />
            <FilterIcon className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          </div>
          <Select value={sortValue} onValueChange={onSortChange}>
            <SelectTrigger className="w-auto">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="distance">Distance</SelectItem>
              <SelectItem value="alphabetical">Alphabetical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Landmark List */}
      <div className="overflow-y-auto custom-scrollbar" style={{ height: "calc(100% - 124px)" }}>
        <ul className="divide-y divide-gray-200">
          {loading ? (
            // Loading skeleton items
            Array(5).fill(0).map((_, index) => (
              <li key={`loading-${index}`} className="p-3">
                <div className="flex animate-pulse">
                  <div className="flex-shrink-0 w-16 h-16 bg-gray-300 rounded mr-3"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-full mb-1"></div>
                    <div className="h-3 bg-gray-300 rounded w-4/5"></div>
                    <div className="h-2 bg-gray-300 rounded w-1/4 mt-2"></div>
                  </div>
                </div>
              </li>
            ))
          ) : landmarks.length > 0 ? (
            landmarks.map((landmark) => (
              <li 
                key={landmark.pageid}
                className={`p-3 hover:bg-blue-50 cursor-pointer ${
                  selectedLandmark?.pageid === landmark.pageid ? 'bg-blue-50' : ''
                }`}
                onClick={() => onSelectLandmark(landmark)}
              >
                <div className="flex">
                  <div className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded overflow-hidden mr-3">
                    {landmark.thumbnail ? (
                      <img 
                        src={landmark.thumbnail} 
                        alt={landmark.title} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                        <span className="material-icons">image</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-medium ${selectedLandmark?.pageid === landmark.pageid ? 'text-blue-600' : ''}`}>
                      {landmark.title}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {landmark.description || "No description available."}
                    </p>
                    <div className="flex items-center mt-1 text-xs text-gray-500">
                      <span className="material-icons text-xs mr-1">place</span>
                      <span>
                        {landmark.distance ? formatDistance(landmark.distance) : "Distance unavailable"}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            ))
          ) : (
            <li className="p-5 text-center text-gray-500">
              No landmarks found in this area
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default LandmarkPanel;
