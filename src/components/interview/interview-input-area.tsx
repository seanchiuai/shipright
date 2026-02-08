"use client";

import { MagicTextarea } from "./magic-textarea";

export function InterviewInputArea({
  phase,
  hasMessages,
  currentInput,
  loading,
  isComplete,
  onInputChange,
  onSubmitIdea,
  onAnswer,
  onFinishEarly,
}: {
  phase: string;
  hasMessages: boolean;
  currentInput: string;
  loading: boolean;
  isComplete: boolean;
  onInputChange: (value: string) => void;
  onSubmitIdea: () => void;
  onAnswer: (answer: string) => void;
  onFinishEarly: () => void;
}) {
  const isSeedEmpty = phase === "seed" && !hasMessages;
  const showTextInput = phase === "seed" || (phase === "conversation" && !isComplete);

  const exampleIdeas = [
    "A marketplace where local tutors connect with students",
    "A habit tracker that sends daily check-ins",
    "A recipe sharing app with meal planning",
  ];

  if (phase === "summary") return null;

  return (
    <div className="shrink-0 border-t border-border/60 bg-background/50 backdrop-blur-xl">
      <div className="max-w-2xl mx-auto p-4 px-6">
        {/* Example idea chips for seed phase */}
        {isSeedEmpty && !currentInput && (
          <div className="flex flex-wrap gap-2 mb-3">
            {exampleIdeas.map((idea) => (
              <button
                key={idea}
                onClick={() => onInputChange(idea)}
                className="px-3.5 py-1.5 text-[12px] rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-card/80 transition-all duration-200"
              >
                {idea}
              </button>
            ))}
          </div>
        )}

        {showTextInput && (
          <MagicTextarea
            value={currentInput}
            onChange={onInputChange}
            onSubmit={
              isSeedEmpty
                ? onSubmitIdea
                : () => {
                    if (currentInput.trim()) {
                      onAnswer(currentInput.trim());
                    }
                  }
            }
            placeholder={
              isSeedEmpty
                ? "I want to build an app that..."
                : "Type your answer..."
            }
            maxLength={isSeedEmpty ? 500 : undefined}
            loading={loading}
            submitLabel={isSeedEmpty ? "Let's Go!" : "Send"}
          />
        )}

        {/* Finish early option */}
        {phase === "conversation" && !isComplete && hasMessages && (
          <div className="mt-2 text-center">
            <button
              onClick={onFinishEarly}
              disabled={loading}
              className="text-[12px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              Skip conversation &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
