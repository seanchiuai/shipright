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
    <section className="py-24 md:py-32 bg-[#1c1917] text-[#faf8f5]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl leading-tight tracking-tight mb-4">
            Stop researching.
            <br />
            Start building.
          </h2>
          <p className="text-lg text-[#a8a29e] mb-10">
            Your app idea + a few minutes = a GitHub repo ready for vibe coding.
          </p>

          <SignInButton mode="modal">
            <Button
              size="lg"
              className="bg-[#faf8f5] text-[#1c1917] hover:bg-[#f3ede4] rounded-lg text-base px-8 h-12 font-medium"
            >
              Start building free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </SignInButton>

          <p className="text-xs text-[#57534e] mt-4">
            No credit card required. Own your code forever.
          </p>
        </div>

        {/* Building in public */}
        <div className="mt-20 pt-12 border-t border-[#292524]">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-xs font-medium tracking-widest uppercase text-[#57534e] mb-1">
                Building in public
              </p>
              <p className="text-sm text-[#a8a29e]">
                Follow <span className="text-[#faf8f5]">@seanchiuai</span> for updates, lessons, and shipping wins
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="https://x.com/seanchiuai"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow on X"
                className="w-10 h-10 rounded-lg border border-[#292524] flex items-center justify-center text-[#a8a29e] hover:text-[#faf8f5] hover:border-[#57534e] transition-colors"
              >
                <XIcon className="w-4 h-4" />
              </a>
              <a
                href="https://www.linkedin.com/in/seanchiuai"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Connect on LinkedIn"
                className="w-10 h-10 rounded-lg border border-[#292524] flex items-center justify-center text-[#a8a29e] hover:text-[#faf8f5] hover:border-[#57534e] transition-colors"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="https://www.instagram.com/seanchiuai/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow on Instagram"
                className="w-10 h-10 rounded-lg border border-[#292524] flex items-center justify-center text-[#a8a29e] hover:text-[#faf8f5] hover:border-[#57534e] transition-colors"
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
