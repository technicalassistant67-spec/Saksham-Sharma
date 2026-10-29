/**
 * SafeCross OpenStreetMap Overpass Crossing Service
 * Keyless, rate-limited, cached pedestrian crossing retriever.
 */

import { DEFAULT_THRESHOLDS } from '../core/config/thresholds';
import { haversineDistance } from '../core/geo/calculations';
import { MappedCrossing } from '../core/models/types';

export class CrossingService {
  private cachedCrossings: MappedCrossing[] = [];
  private lastFetchTime = 0;
  private lastFetchLat: number | null = null;
  private lastFetchLng: number | null = null;
  private isFetching = false;
  public statusMessage: string = 'No verified crossing data for this area.';

  /**
   * Fetches crossings around (lat, lng) within 300m if threshold criteria met:
   * - At least 60s since last fetch
   * - Or moved > 150m from last fetch location
   */
  public async getCrossingsNear(
    lat: number,
    lng: number,
    force: boolean = false
  ): Promise<MappedCrossing[]> {
    const now = Date.now();
    const minIntervalMs = DEFAULT_THRESHOLDS.CROSSING_CACHE_TTL_S * 1000;

    let hasMovedFar = false;
    if (this.lastFetchLat !== null && this.lastFetchLng !== null) {
      const movedDist = haversineDistance(
        this.lastFetchLat,
        this.lastFetchLng,
        lat,
        lng
      );
      if (movedDist >= DEFAULT_THRESHOLDS.CROSSING_MIN_MOVE_M) {
        hasMovedFar = true;
      }
    } else {
      hasMovedFar = true;
    }

    if (!force && this.cachedCrossings.length > 0 && !hasMovedFar && now - this.lastFetchTime < minIntervalMs) {
      return this.cachedCrossings;
    }

    if (this.isFetching) {
      return this.cachedCrossings;
    }

    this.isFetching = true;

    try {
      // Overpass QL query: nodes with highway=crossing within 300m radius
      const radiusM = DEFAULT_THRESHOLDS.CROSSING_RADIUS_M;
      const query = `[out:json][timeout:8];(node["highway"="crossing"](around:${radiusM},${lat},${lng}););out body;`;
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Overpass returned HTTP ${response.status}`);
      }

      const data = await response.json();
      if (Array.isArray(data.elements) && data.elements.length > 0) {
        this.cachedCrossings = data.elements.map((el: { id: number; lat: number; lon: number; tags?: Record<string, string> }) => ({
          id: el.id,
          lat: el.lat,
          lng: el.lon,
          type: el.tags?.crossing || 'zebra',
          source: 'OpenStreetMap',
          distanceMeters: haversineDistance(lat, lng, el.lat, el.lon),
        }));
        this.statusMessage = `${this.cachedCrossings.length} mapped crossing(s) in 300m range`;
      } else {
        this.cachedCrossings = [];
        this.statusMessage = 'No verified crossing data for this area.';
      }

      this.lastFetchTime = now;
      this.lastFetchLat = lat;
      this.lastFetchLng = lng;
    } catch {
      // Public Overpass API failure handled silently per spec
      this.statusMessage = 'No verified crossing data for this area.';
    } finally {
      this.isFetching = false;
    }

    return this.cachedCrossings;
  }

  public getCached(): MappedCrossing[] {
    return this.cachedCrossings;
  }
}

export const globalCrossingService = new CrossingService();
