"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Header,
  HeroSection,
  DemoSection,
  WhatYouGet,
  HowItWorks,
  Comparison,
  SocialProof,
  BuildingInPublic,
  PricingSection,
  FAQSection,
  FinalCTA,
  Footer,
  GradientBackground,
} from "@/components/landing";

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isSignedIn) {
      router.push("/dashboard");
    }
  }, [isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <GradientBackground className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <DemoSection />
        <WhatYouGet />
        <HowItWorks />
        <Comparison />
        <SocialProof />
        <BuildingInPublic />
        <PricingSection />
        <FAQSection />
        <FinalCTA />
      </main>
      <Footer />
    </GradientBackground>
  );
}
