import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Partial<T> whose keys may also be explicitly `undefined`.
 * Needed because the project uses `exactOptionalPropertyTypes`.
 */
export type Patch<T> = { [K in keyof T]?: T[K] | undefined };

/**
 * Shallow-merge a Patch into a base object. Keys explicitly set to `undefined`
 * are ignored, so they never overwrite required values.
 */
export function applyPatch<T extends object>(base: T, patch: Patch<T>): T {
  const out: T = { ...base };
  for (const key of Object.keys(patch) as (keyof T)[]) {
    const value = patch[key];
    if (value !== undefined) out[key] = value as T[keyof T];
  }
  return out;
}
