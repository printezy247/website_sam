import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export const cn = (...i: ClassValue[]) => twMerge(clsx(i));
export const fmtPct = (v: number) => `${(v * 100).toFixed(0)}%`;
export const fmtR = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}R`;
