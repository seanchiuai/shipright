"use client";

import { useEffect, memo, useReducer } from "react";

interface ElapsedTimerProps {
  isActive: boolean;
  renderContent: (seconds: number) => React.ReactNode;
}

type TimerState = { seconds: number };
type TimerAction = { type: "tick" } | { type: "reset" };

function timerReducer(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    case "tick":
      return { seconds: state.seconds + 1 };
    case "reset":
      return { seconds: 0 };
    default:
      return state;
  }
}

export const ElapsedTimer = memo(function ElapsedTimer({
  isActive,
  renderContent,
}: ElapsedTimerProps) {
  const [state, dispatch] = useReducer(timerReducer, { seconds: 0 });

  useEffect(() => {
    dispatch({ type: "reset" });

    if (!isActive) {
      return;
    }

    const interval = setInterval(() => {
      dispatch({ type: "tick" });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  return <>{renderContent(state.seconds)}</>;
});
