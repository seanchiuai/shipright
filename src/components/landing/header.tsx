"use client";

import { useState, useEffect, useRef } from "react";
import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    const onScroll = () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 20);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 flex justify-center px-4 pt-3 pointer-events-none">
      <div
        className={`pointer-events-auto flex items-center justify-between transition-all duration-500 ease-in-out ${
          scrolled
            ? "max-w-2xl px-6 h-14 bg-background/90 border border-border shadow-lg shadow-black/30 rounded-full"
            : "max-w-3xl px-6 h-14 bg-transparent rounded-2xl"
        }`}
        style={{ width: "100%" }}
      >
        <a
          href="#"
          className="flex items-center gap-2 font-semibold tracking-tight text-foreground"
        >
          <Image
            src="/logo.png"
            alt="ShipRight"
            width={32}
            height={32}
            className="w-8 h-8 rounded"
          />
          <span className="text-lg">ShipRight</span>
        </a>

        <SignInButton mode="modal">
          <Button
            variant="default"
            className="rounded-full font-medium px-5 text-sm h-9 bg-foreground text-background hover:bg-foreground/90 transition-all duration-300"
          >
            Get started
          </Button>
        </SignInButton>
      </div>
    </header>
  );
}
