"use client";

import { useEffect, useRef } from "react";
import type {
  Circle,
  CircleMarker,
  LayerGroup,
  Map as LeafletMap,
  Marker,
  Polyline,
} from "leaflet";
import { SectionCard } from "@/components/SectionCard";
import { IssApiResponse, SatellitePositionApiResponse } from "@/lib/types";

type SpaceMapProps = {
  iss: IssApiResponse | null;
  issTrail: Array<[number, number]>;
  trackedSatellite: SatellitePositionApiResponse | null;
  isLoading: boolean;
  error: string | null;
};

function splitWorldSafePath(points: Array<[number, number]>) {
  return points.reduce<Array<Array<[number, number]>>>((segments, point) => {
    const currentSegment = segments[segments.length - 1];

    if (!currentSegment || currentSegment.length === 0) {
      segments.push([point]);
      return segments;
    }

    const previousPoint = currentSegment[currentSegment.length - 1];
    const longitudeJump = Math.abs(point[1] - previousPoint[1]);

    if (longitudeJump > 180) {
      segments.push([point]);
      return segments;
    }

    currentSegment.push(point);
    return segments;
  }, []);
}

export function SpaceMap({
  iss,
  issTrail,
  trackedSatellite,
  isLoading,
  error,
}: SpaceMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const glowRef = useRef<CircleMarker | null>(null);
  const haloRef = useRef<Circle | null>(null);
  const issTrailRef = useRef<Polyline | null>(null);
  const satelliteLayerRef = useRef<LayerGroup | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function setupMap() {
      if (!containerRef.current || mapRef.current) {
        return;
      }

      const L = await import("leaflet");

      if (cancelled || !containerRef.current) {
        return;
      }

      const map = L.map(containerRef.current, {
        center: [18, 0],
        zoom: 2,
        minZoom: 2,
        maxZoom: 6,
        zoomControl: false,
        worldCopyJump: true,
      });

      L.control.zoom({ position: "bottomright" }).addTo(map);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
      }).addTo(map);

      const issIcon = L.divIcon({
        className: "iss-pulse-marker",
        html: '<span class="iss-pulse-marker__ring"></span><span class="iss-pulse-marker__core"></span>',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      const marker = L.marker([0, 0], {
        icon: issIcon,
        keyboard: false,
        zIndexOffset: 1200,
      }).addTo(map);

      const glow = L.circleMarker([0, 0], {
        radius: 13,
        color: "rgba(125, 211, 252, 0.28)",
        weight: 1,
        fillColor: "#22d3ee",
        fillOpacity: 0.12,
      }).addTo(map);

      const halo = L.circle([0, 0], {
        radius: 900000,
        color: "rgba(125, 211, 252, 0.28)",
        opacity: 0.32,
        fillColor: "#06b6d4",
        fillOpacity: 0.05,
      }).addTo(map);

      const issTrail = L.polyline([], {
        color: "#7dd3fc",
        weight: 2.2,
        opacity: 0.78,
        dashArray: "8 12",
      }).addTo(map);

      const satelliteLayer = L.layerGroup().addTo(map);

      markerRef.current = marker;
      glowRef.current = glow;
      haloRef.current = halo;
      issTrailRef.current = issTrail;
      satelliteLayerRef.current = satelliteLayer;
      mapRef.current = map;
    }

    void setupMap();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      glowRef.current = null;
      haloRef.current = null;
      issTrailRef.current = null;
      satelliteLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (
      !iss ||
      !mapRef.current ||
      !markerRef.current ||
      !glowRef.current ||
      !haloRef.current
    ) {
      return;
    }

    const nextLatLng: [number, number] = [iss.latitude, iss.longitude];
    markerRef.current.setLatLng(nextLatLng);
    glowRef.current.setLatLng(nextLatLng);
    haloRef.current.setLatLng(nextLatLng);
    mapRef.current.flyTo(nextLatLng, mapRef.current.getZoom(), {
      animate: true,
      duration: 1.4,
    });
  }, [iss]);

  useEffect(() => {
    if (!issTrailRef.current) {
      return;
    }

    issTrailRef.current.setLatLngs(splitWorldSafePath(issTrail));
  }, [issTrail]);

  useEffect(() => {
    async function renderSatelliteTrack() {
      if (!mapRef.current || !satelliteLayerRef.current) {
        return;
      }

      satelliteLayerRef.current.clearLayers();

      if (!trackedSatellite || trackedSatellite.positions.length === 0) {
        return;
      }

      const L = await import("leaflet");

      const coordinates = trackedSatellite.positions.map(
        (position) =>
          [position.satlatitude, position.satlongitude] as [number, number],
      );

      splitWorldSafePath(coordinates).forEach((segment, index) => {
        L.polyline(segment, {
          color: "#a78bfa",
          weight: 2.5,
          opacity: 0.92,
        }).addTo(satelliteLayerRef.current!);

        if (index === 0 && segment[0]) {
          L.circleMarker(segment[0], {
            radius: 6,
            color: "#d8b4fe",
            weight: 2,
            fillColor: "#8b5cf6",
            fillOpacity: 1,
          })
            .bindTooltip(trackedSatellite.info.satname, {
              direction: "top",
            })
            .addTo(satelliteLayerRef.current!);
        }
      });
    }

    void renderSatelliteTrack();
  }, [trackedSatellite]);

  return (
    <SectionCard
      title="Orbital Map"
      eyebrow="Ground Track"
      description="Live ISS position, recent orbit trail, and optional tracked satellite path in a dark mission-control surface."
      className="ui-card-hero h-full xl:col-span-1"
      isLoading={isLoading}
      loadingLabel="Tracking"
    >
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/70">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.14),_transparent_22%),linear-gradient(180deg,_rgba(255,255,255,0.02),_transparent_22%)]" />
        <div
          className="h-[430px] w-full bg-slate-950 sm:h-[520px] lg:h-[660px]"
          ref={containerRef}
        />
        {isLoading && !iss ? (
          <div className="absolute inset-0 grid place-items-center bg-slate-950/72 text-sm text-slate-200 backdrop-blur-sm">
            Locking on to the station...
          </div>
        ) : null}
        {error ? (
          <div className="absolute inset-x-4 top-4 rounded-[20px] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100 backdrop-blur-md">
            {error}
          </div>
        ) : null}
        <div className="pointer-events-none absolute left-4 top-4 rounded-[22px] border border-white/10 bg-slate-950/76 px-4 py-3 text-xs text-slate-200 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <span className="ui-live-dot" />
            <span className="uppercase tracking-[0.24em] text-cyan-100/90">
              ISS live track
            </span>
          </div>
          {iss ? (
            <div className="mt-3 space-y-1">
              <p className="text-sm font-medium text-white">
                {iss.latitude.toFixed(2)}° / {iss.longitude.toFixed(2)}°
              </p>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                Current ground position
              </p>
            </div>
          ) : null}
        </div>

        <div className="pointer-events-none absolute bottom-4 left-4 right-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="rounded-[24px] border border-white/10 bg-slate-950/80 px-4 py-3 text-xs text-slate-200 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <span className="h-0.5 w-6 rounded-full bg-cyan-300/80" />
              <span>{issTrail.length} recent ISS samples</span>
            </div>
            {trackedSatellite ? (
              <div className="mt-2 flex items-center gap-2">
                <span className="h-0.5 w-6 rounded-full bg-violet-300/90" />
                <span>{trackedSatellite.info.satname}</span>
              </div>
            ) : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-[20px] border border-white/10 bg-slate-950/76 px-4 py-3 text-xs backdrop-blur-xl">
              <p className="ui-label">Map Style</p>
              <p className="mt-2 text-sm font-medium text-white">Dark Earth</p>
            </div>
            <div className="rounded-[20px] border border-white/10 bg-slate-950/76 px-4 py-3 text-xs backdrop-blur-xl">
              <p className="ui-label">Orbit Trail</p>
              <p className="mt-2 text-sm font-medium text-white">Recent path memory</p>
            </div>
            <div className="rounded-[20px] border border-white/10 bg-slate-950/76 px-4 py-3 text-xs backdrop-blur-xl">
              <p className="ui-label">Overlay Mode</p>
              <p className="mt-2 text-sm font-medium text-white">
                {trackedSatellite ? "Dual-track view" : "ISS focused"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
