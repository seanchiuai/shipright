"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Rocket } from "lucide-react";

export function Header() {
  const { scrollY } = useScroll();
  const backgroundColor = useTransform(
    scrollY,
    [0, 50],
    ["rgba(18, 18, 28, 0)", "rgba(18, 18, 28, 0.95)"]
  );
  const borderOpacity = useTransform(scrollY, [0, 50], [0, 1]);

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm"
      style={{ backgroundColor }}
    >
      <motion.div
        className="absolute inset-x-0 bottom-0 h-px bg-border"
        style={{ opacity: borderOpacity }}
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <motion.div
          className="flex items-center gap-2 font-bold text-xl tracking-tight"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Rocket className="w-5 h-5 text-primary" />
          Shipright
        </motion.div>
        <motion.nav
          className="hidden md:flex items-center gap-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <a
            href="#how-it-works"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            How it works
          </a>
          <a
            href="#pricing"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Pricing
          </a>
          <a
            href="#faq"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            FAQ
          </a>
        </motion.nav>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <SignInButton mode="modal">
            <Button
              variant="outline"
              size="sm"
              className="hover:scale-[1.02] transition-transform border-border/50 bg-card/30"
            >
              Sign in
            </Button>
          </SignInButton>
        </motion.div>
      </div>
    </motion.header>
  );
}
