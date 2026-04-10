import type * as GeoJSON from 'geojson';

export interface BorderResult {
  geojson: GeoJSON.FeatureCollection;
  source: 'natural-earth' | 'thenmap' | 'historical-basemaps';
  actualYear: number;
}

export interface DisputedZone {
  name: string;
  parties: string;
}

export type EraId =
  | 'ancient'
  | 'classical'
  | 'late-antiquity'
  | 'medieval'
  | 'early-modern'
  | 'empires'
  | 'world-wars'
  | 'cold-war'
  | 'modern';
