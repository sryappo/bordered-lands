'use client';

import { useRef } from 'react';
import MapCanvas, { type MapCanvasHandle } from './Map/MapCanvas';

export default function MapApp() {
  const mapRef = useRef<MapCanvasHandle>(null);

  return (
    <div className="flex flex-col h-screen w-screen bg-dark-bg">
      <MapCanvas ref={mapRef} />
    </div>
  );
}
