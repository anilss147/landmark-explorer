import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { Landmark } from '@/types';
import { formatDistance } from '@/lib/distance';

// Create custom marker icons
const createMarkerIcon = (isSelected: boolean) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="relative">
        <div class="w-8 h-8 rounded-full ${isSelected ? 'bg-blue-500' : 'bg-orange-500'} flex items-center justify-center shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
        <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
          <div class="w-2 h-2 rotate-45 ${isSelected ? 'bg-blue-500' : 'bg-orange-500'}"></div>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

type LandmarkMarkerProps = {
  landmark: Landmark;
  isSelected: boolean;
  onSelect: () => void;
};

const LandmarkMarker = ({ landmark, isSelected, onSelect }: LandmarkMarkerProps) => {
  const position: [number, number] = [landmark.lat, landmark.lon];
  const markerIcon = createMarkerIcon(isSelected);

  return (
    <Marker 
      position={position} 
      icon={markerIcon} 
      eventHandlers={{
        click: onSelect,
      }}
    >
      <Tooltip>
        <div>
          <div className="font-semibold">{landmark.title}</div>
          {landmark.distance !== undefined && (
            <div className="text-xs text-gray-600">Distance: {formatDistance(landmark.distance)}</div>
          )}
        </div>
      </Tooltip>
    </Marker>
  );
};

export default LandmarkMarker;
