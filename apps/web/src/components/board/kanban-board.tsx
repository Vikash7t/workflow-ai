"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  IssueDto,
  WorkflowStatusDto,
  WorkspaceMemberDto,
} from "@workflow-ai/contracts";
import { updateIssue } from "@/lib/api/issues";
import {
  IssueTypeBadge,
  PriorityBadge,
  CategoryPill,
} from "@/components/issues/issue-badges";
import { Plus, CheckSquare, GitCommit } from "lucide-react";

interface KanbanBoardProps {
  workspaceId: string;
  projectId: string;
  statuses: WorkflowStatusDto[];
  issues: IssueDto[];
  members: WorkspaceMemberDto[];
  onSelectIssue: (issueId: string) => void;
  onQuickCreate: (statusId: string) => void;
}

export function KanbanBoard({
  workspaceId,
  projectId,
  statuses,
  issues,
  members,
  onSelectIssue,
  onQuickCreate,
}: KanbanBoardProps) {
  const queryClient = useQueryClient();
  const [draggedIssueId, setDraggedIssueId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  // Optimistic Status Mutation with Query Cancellation & Rollback
  const moveStatusMutation = useMutation({
    mutationFn: ({
      issueId,
      newStatusId,
    }: {
      issueId: string;
      newStatusId: string;
    }) => updateIssue(workspaceId, issueId, { statusId: newStatusId }),
    onMutate: async ({ issueId, newStatusId }) => {
      // 1. Cancel any outgoing refetches so they don't overwrite optimistic update
      const queryKey = ["issues", workspaceId, projectId];
      await queryClient.cancelQueries({ queryKey });

      // 2. Snapshot previous cache
      const previousData = queryClient.getQueryData<any>(queryKey);

      // 3. Optimistically update local cache
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old || !old.items) return old;
        const targetStatus = statuses.find((s) => s.id === newStatusId);
        return {
          ...old,
          items: old.items.map((item: IssueDto) =>
            item.id === issueId
              ? {
                  ...item,
                  statusId: newStatusId,
                  status: targetStatus || item.status,
                }
              : item
          ),
        };
      });

      return { previousData, queryKey };
    },
    onError: (_err, _variables, context) => {
      // Rollback to snapshot on error
      if (context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
    },
    onSettled: (_data, _error, _variables, context) => {
      // Re-sync with canonical backend state
      if (context?.queryKey) {
        queryClient.invalidateQueries({ queryKey: context.queryKey });
      }
    },
  });

  const handleDragStart = (e: React.DragEvent, issueId: string) => {
    e.dataTransfer.setData("text/plain", issueId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedIssueId(issueId);
  };

  const handleDragOver = (e: React.DragEvent, columnStatusId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumnId !== columnStatusId) {
      setDragOverColumnId(columnStatusId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, columnStatusId: string) => {
    // Clear only if leaving current column
    if (dragOverColumnId === columnStatusId) {
      setDragOverColumnId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetStatusId: string) => {
    e.preventDefault();
    setDragOverColumnId(null);
    const droppedIssueId = e.dataTransfer.getData("text/plain") || draggedIssueId;
    setDraggedIssueId(null);

    if (!droppedIssueId) return;

    const currentIssue = issues.find((i) => i.id === droppedIssueId);
    if (!currentIssue || currentIssue.statusId === targetStatusId) {
      return; // Already in target column
    }

    moveStatusMutation.mutate({
      issueId: droppedIssueId,
      newStatusId: targetStatusId,
    });
  };

  return (
    <div className="flex-1 flex gap-4 overflow-x-auto pb-6 pt-2 select-none">
      {statuses.map((status) => {
        const columnIssues = issues.filter((i) => i.statusId === status.id);
        const isDragOver = dragOverColumnId === status.id;

        return (
          <div
            key={status.id}
            onDragOver={(e) => handleDragOver(e, status.id)}
            onDragLeave={(e) => handleDragLeave(e, status.id)}
            onDrop={(e) => handleDrop(e, status.id)}
            className={`w-80 shrink-0 flex flex-col rounded-2xl border transition-colors duration-150 ${
              isDragOver
                ? "border-blue-500 bg-blue-950/20 shadow-lg shadow-blue-500/5"
                : "border-slate-800/80 bg-slate-900/40"
            }`}
          >
            {/* Column Header */}
            <div className="p-3.5 flex items-center justify-between border-b border-slate-800/60">
              <div className="flex items-center gap-2">
                <CategoryPill category={status.category} />
                <h3 className="font-semibold text-xs text-slate-200 tracking-tight">
                  {status.name}
                </h3>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-slate-800 text-slate-400">
                  {columnIssues.length}
                </span>
              </div>

              <button
                onClick={() => onQuickCreate(status.id)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title={`Add issue to ${status.name}`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Column Cards Container */}
            <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-210px)] min-h-[160px]">
              {columnIssues.map((issue) => {
                const isDragging = draggedIssueId === issue.id;

                return (
                  <div
                    key={issue.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, issue.id)}
                    onClick={() => onSelectIssue(issue.id)}
                    className={`p-3 rounded-xl border border-slate-800 bg-slate-900/90 hover:border-slate-700 shadow-sm cursor-grab active:cursor-grabbing transition duration-150 space-y-2 ${
                      isDragging ? "opacity-30 scale-95 border-dashed" : "hover:bg-slate-850"
                    }`}
                  >
                    {/* Top Row: Key + Type + Priority */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-slate-400">
                          {issue.key}
                        </span>
                        <IssueTypeBadge type={issue.type} />
                      </div>
                      <PriorityBadge priority={issue.priority} />
                    </div>

                    {/* Title */}
                    <p className="text-xs font-medium text-slate-200 line-clamp-2 leading-snug">
                      {issue.title}
                    </p>

                    {/* Bottom Metadata: Subtasks + Estimate + Assignee */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px] text-slate-500">
                      <div className="flex items-center gap-2">
                        {issue.subtaskCount && issue.subtaskCount > 0 ? (
                          <div className="flex items-center gap-1 text-cyan-400 font-mono">
                            <GitCommit className="w-3 h-3" />
                            <span>{issue.subtaskCount}</span>
                          </div>
                        ) : null}

                        {issue.estimate !== null && issue.estimate !== undefined && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                            {issue.estimate} pts
                          </span>
                        )}
                      </div>

                      {issue.assignee ? (
                        <div
                          className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[9px] text-blue-400"
                          title={issue.assignee.name || issue.assignee.email}
                        >
                          {(issue.assignee.name || issue.assignee.email)[0].toUpperCase()}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-600">Unassigned</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {columnIssues.length === 0 && (
                <div className="h-28 rounded-xl border border-dashed border-slate-800/60 flex items-center justify-center text-[11px] text-slate-500">
                  Drop tickets here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
