import { LatLngExpression } from 'leaflet';

/**
 * Calculate distance between two coordinates using the Haversine formula
 * @param position1 First position [lat, lng]
 * @param position2 Second position [lat, lng]
 * @returns Distance in kilometers
 */
export function calculateDistance(
  position1: LatLngExpression, 
  position2: LatLngExpression
): number {
  // Convert LatLngExpression to [lat, lng] array
  const p1 = Array.isArray(position1) 
    ? position1 
    : [position1.lat, position1.lng];
  
  const p2 = Array.isArray(position2) 
    ? position2 
    : [position2.lat, position2.lng];
  
  const [lat1, lon1] = p1;
  const [lat2, lon2] = p2;
  
  const R = 6371; // Radius of the Earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function deg2rad(deg: number): number {
  return deg * (Math.PI/180);
}

/**
 * Format distance to a user-friendly string
 * @param distance Distance in kilometers
 * @returns Formatted distance string
 */
export function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  }
  return `${distance.toFixed(1)} km`;
}