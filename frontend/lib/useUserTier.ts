"use client";

import { useSession } from "next-auth/react";
import type { UserTier } from "@/lib/types";

function mapTier(raw: string | undefined | null): UserTier {
  if (raw === "INSIDER") return "insider";
  if (raw === "VAULT") return "vault";
  return "listener";
}

export function useUserTier(): { tier: UserTier; isLoading: boolean } {
  const { data: session, status } = useSession();
  const tier = mapTier((session?.user as { tier?: string } | undefined)?.tier);
  return { tier, isLoading: status === "loading" };
}
