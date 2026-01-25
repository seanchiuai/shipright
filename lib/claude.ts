import { execInSandbox } from "./daytona";

export interface ClaudeOptions {
  sandboxId: string;
  prompt: string;
  systemPrompt?: string;
}

/**
 * Run Claude Code in a Daytona sandbox
 */
export async function runClaudeCode(options: ClaudeOptions) {
  const { sandboxId, prompt, systemPrompt } = options;

  // Build the full prompt
  let fullPrompt = prompt;
  if (systemPrompt) {
    fullPrompt = `${systemPrompt}\n\n---\n\n${prompt}`;
  }

  // Escape the prompt for shell
  const escapedPrompt = fullPrompt.replace(/'/g, "'\\''");

  // Run Claude Code with dangerously-skip-permissions for autonomous operation
  const command = `claude '${escapedPrompt}' --dangerously-skip-permissions`;

  const result = await execInSandbox(sandboxId, command);
  return result;
}

/**
 * Resume an existing Claude Code session
 */
export async function resumeClaudeSession(
  sandboxId: string,
  followUp: string
) {
  const escapedPrompt = followUp.replace(/'/g, "'\\''");
  const command = `claude --resume '${escapedPrompt}'`;

  const result = await execInSandbox(sandboxId, command);
  return result;
}
