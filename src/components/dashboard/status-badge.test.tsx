import React, { createElement } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./status-badge";

const MOTION_PROPS = new Set(["initial", "animate", "transition", "whileTap", "whileHover", "exit", "variants"]);

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
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

describe("StatusBadge", () => {
  it("renders 'In Progress' for interview status", () => {
    render(<StatusBadge status="interview" />);
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("renders 'Matching' for matching status", () => {
    render(<StatusBadge status="matching" />);
    expect(screen.getByText("Matching")).toBeInTheDocument();
  });

  it("renders 'Creating Repo' for matched status", () => {
    render(<StatusBadge status="matched" />);
    expect(screen.getByText("Creating Repo")).toBeInTheDocument();
  });

  it("renders 'Building' for building status", () => {
    render(<StatusBadge status="building" />);
    expect(screen.getByText("Building")).toBeInTheDocument();
  });

  it("renders 'Scaffolding' for scaffolding status", () => {
    render(<StatusBadge status="scaffolding" />);
    expect(screen.getByText("Scaffolding")).toBeInTheDocument();
  });

  it("renders 'Complete' for complete status", () => {
    render(<StatusBadge status="complete" />);
    expect(screen.getByText("Complete")).toBeInTheDocument();
  });

  it("renders 'Failed' for repo_failed status", () => {
    render(<StatusBadge status="repo_failed" />);
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("falls back to 'In Progress' for unknown status", () => {
    render(<StatusBadge status="unknown_xyz" />);
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });
});
