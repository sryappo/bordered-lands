import type * as GeoJSON from 'geojson';

export interface BorderResult {
  geojson: GeoJSON.FeatureCollection;
  source: 'natural-earth' | 'cshapes' | 'historical-basemaps';
  actualYear: number;
}

export interface DisputedZone {
  name: string;
  parties: string;
}

export interface DisputedFeature {
  feature: GeoJSON.Feature;
  reason: 'ending' | 'starting';
  year: number;
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

export interface CShapesProperties {
  cntry_name: string;
  gwsyear: number;
  gweyear: number;
}
