import React from 'react';
import { Button } from '@/components/ui/button';
import { Palette } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type MapStyle = {
  id: string;
  name: string;
  url: string;
};

const MAP_STYLES: MapStyle[] = [
  {
    id: 'streets',
    name: 'Streets',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  },
  {
    id: 'topo',
    name: 'Topography',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  },
  {
    id: 'satellite',
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  },
  {
    id: 'dark',
    name: 'Dark Mode',
    url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
  },
  {
    id: 'watercolor',
    name: 'Watercolor',
    url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.jpg',
  },
];

type MapStyleSelectorProps = {
  selectedStyleId: string;
  onSelectStyle: (style: MapStyle) => void;
};

const MapStyleSelector = ({
  selectedStyleId,
  onSelectStyle,
}: MapStyleSelectorProps) => {
  const selectedStyle = MAP_STYLES.find(style => style.id === selectedStyleId) || MAP_STYLES[0];

  return (
    <div className="absolute top-20 left-4 z-10">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="bg-white shadow flex items-center gap-2"
          >
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">{selectedStyle.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {MAP_STYLES.map(style => (
            <DropdownMenuItem
              key={style.id}
              className={`${style.id === selectedStyleId ? 'bg-blue-50 font-medium' : ''}`}
              onClick={() => onSelectStyle(style)}
            >
              {style.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default MapStyleSelector;
export { MAP_STYLES };