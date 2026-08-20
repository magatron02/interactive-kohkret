"use client";

import { useMemo, useState } from "react";
import { PLACES, ROUTES, getCategory, getPlace, type Category } from "@/lib/places";
import BrandLockup from "@/components/BrandLockup";
import MapCanvas from "@/components/MapCanvas";
import CategoryPanel from "@/components/CategoryPanel";
import SearchBar from "@/components/SearchBar";
import PlacePopup from "@/components/PlacePopup";
import RouteLegend from "@/components/RouteLegend";
import ItineraryTimeline from "@/components/ItineraryTimeline";
import VirtualTourCard from "@/components/VirtualTourCard";
import SiteFooter from "@/components/SiteFooter";

export default function Home() {
  const [activeCategories, setActiveCategories] = useState<Set<Category>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [closingPlaceId, setClosingPlaceId] = useState<string | null>(null);

  const activeRoute = ROUTES.find((r) => r.id === selectedRouteId) ?? null;
  const selectedPlace = selectedPlaceId ? (getPlace(selectedPlaceId) ?? null) : null;

  const visiblePlaces = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return PLACES.filter((p) => {
      const matchesCategory = activeCategories.size === 0 || activeCategories.has(p.category);
      // Category labels are searchable because they are the words a visitor actually types. The panel
      // beside this box prints "ร้านกาแฟ"; typing it and getting nothing back reads as a broken search,
      // not as a hint to go and click the chip instead.
      const category = getCategory(p.category);
      const matchesSearch =
        !query ||
        p.name.toLowerCase().includes(query) ||
        (p.nameEn?.toLowerCase().includes(query) ?? false) ||
        category.label.toLowerCase().includes(query) ||
        category.labelEn.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategories, searchQuery]);

  function toggleCategory(id: Category) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
