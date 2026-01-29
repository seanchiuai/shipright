"use client";

import { Folder, FileText } from "lucide-react";

const features = [
  {
    file: "CLAUDE.md",
    label: "AI context",
    description: "Gives AI agents complete understanding of your project. No more error loops from missing context.",
  },
  {
    file: "TASKS.md",
    label: "Backlog",
    description: "A clear roadmap of what to build next. No more staring at a blank screen.",
  },
  {
    file: "PRD.md",
    label: "Requirements",
    description: "Documents the why behind features. You and AI stay aligned as the project grows.",
  },
];

export function WhatYouGet() {
  return (
    <section id="features" className="py-24 md:py-32 bg-[#1c1917] text-[#faf8f5]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left - Content */}
          <div>
            <p className="text-sm font-medium tracking-widest uppercase text-[#a8a29e] mb-3">
              What you get
            </p>
            <h2 className="font-serif text-3xl md:text-4xl lg:text-[2.75rem] leading-tight tracking-tight mb-6">
              Everything AI needs to understand your project
            </h2>
            <p className="text-[#a8a29e] text-lg leading-relaxed mb-12">
              Your repo comes with scaffolding files that turn any AI coding tool into an expert on your specific project.
            </p>

            <div className="space-y-8">
              {features.map((feature) => (
                <div key={feature.file} className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#292524] flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-[#a8a29e]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-sm font-medium">{feature.file}</span>
                      <span className="text-[0.6875rem] px-2 py-0.5 rounded-full bg-[#292524] text-[#a8a29e] font-medium">
                        {feature.label}
                      </span>
                    </div>
                    <p className="text-sm text-[#78716c] leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right - File tree */}
          <div className="bg-[#0c0a09] border border-[#292524] rounded-xl p-8 font-mono text-sm">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2.5 h-2.5 rounded-full bg-[#292524]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#292524]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#292524]" />
              <span className="text-xs text-[#57534e] ml-2">~/my-saas-app</span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[#78716c] py-0.5">
                <Folder className="w-4 h-4" />
                <span>my-saas-app/</span>
              </div>

              <div className="ml-5 space-y-1">
                <div className="flex items-center gap-2 py-0.5 text-emerald-400">
                  <FileText className="w-4 h-4" />
                  <span>CLAUDE.md</span>
                </div>
                <div className="flex items-center gap-2 py-0.5 text-emerald-400">
                  <FileText className="w-4 h-4" />
                  <span>TASKS.md</span>
                </div>
                <div className="flex items-center gap-2 py-0.5 text-emerald-400">
                  <FileText className="w-4 h-4" />
                  <span>PRD.md</span>
                </div>
                <div className="flex items-center gap-2 py-0.5 text-[#57534e]">
                  <Folder className="w-4 h-4" />
                  <span>skills/</span>
                </div>
                <div className="flex items-center gap-2 py-0.5 text-[#57534e]">
                  <Folder className="w-4 h-4" />
                  <span>src/</span>
                </div>
                <div className="flex items-center gap-2 py-0.5 text-[#57534e]">
                  <FileText className="w-4 h-4" />
                  <span>package.json</span>
                </div>
                <div className="flex items-center gap-2 py-0.5 text-[#57534e]">
                  <FileText className="w-4 h-4" />
                  <span>tsconfig.json</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
