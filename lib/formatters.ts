const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  timeStyle: "short",
});

const relativeFormatter = new Intl.RelativeTimeFormat("en-US", {
  numeric: "auto",
});

export function formatCoordinate(value: number, positiveLabel: string, negativeLabel: string) {
  const label = value >= 0 ? positiveLabel : negativeLabel;
  return `${Math.abs(value).toFixed(2)}° ${label}`;
}

export function formatDateTime(value: string | number) {
  const date = typeof value === "number" ? new Date(value * 1000) : new Date(value);
  return dateTimeFormatter.format(date);
}

export function formatClockTime(value: number) {
  return timeFormatter.format(new Date(value * 1000));
}

export function formatRelativeFuture(value: string) {
  const diffMs = new Date(value).getTime() - Date.now();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  if (Math.abs(diffHours) < 24) {
    return relativeFormatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  return relativeFormatter.format(diffDays, "day");
}

export function formatRelativeTime(value: string | number) {
  const timestamp = typeof value === "number" ? value * 1000 : new Date(value).getTime();
  const diffMs = timestamp - Date.now();
  const absMinutes = Math.round(Math.abs(diffMs) / (1000 * 60));

  if (absMinutes < 60) {
    return relativeFormatter.format(Math.round(diffMs / (1000 * 60)), "minute");
  }

  const absHours = Math.round(absMinutes / 60);

  if (absHours < 48) {
    return relativeFormatter.format(Math.round(diffMs / (1000 * 60 * 60)), "hour");
  }

  return relativeFormatter.format(
    Math.round(diffMs / (1000 * 60 * 60 * 24)),
    "day",
  );
}

export function formatDistanceKm(valueInMeters: number) {
  return `${(valueInMeters / 1000).toFixed(1)} km`;
}

export function formatTemperature(value: number) {
  return `${Math.round(value)}°C`;
}

export function formatWindSpeed(value: number) {
  return `${value.toFixed(1)} m/s`;
}
