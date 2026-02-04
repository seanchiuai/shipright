import React, { createElement } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChoiceCard, ChoiceGrid } from "./choice-card";

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

describe("ChoiceCard", () => {
  it("renders label text", () => {
    render(<ChoiceCard label="Option A" selected={false} onClick={() => {}} />);
    expect(screen.getByText("Option A")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<ChoiceCard label="Click me" selected={false} onClick={onClick} />);
    fireEvent.click(screen.getByText("Click me"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders description when provided", () => {
    render(<ChoiceCard label="Opt" selected={false} onClick={() => {}} description="A description" />);
    expect(screen.getByText("A description")).toBeInTheDocument();
  });
});

describe("ChoiceGrid", () => {
  it("single-select: onChange called with string", () => {
    const onChange = vi.fn();
    render(<ChoiceGrid options={["A", "B", "C"]} selected="" onChange={onChange} />);
    fireEvent.click(screen.getByText("B"));
    expect(onChange).toHaveBeenCalledWith("B");
  });

  it("multi-select: toggle adds to array", () => {
    const onChange = vi.fn();
    render(<ChoiceGrid options={["A", "B"]} selected={["A"]} onChange={onChange} multiSelect />);
    fireEvent.click(screen.getByText("B"));
    expect(onChange).toHaveBeenCalledWith(["A", "B"]);
  });

  it("multi-select: toggle removes from array", () => {
    const onChange = vi.fn();
    render(<ChoiceGrid options={["A", "B"]} selected={["A", "B"]} onChange={onChange} multiSelect />);
    fireEvent.click(screen.getByText("A"));
    expect(onChange).toHaveBeenCalledWith(["B"]);
  });

  it("renders all options", () => {
    render(<ChoiceGrid options={["X", "Y", "Z"]} selected="" onChange={() => {}} />);
    expect(screen.getByText("X")).toBeInTheDocument();
    expect(screen.getByText("Y")).toBeInTheDocument();
    expect(screen.getByText("Z")).toBeInTheDocument();
  });
});
