import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type {
	WithoutChild,
	WithoutChildren,
	WithoutChildrenOrChild,
	WithElementRef,
} from "bits-ui"

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export type { WithoutChild, WithoutChildren, WithoutChildrenOrChild, WithElementRef }
