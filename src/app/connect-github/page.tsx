"use client";

import { useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserButton, useUser } from "@clerk/nextjs";
import { useSyncUser } from "@/hooks/useSyncUser";
import {
  Github,
  Check,
  X,
  Loader2,
  AlertCircle,
  Unlink,
} from "lucide-react";

export default function ConnectGitHubPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: clerkUser, isLoaded } = useUser();
  const convexUser = useSyncUser();
  const removeToken = useMutation(api.users.removeGitHubToken);
  const validateToken = useAction(api.github.validateToken);

  const [validating, setValidating] = useState(false);
  const [githubUsername, setGithubUsername] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const error = searchParams.get("error");
  const returnTo = searchParams.get("returnTo") || "/dashboard";

  const isConnected = !!convexUser?.githubToken;

  useEffect(() => {
    async function validate() {
      if (!isConnected || validating || githubUsername) return;
      setValidating(true);
      try {
        const result = await validateToken({});
        if (result.valid) {
          setGithubUsername(result.username || null);
        }
      } catch {
        // token may be invalid
      } finally {
        setValidating(false);
      }
    }
    validate();
  }, [isConnected, validating, githubUsername, validateToken]);

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await removeToken({});
      setGithubUsername(null);
    } catch {
      // disconnect failed
    } finally {
      setDisconnecting(false);
    }
  }

  function handleConnect() {
    const connectUrl = `/api/github/connect?returnTo=${encodeURIComponent(returnTo)}`;
    window.location.href = connectUrl;
  }

  if (!isLoaded || convexUser === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!clerkUser) {
    router.push("/");
    return null;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.push("/dashboard")}>
            Shipright
          </Button>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm">
              {clerkUser.fullName || clerkUser.primaryEmailAddress?.emailAddress}
            </span>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-16">
        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-destructive">
                {error === "no_code" && "GitHub did not provide an authorization code."}
                {error === "not_authenticated" && "Please sign in first."}
                {error === "exchange_failed" && "Failed to connect GitHub. Please try again."}
                {!["no_code", "not_authenticated", "exchange_failed"].includes(error) &&
                  "An error occurred. Please try again."}
              </p>
            </CardContent>
          </Card>
        )}

        {isConnected ? (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>GitHub Connected</CardTitle>
              <CardDescription>
                {validating
                  ? "Verifying connection..."
                  : githubUsername
                    ? `Connected as @${githubUsername}`
                    : "Your GitHub account is connected."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => router.push(returnTo)}>
                  Continue
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="text-destructive hover:text-destructive gap-2"
                >
                  {disconnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Unlink className="h-4 w-4" />
                  )}
                  Disconnect
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
                <Github className="h-6 w-6" />
              </div>
              <CardTitle>Connect your GitHub account</CardTitle>
              <CardDescription>
                We need access to create repositories for your projects.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <Button onClick={handleConnect} size="lg" className="gap-2">
                  <Github className="h-5 w-5" />
                  Connect GitHub
                </Button>
              </div>

              <div className="space-y-3 text-sm">
                <div className="space-y-1.5">
                  <p className="font-medium text-muted-foreground">We will:</p>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Create private repositories for your apps</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Commit code and documentation</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="font-medium text-muted-foreground">We will NOT:</p>
                  <div className="flex items-center gap-2">
                    <X className="h-4 w-4 text-destructive" />
                    <span>Access your existing repositories</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <X className="h-4 w-4 text-destructive" />
                    <span>Read your private code</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
