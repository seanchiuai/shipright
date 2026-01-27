"use client";

import { FadeIn } from "./fade-in";
import { Folder, FileText, FolderOpen, Check } from "lucide-react";

function FileTree() {
  return (
    <div className="glass-card p-6 font-mono text-sm transition-all duration-300">
      <div className="text-muted-foreground text-xs uppercase tracking-wider mb-4">
        Your Generated Repo
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-primary" />
          <span className="text-foreground font-medium">my-saas-app/</span>
        </div>
        <div className="pl-6 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <FileText className="w-4 h-4" />
            <span>CLAUDE.md</span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              AI context
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <FileText className="w-4 h-4" />
            <span>TASKS.md</span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              Your backlog
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <FileText className="w-4 h-4" />
            <span>PRD.md</span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              Requirements
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Folder className="w-4 h-4" />
            <span>src/</span>
          </div>
          <div className="pl-6 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Folder className="w-4 h-4" />
              <span>components/</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Folder className="w-4 h-4" />
              <span>app/</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="w-4 h-4" />
            <span>package.json</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="w-4 h-4" />
            <span>tsconfig.json</span>
          </div>
        </div>
      </div>
      <div className="mt-6 pt-4 border-t border-border/50 space-y-2 text-xs">
        <div className="flex items-center gap-2 text-primary">
          <Check className="w-4 h-4" />
          <span>Production-ready structure</span>
        </div>
        <div className="flex items-center gap-2 text-primary">
          <Check className="w-4 h-4" />
          <span>AI understands your project</span>
        </div>
        <div className="flex items-center gap-2 text-primary">
          <Check className="w-4 h-4" />
          <span>Real code, not a demo</span>
        </div>
      </div>
    </div>
  );
}

function ClaudeMdPreview() {
  return (
    <div className="glass-card overflow-hidden transition-all duration-300">
      <div className="bg-muted/50 px-4 py-3 border-b border-border/50 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
          <div className="w-3 h-3 rounded-full bg-green-400/80" />
        </div>
        <span className="text-sm font-mono text-muted-foreground ml-2">
          CLAUDE.md
        </span>
      </div>
      <div className="p-6 font-mono text-sm space-y-4 max-h-96 overflow-y-auto">
        <div>
          <span className="text-primary font-semibold"># </span>
          <span className="font-semibold">My SaaS App</span>
        </div>
        <div className="text-muted-foreground">
          A platform where freelancers track time and send invoices to clients.
        </div>
        <div className="pt-2">
          <span className="text-primary font-semibold">## </span>
          <span className="font-semibold">Tech Stack</span>
        </div>
        <ul className="text-muted-foreground space-y-1 pl-4">
          <li>- Next.js 14 (App Router)</li>
          <li>- Convex (real-time database)</li>
          <li>- Clerk (authentication)</li>
          <li>- Stripe (payments)</li>
        </ul>
        <div className="pt-2">
          <span className="text-primary font-semibold">## </span>
          <span className="font-semibold">Commands</span>
        </div>
        <div className="bg-muted/30 rounded-lg p-3 text-xs border border-border/50">
          <div>
            <span className="text-primary">npm run dev</span>
            <span className="text-muted-foreground"> # Start dev server</span>
          </div>
          <div>
            <span className="text-primary">npx convex dev</span>
            <span className="text-muted-foreground"> # Start Convex</span>
          </div>
        </div>
        <div className="pt-2">
          <span className="text-primary font-semibold">## </span>
          <span className="font-semibold">Key Features</span>
        </div>
        <ul className="text-muted-foreground space-y-1 pl-4">
          <li>- User authentication with Clerk</li>
          <li>- Time tracking with timer</li>
          <li>- Invoice generation</li>
          <li>- Client management</li>
        </ul>
      </div>
    </div>
  );
}

export function WhatYouGet() {
  return (
    <section className="py-20 lg:py-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            What you get
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A complete GitHub repo with everything AI needs to build your app
          </p>
        </FadeIn>

        <div className="grid lg:grid-cols-2 gap-8">
          <FadeIn delay={0.1}>
            <FileTree />
          </FadeIn>
          <FadeIn delay={0.2}>
            <ClaudeMdPreview />
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
