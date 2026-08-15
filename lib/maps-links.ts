import type { Place, TourRoute } from "@/lib/places";
import { getPlace } from "@/lib/places";

/**
 * Google Maps deep links, built from the Maps URLs scheme. These need no API key, no billing account
 * and no script tag: they are plain https URLs that hand off to whatever map app the visitor already
 * has. On a phone that is usually the native Google Maps app, which is exactly what someone standing
 * on the island wants when they stop planning and start walking.
 *
 * Scheme reference: https://developers.google.com/maps/documentation/urls/get-started
 */

const BASE = "https://www.google.com/maps";

/** Drop a pin on the place's real coordinate. The name is passed too so the app can label it. */
export function placeLink(place: Place): string {
  const params = new URLSearchParams({
    api: "1",
    query: `${place.lat},${place.lng}`,
  });
  return `${BASE}/search/?${params}`;
}

/** Walking directions from wherever the visitor is now to this place. */
export function directionsLink(place: Place): string {
  const params = new URLSearchParams({
    api: "1",
    destination: `${place.lat},${place.lng}`,
    travelmode: "walking",
  });
  return `${BASE}/dir/?${params}`;
}

/**
 * Walking directions through a whole route. The Maps URLs scheme takes an origin, a destination and
 * up to nine intermediate waypoints — so a route with more stops than that is trimmed, and the caller
 * is told how many were dropped rather than being handed a silently shortened trip.
 */
export const MAX_WAYPOINTS = 9;

export function routeDirectionsLink(route: TourRoute): { url: string; usedStops: number; droppedStops: number } {
  const coords = route.stops
    .map((stop) => getPlace(stop.placeId))
    .filter((p): p is Place => Boolean(p))
    .map((p) => `${p.lat},${p.lng}`);

  // Collapse a stop that repeats back-to-back (the day trip returns to the pier it started from).
  const path = coords.filter((c, i) => i === 0 || c !== coords[i - 1]);

  const origin = path[0];
  const destination = path[path.length - 1];
  const middle = path.slice(1, -1);
  const waypoints = middle.slice(0, MAX_WAYPOINTS);

  const params = new URLSearchParams({
    api: "1",
    origin,
    destination,
    travelmode: "walking",
  });
  if (waypoints.length) params.set("waypoints", waypoints.join("|"));

  return {
    url: `${BASE}/dir/?${params}`,
    usedStops: waypoints.length + 2,
    droppedStops: middle.length - waypoints.length,
  };
}
