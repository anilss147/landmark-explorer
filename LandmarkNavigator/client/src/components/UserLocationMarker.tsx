import React from 'react';
import { Marker, Tooltip, Circle } from 'react-leaflet';
import { divIcon, LatLngExpression } from 'leaflet';
import { formatDistance } from '@/lib/distance';

type UserLocationMarkerProps = {
  position: LatLngExpression;
  accuracy: number | null;
  followMode: boolean;
};

const UserLocationMarker = ({ position, accuracy, followMode }: UserLocationMarkerProps) => {
  // Create a custom HTML marker with a pulsing effect
  const customMarkerIcon = divIcon({
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    html: `
      <div class="relative">
        <div class="absolute top-0 left-0 h-6 w-6 rounded-full bg-blue-500 opacity-75 ${followMode ? 'animate-ping' : ''}"></div>
        <div class="absolute top-1 left-1 h-4 w-4 rounded-full bg-white border-2 border-blue-500"></div>
      </div>
    `
  });

  return (
    <>
      <Marker position={position} icon={customMarkerIcon}>
        <Tooltip direction="top" offset={[0, -10]} opacity={0.9} permanent>
          <div className="text-xs font-medium">You are here</div>
        </Tooltip>
      </Marker>
      
      {/* Show accuracy circle if available */}
      {accuracy && accuracy > 0 && (
        <Circle 
          center={position}
          radius={accuracy}
          pathOptions={{
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.1,
            weight: 1
          }}
        />
      )}
    </>
  );
};

export default UserLocationMarker;