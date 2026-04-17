import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for composing Tailwind class names safely.
 * Merges clsx conditionals + tailwind-merge deduplication.
 *
 * Usage: cn('px-4 py-2', isActive && 'bg-amber-600', className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
