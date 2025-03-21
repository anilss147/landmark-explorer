import { useState, useEffect, useCallback } from 'react';
import { LatLngExpression } from 'leaflet';

export interface UserLocationState {
  position: LatLngExpression | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
  timestamp: number | null;
  tracking: boolean;
}

const initialState: UserLocationState = {
  position: null,
  accuracy: null,
  loading: false,
  error: null,
  timestamp: null,
  tracking: false
};

export function useUserLocation() {
  const [state, setState] = useState<UserLocationState>(initialState);
  const [watchId, setWatchId] = useState<number | null>(null);

  // Function to get the user's location once
  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: "Geolocation is not supported by your browser",
        loading: false
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          position: [position.coords.latitude, position.coords.longitude],
          accuracy: position.coords.accuracy,
          loading: false,
          error: null,
          timestamp: position.timestamp,
          tracking: state.tracking
        });
      },
      (error) => {
        setState(prev => ({
          ...prev,
          error: getGeolocationErrorMessage(error),
          loading: false
        }));
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  }, [state.tracking]);

  // Start continuous location tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: "Geolocation is not supported by your browser",
        loading: false
      }));
      return () => {};
    }

    setState(prev => ({ ...prev, loading: true, tracking: true }));

    const id = navigator.geolocation.watchPosition(
      (position) => {
        setState({
          position: [position.coords.latitude, position.coords.longitude],
          accuracy: position.coords.accuracy,
          loading: false,
          error: null,
          timestamp: position.timestamp,
          tracking: true
        });
      },
      (error) => {
        setState(prev => ({
          ...prev,
          error: getGeolocationErrorMessage(error),
          loading: false,
          tracking: true
        }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    setWatchId(id);
    
    // Return a cleanup function
    return () => {
      if (id !== null) {
        navigator.geolocation.clearWatch(id);
        setWatchId(null);
        setState(prev => ({ ...prev, tracking: false }));
      }
    };
  }, []);

  // Stop location tracking
  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setState(prev => ({ ...prev, tracking: false }));
    }
  }, [watchId]);

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return {
    ...state,
    getUserLocation,
    startTracking,
    stopTracking
  };
}

// Helper function to get a user-friendly error message
function getGeolocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "User denied the request for geolocation";
    case error.POSITION_UNAVAILABLE:
      return "Location information is unavailable";
    case error.TIMEOUT:
      return "The request to get user location timed out";
    default:
      return "An unknown error occurred";
  }
}