"use client";

import Image from "next/image";

const footerLinks = {
  Product: [
    { label: "How it works", href: "#how-it-works" },
    { label: "Templates", href: "#" },
  ],
  Resources: [
    { label: "Blog", href: "#" },
    { label: "Documentation", href: "#" },
  ],
  Legal: [
    { label: "Privacy", href: "#" },
    { label: "Terms", href: "#" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row justify-between gap-10 mb-10">
          <div>
            <a
              href="#"
              className="flex items-center gap-2 font-semibold text-base tracking-tight mb-2"
            >
              <Image
                src="/logo.png"
                alt="ShipRight"
                width={28}
                height={20}
                className="w-7 h-auto"
              />
              ShipRight
            </a>
            <p className="text-sm text-muted-foreground">
              The on-ramp to vibe coding.
            </p>
          </div>

          <div className="flex flex-wrap gap-16">
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category}>
                <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-3">
                  {category}
                </p>
                <ul className="space-y-2">
                  {links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-sm text-foreground/80 hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} ShipRight
          </p>
        </div>
      </div>
    </footer>
  );
}
