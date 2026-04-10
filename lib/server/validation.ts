import { badRequest } from "@/lib/server/api";

export function parseRequiredNumber(
  value: string | null,
  label: string,
  options?: {
    min?: number;
    max?: number;
    integer?: boolean;
  },
) {
  if (value === null || value.trim() === "") {
    throw badRequest(`${label} is required.`);
  }

  return validateNumber(value, label, options);
}

export function parseOptionalNumber(
  value: string | null,
  fallback: number,
  label: string,
  options?: {
    min?: number;
    max?: number;
    integer?: boolean;
  },
) {
  if (value === null || value.trim() === "") {
    return fallback;
  }

  return validateNumber(value, label, options);
}

export function parseLatitude(value: string | null, label = "lat") {
  return parseRequiredNumber(value, label, { min: -90, max: 90 });
}

export function parseLongitude(value: string | null, label = "lon") {
  return parseRequiredNumber(value, label, { min: -180, max: 180 });
}

export function parseRequiredText(
  value: string | null | undefined,
  label: string,
  options?: {
    minLength?: number;
    maxLength?: number;
  },
) {
  if (value === null || value === undefined || value.trim() === "") {
    throw badRequest(`${label} is required.`);
  }

  const normalized = value.trim();

  if (options?.minLength !== undefined && normalized.length < options.minLength) {
    throw badRequest(`${label} must be at least ${options.minLength} characters.`, {
      parameter: label,
      receivedLength: normalized.length,
    });
  }

  if (options?.maxLength !== undefined && normalized.length > options.maxLength) {
    throw badRequest(`${label} must be at most ${options.maxLength} characters.`, {
      parameter: label,
      receivedLength: normalized.length,
    });
  }

  return normalized;
}

function validateNumber(
  rawValue: string,
  label: string,
  options?: {
    min?: number;
    max?: number;
    integer?: boolean;
  },
) {
  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed)) {
    throw badRequest(`${label} must be a valid number.`, {
      parameter: label,
      received: rawValue,
    });
  }

  if (options?.integer && !Number.isInteger(parsed)) {
    throw badRequest(`${label} must be a whole number.`, {
      parameter: label,
      received: rawValue,
    });
  }

  if (options?.min !== undefined && parsed < options.min) {
    throw badRequest(`${label} must be at least ${options.min}.`, {
      parameter: label,
      received: parsed,
    });
  }

  if (options?.max !== undefined && parsed > options.max) {
    throw badRequest(`${label} must be at most ${options.max}.`, {
      parameter: label,
      received: parsed,
    });
  }

  return parsed;
}
