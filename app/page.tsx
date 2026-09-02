"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, PLACES, ROUTES, getCategory, getPlace, type Category, type Place } from "@/lib/places";
import { project, PROJECTION } from "@/lib/geo";
import { WALK_NODES, WALK_EDGES } from "@/lib/walk-graph";
import { findRoutes } from "@/lib/walk-routing";
import { bestScore } from "@/lib/search";
import BrandLockup from "@/components/BrandLockup";
import MapCanvas from "@/components/MapCanvas";
import CategoryPanel from "@/components/CategoryPanel";
import SearchBar from "@/components/SearchBar";
import PlacePopup from "@/components/PlacePopup";
import RouteLegend from "@/components/RouteLegend";
import RoutePicker from "@/components/RoutePicker";
import ItineraryTimeline from "@/components/ItineraryTimeline";
import VirtualTourCard from "@/components/VirtualTourCard";
import SiteFooter from "@/components/SiteFooter";

const UNITS_PER_METRE = PROJECTION.sy / 111_320;

export default function Home() {
  const [activeCategories, setActiveCategories] = useState<Set<Category>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [closingPlaceId, setClosingPlaceId] = useState<string | null>(null);
  const [walkFromId, setWalkFromId] = useState(PLACES[0].id);
  const [walkToId, setWalkToId] = useState(PLACES[1].id);

  const activeRoute = ROUTES.find((r) => r.id === selectedRouteId) ?? null;
  const selectedPlace = selectedPlaceId ? (getPlace(selectedPlaceId) ?? null) : null;

  // Ad-hoc A→B walking directions, recomputed whenever either endpoint changes. null (not []) means
  // "not on the walkable network" — RoutePicker tells the visitor that honestly instead of showing
  // nothing with no explanation.
  const walkRoutes = useMemo(() => {
    if (walkFromId === walkToId) return null;
    const from = getPlace(walkFromId);
    const to = getPlace(walkToId);
    if (!from || !to) return null;
    const a = project(from.lat, from.lng);
    const b = project(to.lat, to.lng);
    const routes = findRoutes([a.x, a.y], [b.x, b.y], WALK_NODES, WALK_EDGES, UNITS_PER_METRE);
    return routes.length ? routes : null;
  }, [walkFromId, walkToId]);

  const visiblePlaces = useMemo(() => {
    const query = searchQuery.trim();
    const scored = PLACES.map((p) => {
      const matchesCategory = activeCategories.size === 0 || activeCategories.has(p.category);
      if (!matchesCategory) return null;
      if (!query) return { place: p, score: 0 };
      // Category labels are searchable because they are the words a visitor actually types. The panel
      // beside this box prints "ร้านกาแฟ"; typing it and getting nothing back reads as a broken search,
      // not as a hint to go and click the chip instead. Fuzzy so a missing tone mark or a typo still
      // finds the place — see lib/search.ts for why an exact match always outranks a near one.
      const category = getCategory(p.category);
      const score = bestScore(query, [p.name, p.nameEn, category.label, category.labelEn]);
      return score === null ? null : { place: p, score };
    }).filter((x): x is { place: Place; score: number } => x !== null);
    // Ranked so the closest match leads — meaningless when nothing is typed (every score is 0), but a
    // fuzzy search without ranking would surface a three-typo near-miss ahead of the exact place someone
    // actually meant, in whatever order PLACES happens to list them.
    scored.sort((a, b) => b.score - a.score);
    return scored.map((x) => x.place);
  }, [activeCategories, searchQuery]);

  function toggleCategory(id: Category) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function showAllCategories() {
    setActiveCategories(new Set(CATEGORIES.map((c) => c.id)));
  }

  function closePopup() {
    if (!selectedPlaceId) return;
    const closing = selectedPlaceId;
    setClosingPlaceId(closing);
    setTimeout(() => {
      setSelectedPlaceId((current) => (current === closing ? null : current));
      setClosingPlaceId((current) => (current === closing ? null : current));
    }, 120);
  }

  // Choosing a stop from the itinerary should also open it on the map.
  function selectPlace(id: string) {
    setClosingPlaceId(null);
    setSelectedPlaceId(id);
  }

  // "Show me the island" is the resting state. Pins appear once the visitor asks for something —
  // a category, a search, or a route — so an unfiltered map is a map, not nineteen markers.
  //
  // A route does NOT count as a category filter here: with a route open you can still switch a
  // category on and see those places alongside the numbered stops, without clearing the route first.
  const narrowedByFilter = activeCategories.size > 0 || searchQuery.trim().length > 0;
  const hasSelection = narrowedByFilter || activeRoute !== null;
  const pinnedPlaces = narrowedByFilter ? visiblePlaces : [];

  return (
    <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[1400px] flex-col px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
      <header className="mb-4 lg:mb-5">
        <BrandLockup />
      </header>

      <main className="app-grid">
        {/* Filters come first in source: on a phone you narrow the map before you read it. */}
        <div className="region-filters flex min-w-0 flex-col gap-4 lg:gap-6">
          <SearchBar value={searchQuery} onChange={setSearchQuery} resultCount={visiblePlaces.length} />
          <CategoryPanel
            active={activeCategories}
            onToggle={toggleCategory}
            onClear={() => setActiveCategories(new Set())}
            onShowAll={showAllCategories}
          />
        </div>

        <div className="region-main min-w-0">
          <div className="relative">
            <MapCanvas
              visiblePlaces={pinnedPlaces}
              activeRoute={activeRoute}
              selectedPlaceId={selectedPlaceId}
              onSelectPlace={selectPlace}
              hasSelection={hasSelection}
              walkRoutes={activeRoute ? null : walkRoutes}
            />
            {selectedPlace && (
              <PlacePopup
                place={selectedPlace}
                closing={closingPlaceId === selectedPlace.id}
                onClose={closePopup}
                onSelectPlace={selectPlace}
              />
            )}
          </div>

          {/* Sits directly under the map: picking a route is the next thing you do after looking at it. */}
          <div className="mt-4 border-t border-[var(--color-hairline)] pt-3.5">
            <RouteLegend activeRouteId={selectedRouteId} onSelect={setSelectedRouteId} />
          </div>

          <div className="mt-3">
            <RoutePicker
              fromId={walkFromId}
              toId={walkToId}
              onChangeFrom={setWalkFromId}
              onChangeTo={setWalkToId}
              routes={walkRoutes}
            />
          </div>

          <ItineraryTimeline route={activeRoute} onSelectPlace={selectPlace} />
        </div>

        {/* Planning-at-home affordance, so it sits last on a phone and under the filters on desktop. */}
        <div className="region-extra min-w-0">
          <VirtualTourCard />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
