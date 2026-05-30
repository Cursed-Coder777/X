/**
 * Utility: Merges class names using clsx and tailwind-merge.
 * clsx handles conditional class logic, then tailwind-merge resolves
 * conflicting Tailwind utilities so the last one wins.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}