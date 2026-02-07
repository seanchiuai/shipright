import React, { createElement } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// --- Mocks ---

const pushMock = vi.fn();

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ isSignedIn: false, isLoaded: true }),
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  UserButton: () => <div data-testid="user-button" />,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: React.ReactNode; href: string }) =>
    createElement("a", props, children),
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => createElement("img", props),
}));

vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(),
  useQuery: () => undefined,
  useAction: () => vi.fn(),
  useConvex: () => ({}),
}));

const MOTION_PROPS = new Set([
  "initial", "animate", "transition", "whileTap", "whileHover",
  "whileInView", "exit", "variants", "viewport", "style",
]);

function makeMotionComponent(tag: string) {
  function MotionComponent(props: Record<string, unknown>) {
    const filtered: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(props)) {
      if (!MOTION_PROPS.has(k)) filtered[k] = v;
    }
    return createElement(tag, filtered);
  }
  MotionComponent.displayName = `motion.${tag}`;
  return MotionComponent;
}

vi.mock("framer-motion", () => ({
  motion: new Proxy({}, { get: (_t, prop: string) => makeMotionComponent(prop) }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useScroll: () => ({ scrollYProgress: { get: () => 0 } }),
  useTransform: () => 0,
  useMotionValueEvent: vi.fn(),
  useInView: () => true,
}));

// --- Tests ---

import LandingPage from "./page";

describe("Smoke: Landing Page", () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it("renders without crashing", () => {
    render(<LandingPage />);
    // Page should have main content area
    expect(document.querySelector("main")).toBeInTheDocument();
  });

  it("renders header and footer", () => {
    render(<LandingPage />);
    expect(document.querySelector("header") || screen.queryByRole("banner")).toBeTruthy();
    expect(document.querySelector("footer") || screen.queryByRole("contentinfo")).toBeTruthy();
  });

  it("does not redirect when user is signed out", () => {
    render(<LandingPage />);
    expect(pushMock).not.toHaveBeenCalled();
  });
});
