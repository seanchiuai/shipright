"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";

export default function Dashboard() {
  const projects = useQuery(api.projects.list);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Your Projects</h1>
          <Link
            href="/project/new"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            New Project
          </Link>
        </div>

        {projects === undefined ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No projects yet</p>
            <Link
              href="/project/new"
              className="text-primary hover:underline"
            >
              Create your first project
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project._id}
                href={`/project/${project._id}`}
                className="block p-6 rounded-lg border hover:border-primary transition-colors"
              >
                <h2 className="font-semibold mb-2">{project.name}</h2>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {project.idea}
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      project.status === "complete"
                        ? "bg-green-100 text-green-700"
                        : project.status === "error"
                          ? "bg-red-100 text-red-700"
                          : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {project.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
