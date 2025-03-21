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
