"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export function Header() {
  const { scrollY } = useScroll();
  const backgroundColor = useTransform(
    scrollY,
    [0, 50],
    ["rgba(250, 249, 247, 0)", "rgba(250, 249, 247, 0.8)"]
  );
  const borderOpacity = useTransform(scrollY, [0, 50], [0, 1]);

  return (
    <motion.header
      className="sticky top-0 z-50 backdrop-blur-sm"
      style={{ backgroundColor }}
    >
      <motion.div
        className="absolute inset-x-0 bottom-0 h-px bg-border"
        style={{ opacity: borderOpacity }}
      />
      <div className="max-w-[1140px] mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <motion.a
          href="#"
          className="flex items-center gap-2 font-bold text-xl text-foreground no-underline"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Image
            src="/logo.png"
            alt="ShipRight"
            width={32}
            height={32}
            className="w-8 h-8"
          />
          ShipRight
        </motion.a>

        {/* Navigation */}
        <motion.nav
          className="hidden md:flex items-center gap-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <a
            href="#features"
            className="text-[0.9375rem] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Benefits
          </a>
          <a
            href="#how-it-works"
            className="text-[0.9375rem] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            How it works
          </a>
          <a
            href="#pricing"
            className="text-[0.9375rem] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Pricing
          </a>
          <a
            href="#faq"
            className="text-[0.9375rem] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            FAQ
          </a>
        </motion.nav>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <SignInButton mode="modal">
            <Button className="glow-button rounded-full px-6 font-semibold">
              Start Building
            </Button>
          </SignInButton>
        </motion.div>
      </div>
    </motion.header>
  );
}
