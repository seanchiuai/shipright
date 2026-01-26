"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";

export function useSyncUser() {
  const { user: clerkUser, isLoaded } = useUser();
  const syncUser = useMutation(api.users.syncFromClient);

  const convexUser = useQuery(
    api.users.current,
    isLoaded && clerkUser ? { clerkUserId: clerkUser.id } : "skip"
  );

  useEffect(() => {
    if (!isLoaded || !clerkUser) return;

    syncUser({
      clerkUserId: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress || "",
      name: clerkUser.fullName || undefined,
      image: clerkUser.imageUrl || undefined,
    });
  }, [isLoaded, clerkUser, syncUser]);

  if (!isLoaded) return undefined;
  if (!clerkUser) return null;

  return convexUser;
}
