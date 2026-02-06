"use client";

import { useState, useEffect, useRef } from "react";
import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [overDark, setOverDark] = useState(false);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    const onScroll = () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 20);
        const darkSection = document.getElementById("how-it-works");
        if (darkSection) {
          const rect = darkSection.getBoundingClientRect();
          setOverDark(rect.top < 80 && rect.bottom > 80);
        }
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
            ? overDark
              ? "max-w-2xl px-6 h-14 bg-[#0a0d16]/80 backdrop-blur-xl border border-white/[0.08] shadow-lg shadow-black/20 rounded-full"
              : "max-w-2xl px-6 h-14 bg-background/85 backdrop-blur-xl border border-border shadow-lg rounded-full"
            : "max-w-3xl px-6 h-14 bg-transparent rounded-2xl"
        }`}
        style={{ width: "100%" }}
      >
        <a
          href="#"
          className={`flex items-center gap-2 font-semibold tracking-tight transition-all duration-500 ${
            overDark ? "text-white" : ""
          }`}
        >
          <Image
            src="/logo.png"
            alt="ShipRight"
            width={32}
            height={24}
            className={`transition-all duration-500 w-8 h-auto ${
              overDark ? "brightness-200" : ""
            }`}
          />
          <span className="transition-all duration-500 text-lg">
            ShipRight
          </span>
        </a>

        <SignInButton mode="modal">
          <Button
            variant="default"
            className={`rounded-full font-medium transition-all duration-500 ${
              scrolled ? "px-5 text-sm h-9" : "px-5 text-sm h-9"
            } ${
              overDark
                ? "bg-white text-[#0a0d16] hover:bg-white/90"
                : ""
            }`}
          >
            Get started
          </Button>
        </SignInButton>
      </div>
    </header>
  );
}
