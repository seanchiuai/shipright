"use client";

import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ArrowRight, Linkedin, Instagram } from "lucide-react";

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M18.901 1.153h3.68l-8.041 9.19 9.46 12.504h-7.406l-5.8-7.584-6.64 7.584H.476l8.602-9.83L0 1.153h7.594l5.243 6.932 6.064-6.932zm-1.29 19.493h2.04L6.486 3.24H4.298l13.313 17.406z"
      />
    </svg>
  );
}

export function FinalCTA() {
  return (
    <section className="py-16 md:py-20 bg-background relative overflow-hidden">
      {/* Dramatic glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, rgba(59,130,246,0.08) 0%, transparent 70%)" }}
      />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl leading-tight tracking-tight mb-4 text-foreground">
            Stop researching.
            <br />
            Start building.
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Your app idea + a few minutes = a GitHub repo ready for vibe coding.
          </p>

          <SignInButton mode="modal">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/80 rounded-lg text-base px-8 h-12 font-medium shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:shadow-[0_0_40px_rgba(59,130,246,0.4)] transition-all"
            >
              Start building free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </SignInButton>

          <p className="text-xs text-foreground/20 mt-4">
            No credit card required. Own your code forever.
          </p>
        </div>

        {/* Building in public */}
        <div className="mt-14 pt-8 border-t border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-xs font-medium tracking-widest uppercase text-foreground/20 mb-1">
                Building in public
              </p>
              <p className="text-sm text-muted-foreground">
                Follow <span className="text-foreground/70">@seanchiuai</span> for updates, lessons, and shipping wins
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="https://x.com/seanchiuai"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow on X"
                className="w-10 h-10 rounded-lg border border-border flex items-center justify-center text-foreground/30 hover:text-foreground hover:border-foreground/20 transition-colors"
              >
                <XIcon className="w-4 h-4" />
              </a>
              <a
                href="https://www.linkedin.com/in/seanchiuai"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Connect on LinkedIn"
                className="w-10 h-10 rounded-lg border border-border flex items-center justify-center text-foreground/30 hover:text-foreground hover:border-foreground/20 transition-colors"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="https://www.instagram.com/seanchiuai/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow on Instagram"
                className="w-10 h-10 rounded-lg border border-border flex items-center justify-center text-foreground/30 hover:text-foreground hover:border-foreground/20 transition-colors"
              >
                <Instagram className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
