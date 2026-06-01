/**
 * Utility: Merges class names using clsx and tailwind-merge.
 *
 * clsx handles conditional class logic (arrays, objects with boolean keys,
 * etc.) and produces a flat string of class names.
 *
 * tailwind-merge then resolves conflicting Tailwind CSS utility classes so
 * that the last one in the list wins. For example:
 *   cn("px-4", "px-6") → "px-6"  (px-4 is overridden by px-6)
 *
 * This prevents the common bug where CSS specificity causes unexpected
 * styling conflicts when combining Tailwind classes.
 *
 * @example
 *   cn("text-red-500", isActive && "text-blue-500")
 *   // → "text-blue-500" if isActive is true, "text-red-500" otherwise
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
