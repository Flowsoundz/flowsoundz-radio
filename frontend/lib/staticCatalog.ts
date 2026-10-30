import type { Song } from "@/lib/types";

export const STATIC_CATALOG: Song[] = [];

export function getStaticCatalog(vibe?: string): Song[] {
  void vibe;
  return STATIC_CATALOG;
}
