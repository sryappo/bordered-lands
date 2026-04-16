export interface HistoricalEvent {
  year: number;
  name: string;
  summary?: string;
}

export const HISTORICAL_EVENTS: HistoricalEvent[] = [
  { year: -3000, name: 'Dawn of recorded history' },
  { year: -753, name: 'Founding of Rome' },
  { year: -221, name: 'Qin unifies China' },
  { year: 476, name: 'Fall of Western Rome' },
  { year: 800, name: 'Charlemagne crowned' },
  { year: 1066, name: 'Norman Conquest of England' },
  { year: 1206, name: 'Genghis Khan founds Mongol Empire' },
  { year: 1279, name: 'Mongol Empire reaches peak' },
  { year: 1453, name: 'Fall of Constantinople' },
  { year: 1492, name: 'Columbus reaches Americas' },
  { year: 1648, name: 'Peace of Westphalia' },
  { year: 1776, name: 'US Declaration of Independence' },
  { year: 1815, name: 'Congress of Vienna' },
  { year: 1871, name: 'German Unification' },
  { year: 1914, name: 'World War I begins' },
  { year: 1918, name: 'WWI ends; empires collapse' },
  { year: 1939, name: 'World War II begins' },
  { year: 1945, name: 'WWII ends; UN founded' },
  { year: 1947, name: 'Indian independence & partition' },
  { year: 1949, name: 'PRC founded' },
  { year: 1960, name: "Africa's Year of Independence" },
  { year: 1989, name: 'Fall of the Berlin Wall' },
  { year: 1991, name: 'Dissolution of the USSR' },
  { year: 1993, name: 'Czechoslovakia splits' },
  { year: 2011, name: 'South Sudan independence' },
];
