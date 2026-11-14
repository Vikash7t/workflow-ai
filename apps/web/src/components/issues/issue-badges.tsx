import {
  Bookmark,
  CheckSquare,
  Bug,
  Layers,
  GitCommit,
  AlertCircle,
  ArrowUp,
  ArrowRight,
  ArrowDown,
} from "lucide-react";
import { IssueType, Priority, WorkflowCategory } from "@workflow-ai/contracts";

export function IssueTypeBadge({ type }: { type: IssueType }) {
  switch (type) {
    case "EPIC":
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-400" title="Epic">
          <Layers className="w-3.5 h-3.5" />
          <span>Epic</span>
        </span>
      );
    case "STORY":
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400" title="Story">
          <Bookmark className="w-3.5 h-3.5" />
          <span>Story</span>
        </span>
      );
    case "BUG":
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-400" title="Bug">
          <Bug className="w-3.5 h-3.5" />
          <span>Bug</span>
        </span>
      );
    case "SUBTASK":
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-400" title="Subtask">
          <GitCommit className="w-3.5 h-3.5" />
          <span>Subtask</span>
        </span>
      );
    case "TASK":
    default:
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-400" title="Task">
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Task</span>
        </span>
      );
  }
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  switch (priority) {
    case "P0":
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/15 text-red-400 border border-red-500/30" title="P0 - Blocker / Urgent">
          <AlertCircle className="w-3 h-3" />
          <span>P0</span>
        </span>
      );
    case "P1":
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-500/15 text-orange-400 border border-orange-500/30" title="P1 - High">
          <ArrowUp className="w-3 h-3" />
          <span>P1</span>
        </span>
      );
    case "P2":
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30" title="P2 - Medium">
          <ArrowRight className="w-3 h-3" />
          <span>P2</span>
        </span>
      );
    case "P3":
    default:
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700" title="P3 - Low">
          <ArrowDown className="w-3 h-3" />
          <span>P3</span>
        </span>
      );
  }
}

export function CategoryPill({ category }: { category: WorkflowCategory }) {
  switch (category) {
    case "COMPLETED":
      return (
        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
      );
    case "STARTED":
      return (
        <span className="w-2 h-2 rounded-full bg-blue-400 inline-block animate-pulse" />
      );
    case "CANCELLED":
      return (
        <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" />
      );
    case "UNSTARTED":
      return (
        <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
      );
    case "BACKLOG":
    default:
      return (
        <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
      );
  }
}
