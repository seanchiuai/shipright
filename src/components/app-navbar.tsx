"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AppNavbar({
  title,
}: {
  title?: string;
} = {}) {
  const router = useRouter();
  const { user } = useUser();

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user?.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase() || "?";

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-background/70 border-b border-border/50">
      <div
        className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between"
      >
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Image
            src="/logo.png"
            alt="ShipRight"
            width={32}
            height={32}
            className="w-8 h-8"
          />
          <span className="font-serif text-xl font-medium">ShipRight</span>
        </button>

        {title && (
          <span className="hidden sm:block text-sm text-muted-foreground truncate max-w-[200px]">
            {title}
          </span>
        )}

        <Link href="/profile">
          <Avatar className="ring-2 ring-border hover:ring-primary/50 transition-all cursor-pointer">
            <AvatarImage src={user?.imageUrl} alt={user?.fullName || "Avatar"} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  );
}
