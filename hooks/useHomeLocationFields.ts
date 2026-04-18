"use client";

import { useEffect, useRef, useState } from "react";
import { useOrbitPreferences } from "@/components/providers/OrbitPreferencesProvider";

type HomeLocationFieldOptions = {
  fallbackLatitude: string;
  fallbackLongitude: string;
};

export function useHomeLocationFields(options: HomeLocationFieldOptions) {
  const { preferences, hydrated } = useOrbitPreferences();
  const [latitude, setLatitude] = useState(options.fallbackLatitude);
  const [longitude, setLongitude] = useState(options.fallbackLongitude);
  const hasAppliedInitialStateRef = useRef(false);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (preferences.homeLocation) {
      setLatitude(preferences.homeLocation.latitude.toString());
      setLongitude(preferences.homeLocation.longitude.toString());
      hasAppliedInitialStateRef.current = true;
      return;
    }

    if (!hasAppliedInitialStateRef.current) {
      setLatitude(options.fallbackLatitude);
      setLongitude(options.fallbackLongitude);
      hasAppliedInitialStateRef.current = true;
    }
  }, [
    hydrated,
    options.fallbackLatitude,
    options.fallbackLongitude,
    preferences.homeLocation?.latitude,
    preferences.homeLocation?.longitude,
  ]);

  function applyHomeLocation() {
    if (!preferences.homeLocation) {
      return;
    }

    setLatitude(preferences.homeLocation.latitude.toString());
    setLongitude(preferences.homeLocation.longitude.toString());
  }

  return {
    latitude,
    longitude,
    setLatitude,
    setLongitude,
    homeLocation: preferences.homeLocation,
    hasHomeLocation: Boolean(preferences.homeLocation),
    applyHomeLocation,
  };
}
