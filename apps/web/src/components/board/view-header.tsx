"use client";

import {
  LayoutDashboard,
  List,
  Search,
  Plus,
  Filter,
  X,
} from "lucide-react";
import {
  IssueType,
  Priority,
  WorkflowStatusDto,
  WorkspaceMemberDto,
} from "@workflow-ai/contracts";

export interface FilterState {
  search: string;
  statusId: string;
  type: string;
  priority: string;
  assigneeId: string;
}

interface ViewHeaderProps {
  currentView: "board" | "list";
  onViewChange: (view: "board" | "list") => void;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  statuses: WorkflowStatusDto[];
  members: WorkspaceMemberDto[];
  onOpenCreateModal: () => void;
}

export function ViewHeader({
  currentView,
  onViewChange,
  filters,
  onFilterChange,
  statuses,
  members,
  onOpenCreateModal,
}: ViewHeaderProps) {
  const hasActiveFilters =
    Boolean(filters.search) ||
    Boolean(filters.statusId) ||
    Boolean(filters.type) ||
    Boolean(filters.priority) ||
    Boolean(filters.assigneeId);

  const clearFilters = () => {
    onFilterChange({
      search: "",
      statusId: "",
      type: "",
      priority: "",
      assigneeId: "",
    });
  };

  return (
    <div className="space-y-3 pb-3 border-b border-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800/80 w-fit">
          <button
            onClick={() => onViewChange("board")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              currentView === "board"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Board</span>
          </button>
          <button
            onClick={() => onViewChange("list")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              currentView === "list"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>List</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Issue</span>
            <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 rounded bg-blue-700/60 text-[10px] font-mono text-blue-200">
              C
            </kbd>
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
        {/* Search Input */}
        <div className="relative min-w-[200px] flex-1 sm:flex-initial">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) =>
              onFilterChange({ ...filters, search: e.target.value })
            }
            placeholder="Search issues..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        {/* Status Filter */}
        <select
          value={filters.statusId}
          onChange={(e) =>
            onFilterChange({ ...filters, statusId: e.target.value })
          }
          className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Statuses</option>
          {statuses.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Type Filter */}
        <select
          value={filters.type}
          onChange={(e) =>
            onFilterChange({ ...filters, type: e.target.value })
          }
          className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Types</option>
          <option value="TASK">Task</option>
          <option value="BUG">Bug</option>
          <option value="STORY">Story</option>
          <option value="EPIC">Epic</option>
          <option value="SUBTASK">Subtask</option>
        </select>

        {/* Priority Filter */}
        <select
          value={filters.priority}
          onChange={(e) =>
            onFilterChange({ ...filters, priority: e.target.value })
          }
          className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Priorities</option>
          <option value="P0">P0 - Blocker</option>
          <option value="P1">P1 - High</option>
          <option value="P2">P2 - Medium</option>
          <option value="P3">P3 - Low</option>
        </select>

        {/* Assignee Filter */}
        <select
          value={filters.assigneeId}
          onChange={(e) =>
            onFilterChange({ ...filters, assigneeId: e.target.value })
          }
          className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Assignees</option>
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.user.name || m.user.email}
            </option>
          ))}
        </select>

        {/* Reset Active Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
}
