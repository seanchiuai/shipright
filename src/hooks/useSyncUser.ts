"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";

export function useSyncUser() {
  const { user: clerkUser, isLoaded } = useUser();
  const syncUser = useMutation(api.users.syncUser);

  // JWT-verified query - no need to pass clerkUserId
  const convexUser = useQuery(api.users.current);

  useEffect(() => {
    if (!isLoaded || !clerkUser) return;
    // Sync user data (JWT provides identity server-side)
    syncUser();
  }, [isLoaded, clerkUser, syncUser]);

  if (!isLoaded) return undefined;
  if (!clerkUser) return null;

  return convexUser;
}
