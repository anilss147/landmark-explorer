import React, { useState, useEffect } from 'react';
import { LatLngExpression, LatLng } from 'leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Compass, Navigation, MapIcon } from 'lucide-react';
import { formatDistance } from '@/lib/distance';
import { apiRequest } from '@/lib/queryClient';

interface LocationInfoPanelProps {
  position: LatLngExpression | null;
  visible: boolean;
}

interface GeocodingResult {
  display_name: string;
  address: {
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

const LocationInfoPanel = ({ position, visible }: LocationInfoPanelProps) => {
  const [locationInfo, setLocationInfo] = useState<GeocodingResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchLocationInfo() {
      if (!position || !visible) {
        return;
      }

      setLoading(true);
      try {
        // Convert position to coordinates
        let lat: number = 0, lng: number = 0;
        
        try {
          if (Array.isArray(position)) {
            lat = Number(position[0]);
            lng = Number(position[1]);
          } else if (typeof position === 'object' && position !== null) {
            // Handle LatLng object
            if ('lat' in position) {
              lat = Number(typeof position.lat === 'function' ? position.lat() : position.lat);
            }
            if ('lng' in position) {
              lng = Number(typeof position.lng === 'function' ? position.lng() : position.lng);
            }
          }
        } catch (e) {
          console.error('Error parsing coordinates:', e);
        }
        
        if (lat === undefined || lng === undefined) {
          console.error('Could not extract coordinates from position');
          setLoading(false);
          return;
        }
        
        // Use OpenStreetMap's Nominatim for reverse geocoding
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
          { headers: { 'Accept-Language': 'en-US,en' } }
        );
        
        if (response.ok) {
          const data = await response.json();
          setLocationInfo(data);
        }
      } catch (error) {
        console.error('Error fetching location info:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchLocationInfo();
  }, [position, visible]);

  if (!visible || !position) {
    return null;
  }

  return (
    <Card className="absolute bottom-16 left-4 z-10 w-64 sm:w-80 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center">
          <MapPin className="h-4 w-4 mr-2 text-blue-500" />
          Current Location
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="text-sm text-gray-500">Loading location info...</div>
        ) : locationInfo ? (
          <div className="space-y-2">
            <div className="text-sm font-medium">{locationInfo.display_name}</div>
            
            {locationInfo.address && (
              <div className="flex flex-wrap gap-1 mt-2">
                {locationInfo.address.city && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <MapIcon className="h-3 w-3" />
                    {locationInfo.address.city}
                  </Badge>
                )}
                {locationInfo.address.country && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Navigation className="h-3 w-3" />
                    {locationInfo.address.country}
                  </Badge>
                )}
              </div>
            )}
            
            <div className="text-xs text-gray-500 pt-1 flex items-center">
              <Compass className="h-3 w-3 mr-1" />
              Coordinates: {(() => {
                let lat: number = 0, lng: number = 0;
                
                try {
                  if (Array.isArray(position)) {
                    lat = Number(position[0]);
                    lng = Number(position[1]);
                  } else if (typeof position === 'object' && position !== null) {
                    // Handle LatLng object
                    if ('lat' in position) {
                      lat = Number(typeof position.lat === 'function' ? position.lat() : position.lat);
                    }
                    if ('lng' in position) {
                      lng = Number(typeof position.lng === 'function' ? position.lng() : position.lng);
                    }
                  }
                } catch (e) {
                  console.error('Error parsing coordinates:', e);
                }
                
                return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
              })()}
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">
            No information available for this location
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LocationInfoPanel;