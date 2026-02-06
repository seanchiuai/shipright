"use client";

import { motion } from "framer-motion";
import {
  Folder,
  Github,
  Clock,
  ChevronRight,
  Package,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Id } from "../../../convex/_generated/dataModel";
import { StatusBadge } from "./status-badge";
import { staggerItem } from "./stagger-container";

export function ProjectCard({
  project,
  onClick,
  onRename,
  onDelete,
}: {
  project: {
    _id: Id<"projects">;
    name: string;
    status: string;
    scaffoldingStatus?: string;
    appIdea?: string;
    githubRepoUrl?: string;
    templateName?: string;
    _creationTime: number;
  };
  onClick: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      variants={staggerItem}
      onClick={onClick}
      className="group relative cursor-pointer"
    >
      {/* Glow effect on hover */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-2xl opacity-0 group-hover:opacity-100 blur transition-opacity duration-300" />

      <div className="relative bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-6 transition-all duration-300 group-hover:border-primary/30 group-hover:shadow-[0_8px_30px_rgba(240,140,58,0.12)] group-hover:-translate-y-1">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-purple-500/10 flex items-center justify-center group-hover:from-primary/20 group-hover:to-purple-500/20 transition-colors">
            <Folder className="w-6 h-6 text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={project.status} scaffoldingStatus={project.scaffoldingStatus} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors opacity-0 group-hover:opacity-100">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(); }}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <h3 className="font-serif text-lg font-medium text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">
          {project.name}
        </h3>

        {project.appIdea && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {project.appIdea}
          </p>
        )}

        <div className={`flex items-center gap-2 text-sm text-muted-foreground ${project.templateName ? "mb-1" : "mb-4"}`}>
          <Clock className="w-4 h-4" />
          <span>{new Date(project._creationTime).toLocaleDateString()}</span>
        </div>

        {project.templateName && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Package className="w-4 h-4" />
            <span className="truncate">{project.templateName}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          {project.githubRepoUrl ? (
            <a
              href={project.githubRepoUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              <Github className="w-4 h-4" />
              View Repo
            </a>
          ) : (
            <span className="text-sm text-muted-foreground">
              {project.status === "interview" ? "Continue interview" :
               project.scaffoldingStatus === "scaffolding_failed" || project.status === "repo_failed" ? "View details" :
               project.status === "scaffolding" || project.status === "building" ? "In progress..." :
               "View project"}
            </span>
          )}
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </motion.div>
  );
}
