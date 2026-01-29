"use client";

const steps = [
  {
    number: "01",
    title: "Describe your idea",
    description:
      "Tell us what you want to build in plain English. Our AI guides you through a short interview to nail down features and requirements.",
  },
  {
    number: "02",
    title: "Get matched",
    description:
      "We analyze your needs and match you to the right template. Production-ready code, optimized for AI-assisted development.",
  },
  {
    number: "03",
    title: "Start building",
    description:
      "Get a GitHub repo with all the scaffolding AI needs to understand your project. Start vibe coding immediately.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-2xl mb-16">
          <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
            How it works
          </p>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-[2.75rem] leading-tight tracking-tight">
            Idea to codebase in three steps
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-12 md:gap-8">
          {steps.map((step) => (
            <div key={step.number} className="group">
              <div className="text-xs font-mono text-muted-foreground mb-4">
                {step.number}
              </div>
              <div className="h-px bg-border mb-6 relative">
                <div className="absolute inset-y-0 left-0 w-8 bg-foreground transition-all duration-500 group-hover:w-full" />
              </div>
              <h3 className="text-lg font-semibold mb-2 tracking-tight">
                {step.title}
              </h3>
              <p className="text-[0.9375rem] text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
