import { Daytona } from "@daytonaio/sdk";

const daytona = new Daytona({
  apiKey: process.env.DAYTONA_API_KEY!,
  target: "us",
});

export interface CreateSandboxOptions {
  projectId: string;
  supabaseUrl: string;
  supabaseKey: string;
}

export async function createSandbox(options: CreateSandboxOptions) {
  const sandbox = await daytona.create({
    language: "typescript",
    envVars: {
      CLAUDE_CODE_OAUTH_TOKEN: process.env.CLAUDE_CODE_OAUTH_TOKEN ?? "",
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "",
      NEXT_PUBLIC_SUPABASE_URL: options.supabaseUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: options.supabaseKey,
      TENANT_ID: options.projectId,
    },
    autoStopInterval: 10, // minutes
  });

  return sandbox;
}

export async function execInSandbox(
  sandboxId: string,
  command: string,
  options?: { stream?: boolean }
) {
  const sandbox = await daytona.get(sandboxId);
  const result = await sandbox.process.executeCommand(command);
  return result;
}

export async function getPreviewUrl(sandboxId: string, port: number = 3000) {
  const sandbox = await daytona.get(sandboxId);
  return sandbox.getPreviewLink(port);
}

export async function destroySandbox(sandboxId: string) {
  const sandbox = await daytona.get(sandboxId);
  await sandbox.delete();
}

export async function wakeSandbox(sandboxId: string) {
  const sandbox = await daytona.get(sandboxId);
  await sandbox.start();
  return sandbox;
}

export { daytona };
