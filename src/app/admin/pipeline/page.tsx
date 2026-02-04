"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isAdmin } from "@/lib/admin";
import { AppNavbar } from "@/components/app-navbar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSyncUser } from "@/hooks/useSyncUser";

const STATUS_COLORS: Record<string, string> = {
  started: "bg-blue-500/10 text-blue-600",
  completed: "bg-green-500/10 text-green-600",
  failed: "bg-red-500/10 text-red-600",
};

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(ms: number | undefined): string {
  if (ms === undefined) return "-";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export default function AdminPipelinePage() {
  const { user: clerkUser, isLoaded } = useUser();
  const router = useRouter();
  const convexUser = useSyncUser();
  const events = useQuery(api.pipelineEvents.listRecent, { limit: 200 });

  const [filterProject, setFilterProject] = useState<string>("");

  useEffect(() => {
    if (isLoaded && clerkUser && !isAdmin(clerkUser.id)) {
      router.push("/dashboard");
    }
  }, [isLoaded, clerkUser, router]);

  if (!isLoaded || convexUser === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!clerkUser || !isAdmin(clerkUser.id)) {
    return null;
  }

  const filteredEvents = filterProject
    ? events?.filter((e) => e.projectId === filterProject)
    : events;

  const projectIds = events
    ? [...new Set(events.map((e) => e.projectId))]
    : [];

  return (
    <div className="min-h-screen">
      <AppNavbar title="Admin: Pipeline Events" />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Pipeline Events</CardTitle>
              <div className="flex items-center gap-2">
                <select
                  value={filterProject}
                  onChange={(e) => setFilterProject(e.target.value)}
                  className="text-sm border rounded-md px-2 py-1 bg-background"
                >
                  <option value="">All projects</option>
                  {projectIds.map((id) => (
                    <option key={id} value={id}>
                      {id.slice(0, 12)}...
                    </option>
                  ))}
                </select>
                <Badge variant="secondary" className="text-xs">
                  {filteredEvents?.length ?? 0} events
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!filteredEvents ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading events...
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pipeline events yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Time</th>
                      <th className="pb-2 pr-4 font-medium">Project</th>
                      <th className="pb-2 pr-4 font-medium">Step</th>
                      <th className="pb-2 pr-4 font-medium">Status</th>
                      <th className="pb-2 pr-4 font-medium">Duration</th>
                      <th className="pb-2 font-medium">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.map((event) => (
                      <tr
                        key={event._id}
                        className="border-b border-border/50 hover:bg-muted/30"
                      >
                        <td className="py-2 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                          {formatTimestamp(event.timestamp)}
                        </td>
                        <td className="py-2 pr-4">
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">
                            {(event.projectId as string).slice(0, 12)}
                          </code>
                        </td>
                        <td className="py-2 pr-4 font-mono text-xs">
                          {event.step}
                        </td>
                        <td className="py-2 pr-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                              STATUS_COLORS[event.status] || "bg-muted text-muted-foreground"
                            }`}
                          >
                            {event.status}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-xs text-muted-foreground">
                          {formatDuration(event.durationMs)}
                        </td>
                        <td className="py-2 text-xs text-destructive max-w-xs truncate">
                          {event.error || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
