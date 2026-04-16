import { describe, it, expect } from 'vitest';
import { HISTORICAL_EVENTS } from '../../data/historical-events';
import { MIN_YEAR, MAX_YEAR } from '../constants';

describe('HISTORICAL_EVENTS', () => {
  it('has at least 20 events', () => {
    expect(HISTORICAL_EVENTS.length).toBeGreaterThanOrEqual(20);
  });

  it('all events are within the app year range', () => {
    HISTORICAL_EVENTS.forEach((ev) => {
      expect(ev.year).toBeGreaterThanOrEqual(MIN_YEAR);
      expect(ev.year).toBeLessThanOrEqual(MAX_YEAR);
    });
  });

  it('all events have non-empty names', () => {
    HISTORICAL_EVENTS.forEach((ev) => {
      expect(ev.name.trim().length).toBeGreaterThan(0);
    });
  });
});
