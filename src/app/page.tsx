"use client";

import { useState } from "react";
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
import { BetaModal } from "@/components/landing/beta-modal";

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalIdea, setModalIdea] = useState("");

  useEffect(() => {
    if (isSignedIn) {
      router.push("/dashboard");
    }
  }, [isSignedIn, router]);

  const handleOpenModal = (idea: string) => {
    setModalIdea(idea);
    setIsModalOpen(true);
  };

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
        <HeroSection onOpenModal={handleOpenModal} />
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
      <BetaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialIdea={modalIdea}
      />
    </GradientBackground>
  );
}
