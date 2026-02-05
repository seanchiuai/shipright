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
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/90 backdrop-blur-md border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a
          href="#"
          className="flex items-center gap-2.5 font-semibold text-lg tracking-tight"
        >
          <Image
            src="/logo.png"
            alt="ShipRight"
            width={32}
            height={24}
            className="w-8 h-auto"
          />
          ShipRight
        </a>

        <nav className="hidden md:flex items-center gap-8">
          {[
            ["How it works", "#how-it-works"],
            ["Features", "#features"],
            ["Pricing", "#pricing"],
            ["FAQ", "#faq"],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {label}
            </a>
          ))}
        </nav>

        <SignInButton mode="modal">
          <Button
            variant="default"
            className="rounded-full px-5 text-sm font-medium h-9"
          >
            Get started
          </Button>
        </SignInButton>
      </div>
    </header>
  );
}
