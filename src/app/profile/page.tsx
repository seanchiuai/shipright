"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useSyncUser } from "@/hooks/useSyncUser";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Github,
  Loader2,
  Unlink,
  LogOut,
  Check,
} from "lucide-react";
import { AppNavbar } from "@/components/app-navbar";

export default function ProfilePage() {
  const router = useRouter();
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut } = useClerk();
  const convexUser = useSyncUser();
  const removeToken = useMutation(api.users.removeGitHubToken);
  const validateToken = useAction(api.github.validateToken);

  const [githubUsername, setGithubUsername] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

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
    const connectUrl = `/api/github/connect?returnTo=${encodeURIComponent("/profile")}`;
    window.location.href = connectUrl;
  }

  async function handleSignOut() {
    setSigningOut(true);
    await signOut({ redirectUrl: "/" });
  }

  if (!isLoaded || convexUser === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" data-theme="dark">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!clerkUser) {
    router.push("/");
    return null;
  }

  const initials = clerkUser.fullName
    ? clerkUser.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : clerkUser.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-background" data-theme="dark">
      <AppNavbar />

      <main className="max-w-2xl mx-auto px-4 py-12 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">Profile</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={clerkUser.imageUrl} alt={clerkUser.fullName || "Avatar"} />
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-medium">
                  {clerkUser.fullName || "No name set"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {clerkUser.primaryEmailAddress?.emailAddress}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-serif text-xl flex items-center gap-2">
                  <Github className="h-5 w-5" />
                  GitHub
                </CardTitle>
                <CardDescription>
                  Connect GitHub to create repositories for your projects
                </CardDescription>
              </div>
              {isConnected && (
                <Badge
                  variant="secondary"
                  className="bg-green-500/10 text-green-400 border-green-500/20"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isConnected ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Github className="h-4 w-4 text-muted-foreground" />
                  {validating ? (
                    <span className="text-muted-foreground">Verifying...</span>
                  ) : githubUsername ? (
                    <span className="font-medium">@{githubUsername}</span>
                  ) : (
                    <span className="text-muted-foreground">Account connected</span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
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
            ) : (
              <Button onClick={handleConnect} className="gap-2">
                <Github className="h-4 w-4" />
                Connect GitHub
              </Button>
            )}
          </CardContent>
        </Card>

        <Separator />

        <Button
          variant="outline"
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full gap-2 text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/5"
        >
          {signingOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          Sign out
        </Button>
      </main>
    </div>
  );
}
