"use client";

import { useEffect, useState } from "react";
import { useOrbitPreferences } from "@/components/providers/OrbitPreferencesProvider";

type HomeLocationFieldOptions = {
  fallbackLatitude: string;
  fallbackLongitude: string;
};

export function useHomeLocationFields(options: HomeLocationFieldOptions) {
  const { preferences, hydrated } = useOrbitPreferences();
  const [latitude, setLatitude] = useState(options.fallbackLatitude);
  const [longitude, setLongitude] = useState(options.fallbackLongitude);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!hydrated || seeded) {
      return;
    }

    if (preferences.homeLocation) {
      setLatitude(preferences.homeLocation.latitude.toString());
      setLongitude(preferences.homeLocation.longitude.toString());
    }

    setSeeded(true);
  }, [hydrated, preferences.homeLocation, seeded]);

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
