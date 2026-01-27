"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Header,
  HeroSection,
  HowItWorks,
  ValueProp,
  WhatYouGet,
  SocialProof,
  PricingSection,
  FAQSection,
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
        <HowItWorks />
        <ValueProp />
        <WhatYouGet />
        <SocialProof />
        <PricingSection />
        <FAQSection />
      </main>
      <Footer />
    </GradientBackground>
  );
}
