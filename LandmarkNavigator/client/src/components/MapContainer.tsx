import { useEffect, useRef, useState } from 'react';
import { MapContainer as LeafletMap, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import { LatLngBounds, LatLngExpression } from 'leaflet';
import LandmarkMarker from './LandmarkMarker';
import UserLocationMarker from './UserLocationMarker';
import MapStyleSelector, { MapStyle, MAP_STYLES } from './MapStyleSelector';
import LocationInfoPanel from './LocationInfoPanel';
import Loading from './Loading';
import ErrorDisplay from './ErrorDisplay';
import { Landmark } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search, Plus, Minus, Crosshair, MapPin, Info } from 'lucide-react';

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
  userPosition: LatLngExpression | null;
  userAccuracy: number | null;
  locationTracking: boolean;
  followUserMode: boolean;
  toggleLocationTracking: () => void;
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
  onRefetch,
  userPosition,
  userAccuracy,
  locationTracking,
  followUserMode,
  toggleLocationTracking
}: MapContainerProps) => {
  const [searchValue, setSearchValue] = useState('');
  const mapRef = useRef<any>(null);
  const [mapStyle, setMapStyle] = useState<MapStyle>({
    id: 'streets',
    name: 'Streets',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
  });
  const [showLocationInfo, setShowLocationInfo] = useState(false);
  
  // Load saved map style preference from localStorage
  useEffect(() => {
    const savedStyleId = localStorage.getItem('mapStylePreference');
    if (savedStyleId) {
      const savedStyle = MAP_STYLES.find(style => style.id === savedStyleId);
      if (savedStyle) {
        setMapStyle(savedStyle);
      }
    }
  }, []);

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
  
  const handleSelectMapStyle = (style: MapStyle) => {
    setMapStyle(style);
    localStorage.setItem('mapStylePreference', style.id);
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
          url={mapStyle.url}
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
        
        {userPosition && (
          <UserLocationMarker 
            position={userPosition} 
            accuracy={userAccuracy}
            followMode={followUserMode}
          />
        )}
        
        <ZoomControl position="topright" />
      </LeafletMap>
      
      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2">
        <Button 
          variant="secondary" 
          size="icon" 
          className="rounded-full shadow"
          onClick={() => mapRef.current?.zoomIn()}
          aria-label="Zoom In"
        >
          <Plus className="h-5 w-5" />
        </Button>
        <Button 
          variant="secondary" 
          size="icon" 
          className="rounded-full shadow"
          onClick={() => mapRef.current?.zoomOut()}
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
      
      {/* Location tracking toggle */}
      <div className="absolute bottom-4 right-4 z-10">
        <div className="bg-white p-3 rounded-lg shadow-md flex items-center gap-2">
          <Switch
            id="location-tracking"
            checked={locationTracking}
            onCheckedChange={toggleLocationTracking}
          />
          <Label htmlFor="location-tracking" className="flex items-center gap-1">
            <MapPin className={`h-4 w-4 ${locationTracking ? 'text-blue-500' : 'text-gray-500'}`} />
            <span>{followUserMode ? "Following" : "Track location"}</span>
          </Label>
          
          {userPosition && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-2 p-0 h-6 w-6"
              onClick={() => setShowLocationInfo(!showLocationInfo)}
              title={showLocationInfo ? "Hide location info" : "Show location info"}
            >
              <Info className={`h-4 w-4 ${showLocationInfo ? 'text-blue-500' : 'text-gray-500'}`} />
            </Button>
          )}
        </div>
      </div>
      
      {/* Location Info Panel */}
      {userPosition && (
        <LocationInfoPanel
          position={userPosition}
          visible={showLocationInfo}
        />
      )}

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
      
      {/* Map Style Selector */}
      <MapStyleSelector 
        selectedStyleId={mapStyle.id}
        onSelectStyle={handleSelectMapStyle}
      />

      {/* Loading Overlay */}
      {loading && <Loading />}

      {/* Error Overlay */}
      {error && <ErrorDisplay error={error} onRetry={onRefetch} />}
    </div>
  );
};

export default MapContainer;
