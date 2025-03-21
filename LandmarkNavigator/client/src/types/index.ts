export interface Landmark {
  pageid: number;
  title: string;
  lat: number;
  lon: number;
  description?: string;
  thumbnail?: string;
  address?: string;
  distance?: number;
  isBookmarked?: boolean;
  facts?: Array<{
    type: string;
    label: string;
    value: string;
  }>;
}

export interface WikiGeosearchResult {
  pageid: number;
  ns: number;
  title: string;
  lat: number;
  lon: number;
  dist: number;
  primary: string;
}

export interface WikiLandmarkDetails {
  pageid: number;
  title: string;
  extract?: string;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
}

export interface GeocodeResult {
  lat: number;
  lon: number;
  display_name: string;
}
