import React, { useEffect, useRef, useState } from "react";
import type L from "leaflet";
import { Eye, MapPin, Navigation, Phone, Plus, X } from "lucide-react";
import type { Merchant, StoreLocation } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface MultiStoreMapViewProps {
  stores: StoreLocation[];
  selectedStoreIds: Set<string>;
  onToggleStore: (storeId: string) => void;
  onSelectAll?: () => void;
  merchants: Merchant[];
  className?: string;
}

export function MultiStoreMapView({
  stores,
  selectedStoreIds,
  onToggleStore,
  onSelectAll,
  merchants,
  className = "w-full h-full min-h-[560px] rounded-lg border overflow-hidden relative",
}: MultiStoreMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const LRef = useRef<typeof import("leaflet") | null>(null);

  // Stores that are both selected and have valid coordinates
  const activeStores = stores.filter(
    (s) =>
      selectedStoreIds.has(s.id) &&
      s.latitude !== undefined &&
      s.longitude !== undefined &&
      s.latitude !== null &&
      s.longitude !== null &&
      !isNaN(s.latitude) &&
      !isNaN(s.longitude)
  );

  // Initialize Leaflet map client-side
  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;
    let isCancelled = false;

    async function initLeaflet() {
      const leafletModule = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      const L = (leafletModule.default || leafletModule) as typeof import("leaflet");

      if (isCancelled || !containerRef.current) return;
      LRef.current = L;

      // Default Leaflet icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!mapRef.current) {
        // Initial center (Greater Toronto Area / Markham)
        const defaultLat = activeStores[0]?.latitude || 43.8561;
        const defaultLng = activeStores[0]?.longitude || -79.337;

        const map = L.map(containerRef.current, {
          zoomControl: true,
          scrollWheelZoom: true,
        }).setView([defaultLat, defaultLng], 12);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        mapRef.current = map;
        setLeafletLoaded(true);
      }
    }

    initLeaflet();

    return () => {
      isCancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current.clear();
      }
    };
  }, []);

  // Synchronize multiple pins with selectedStoreIds
  useEffect(() => {
    const map = mapRef.current;
    const L = LRef.current;
    if (!map || !L || !leafletLoaded) return;

    const currentMarkers = markersRef.current;
    const activeIds = new Set(activeStores.map((s) => s.id));

    // Remove markers that are no longer selected
    currentMarkers.forEach((marker, storeId) => {
      if (!activeIds.has(storeId)) {
        marker.remove();
        currentMarkers.delete(storeId);
      }
    });

    const latLngs: L.LatLngExpression[] = [];

    // Add or update markers for selected stores
    activeStores.forEach((store) => {
      const lat = store.latitude!;
      const lng = store.longitude!;
      latLngs.push([lat, lng]);

      if (currentMarkers.has(store.id)) {
        // Already on map
        return;
      }

      const merch = merchants.find((m) => m.id === store.merchantId) || store.merchant;
      const bg = merch?.logoBg || "#075E50";
      const color = merch?.logoColor || "#FFFFFF";
      const initial = merch?.initial || store.name.charAt(0);

      // Custom high-visibility brand pin HTML
      const pinIcon = L.divIcon({
        className: "custom-store-pin",
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translate(-50%, -100%);">
            <div style="display: flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 9999px; background-color: ${bg}; color: ${color}; box-shadow: 0 4px 14px rgba(0,0,0,0.28); border: 2px solid #FFFFFF; white-space: nowrap; font-family: system-ui, sans-serif;">
              <span style="font-weight: 800; font-size: 11px; line-height: 1;">${initial}</span>
              <span style="font-size: 11px; font-weight: 600; max-width: 120px; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">${store.name}</span>
            </div>
            <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 7px solid #FFFFFF; margin-top: -1px; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));"></div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
        popupAnchor: [0, -28],
      });

      const marker = L.marker([lat, lng], { icon: pinIcon }).addTo(map);

      // Popup content with unselect button
      const popupHtml = document.createElement("div");
      popupHtml.className = "p-1 space-y-2 text-xs font-sans";
      popupHtml.innerHTML = `
        <div style="font-family: system-ui, sans-serif; min-width: 200px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
            <strong style="font-size: 13px; color: #0f172a;">${store.name}</strong>
            <span style="background: #f1f5f9; color: #475569; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">${merch?.name || "Store"}</span>
          </div>
          <p style="color: #64748b; font-size: 11px; margin: 2px 0;">${store.address}, ${store.city}</p>
          ${store.phone ? `<p style="color: #075E50; font-size: 11px; margin: 2px 0;">📞 ${store.phone}</p>` : ""}
          <p style="color: #94a3b8; font-family: monospace; font-size: 10px; margin: 2px 0;">GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
          <div style="display: flex; gap: 6px; margin-top: 10px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
            <button id="unselect-btn-${store.id}" style="flex: 1; background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; border-radius: 6px; font-size: 11px; font-weight: 600; padding: 4px 8px; cursor: pointer;">
              ✕ Unselect Pin
            </button>
            <a href="/preview?storeId=${store.id}" style="display: inline-flex; align-items: center; gap: 3px; background: #075E50; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 11px; font-weight: 600; padding: 4px 8px;">
              Preview ↗
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on("popupopen", () => {
        const btn = document.getElementById(`unselect-btn-${store.id}`);
        if (btn) {
          btn.onclick = () => {
            marker.closePopup();
            onToggleStore(store.id);
          };
        }
      });

      currentMarkers.set(store.id, marker);
    });

    // Auto fit bounds when markers change
    if (latLngs.length > 1) {
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
    } else if (latLngs.length === 1) {
      map.setView(latLngs[0], 13, { animate: true });
    }
  }, [activeStores, merchants, leafletLoaded, onToggleStore]);

  return (
    <div className={className}>
      <div ref={containerRef} className="w-full h-full min-h-[560px]" />

      {/* Floating Pin Count Badge */}
      <div className="absolute top-3 right-3 z-[400] flex items-center gap-2 bg-background/95 backdrop-blur-md px-3 py-1.5 rounded-lg border shadow-md text-xs font-medium">
        <MapPin className="h-3.5 w-3.5 text-primary" />
        <span>
          <strong>{activeStores.length}</strong> pin{activeStores.length === 1 ? "" : "s"} visible
        </span>
        {activeStores.length < stores.length && onSelectAll && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onSelectAll}
            className="h-6 px-2 text-[10px] text-primary hover:bg-primary/10 ml-1 font-semibold"
          >
            Show All ({stores.length})
          </Button>
        )}
      </div>

      {/* Empty State Overlay if 0 pins are selected */}
      {activeStores.length === 0 && (
        <div className="absolute inset-0 z-[400] bg-background/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <MapPin className="h-6 w-6 text-muted-foreground" />
          </div>
          <h4 className="font-semibold text-sm text-foreground">No Store Pins Selected</h4>
          <p className="text-xs text-muted-foreground max-w-xs mt-1">
            Click any store branch in the list to drop its pin on the map. You can select multiple stores to view their locations together.
          </p>
          {onSelectAll && (
            <Button
              size="sm"
              onClick={onSelectAll}
              className="mt-4 gap-1.5 text-xs bg-primary text-primary-foreground font-semibold"
            >
              <Plus className="h-3.5 w-3.5" /> Select All Stores
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
