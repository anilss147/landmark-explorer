import { useState, useEffect } from 'react';
import { MapStyle, MAP_STYLES } from '@/components/MapStyleSelector';

export function useMapStyle() {
  const [selectedStyleId, setSelectedStyleId] = useState<string>('streets');
  
  useEffect(() => {
    // Load saved style preference from localStorage
    const savedStyle = localStorage.getItem('mapStylePreference');
    if (savedStyle) {
      setSelectedStyleId(savedStyle);
    }
  }, []);
  
  const setStyle = (style: MapStyle) => {
    setSelectedStyleId(style.id);
    // Save preference to localStorage
    localStorage.setItem('mapStylePreference', style.id);
  };
  
  const selectedStyle = MAP_STYLES.find(style => style.id === selectedStyleId) || MAP_STYLES[0];
  
  return {
    selectedStyleId,
    selectedStyle,
    setStyle,
    allStyles: MAP_STYLES
  };
}