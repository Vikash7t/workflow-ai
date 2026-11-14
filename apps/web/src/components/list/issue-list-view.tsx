"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  IssueDto,
  WorkflowStatusDto,
  WorkspaceMemberDto,
} from "@workflow-ai/contracts";
import {
  bulkUpdateStatus,
  bulkUpdateAssignee,
  bulkDeleteIssues,
} from "@/lib/api/issues";
import {
  IssueTypeBadge,
  PriorityBadge,
  CategoryPill,
} from "@/components/issues/issue-badges";
import { Trash2, Users, CheckCircle, X, Loader2 } from "lucide-react";

interface IssueListViewProps {
  workspaceId: string;
  projectId: string;
  statuses: WorkflowStatusDto[];
  issues: IssueDto[];
  members: WorkspaceMemberDto[];
  onSelectIssue: (issueId: string) => void;
}

export function IssueListView({
  workspaceId,
  projectId,
  statuses,
  issues,
  members,
  onSelectIssue,
}: IssueListViewProps) {
  const queryClient = useQueryClient();
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);
  const [isBulkPending, setIsBulkPending] = useState(false);

  const allSelected =
    issues.length > 0 && selectedIssueIds.length === issues.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIssueIds([]);
    } else {
      setSelectedIssueIds(issues.map((i) => i.id));
    }
  };

  const toggleSelectIssue = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIssueIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const bulkStatusMutation = useMutation({
    mutationFn: (newStatusId: string) => {
      setIsBulkPending(true);
      return bulkUpdateStatus(workspaceId, {
        issueIds: selectedIssueIds,
        statusId: newStatusId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["issues", workspaceId, projectId],
      });
      setSelectedIssueIds([]);
      setIsBulkPending(false);
    },
    onError: () => setIsBulkPending(false),
  });

  const bulkAssigneeMutation = useMutation({
    mutationFn: (newAssigneeId: string | null) => {
      setIsBulkPending(true);
      return bulkUpdateAssignee(workspaceId, {
        issueIds: selectedIssueIds,
        assigneeId: newAssigneeId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["issues", workspaceId, projectId],
      });
      setSelectedIssueIds([]);
      setIsBulkPending(false);
    },
    onError: () => setIsBulkPending(false),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: () => {
      setIsBulkPending(true);
      return bulkDeleteIssues(workspaceId, {
        issueIds: selectedIssueIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["issues", workspaceId, projectId],
      });
      setSelectedIssueIds([]);
      setIsBulkPending(false);
    },
    onError: () => setIsBulkPending(false),
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                  />
                </th>
                <th className="p-3 w-28">Key</th>
                <th className="p-3 w-24">Type</th>
                <th className="p-3">Title</th>
                <th className="p-3 w-36">Status</th>
                <th className="p-3 w-20">Priority</th>
                <th className="p-3 w-40">Assignee</th>
                <th className="p-3 w-20 text-right">Estimate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {issues.map((issue) => {
                const isSelected = selectedIssueIds.includes(issue.id);

                return (
                  <tr
                    key={issue.id}
                    onClick={() => onSelectIssue(issue.id)}
                    className={`cursor-pointer transition hover:bg-slate-800/50 ${
                      isSelected ? "bg-blue-600/10" : ""
                    }`}
                  >
                    <td
                      className="p-3 text-center"
                      onClick={(e) => toggleSelectIssue(issue.id, e)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                      />
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-400">
                      {issue.key}
                    </td>
                    <td className="p-3">
                      <IssueTypeBadge type={issue.type} />
                    </td>
                    <td className="p-3 font-medium text-slate-200">
                      {issue.title}
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300">
                        {issue.status && <CategoryPill category={issue.status.category} />}
                        <span>{issue.status?.name || "Unknown"}</span>
                      </span>
                    </td>
                    <td className="p-3">
                      <PriorityBadge priority={issue.priority} />
                    </td>
                    <td className="p-3 text-slate-400">
                      {issue.assignee ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[9px] text-blue-400">
                            {(issue.assignee.name || issue.assignee.email)[0].toUpperCase()}
                          </div>
                          <span className="truncate max-w-[120px]">
                            {issue.assignee.name || issue.assignee.email}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-600 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-400">
                      {issue.estimate !== null && issue.estimate !== undefined
                        ? `${issue.estimate} pts`
                        : "—"}
                    </td>
                  </tr>
                );
              })}

              {issues.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No issues found matching the criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Bulk Operations Toolbar */}
      {selectedIssueIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl animate-in slide-in-from-bottom duration-150">
          <div className="flex items-center gap-2 pr-3 border-r border-slate-800 text-xs font-semibold text-white">
            <span className="px-1.5 py-0.5 rounded-md bg-blue-600 text-white font-mono text-[10px]">
              {selectedIssueIds.length}
            </span>
            <span>selected</span>
          </div>

          {/* Bulk Status Select */}
          <select
            disabled={isBulkPending}
            onChange={(e) => {
              if (e.target.value) bulkStatusMutation.mutate(e.target.value);
            }}
            defaultValue=""
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="" disabled>
              Move Status...
            </option>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Bulk Assignee Select */}
          <select
            disabled={isBulkPending}
            onChange={(e) => {
              bulkAssigneeMutation.mutate(e.target.value || null);
            }}
            defaultValue=""
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="" disabled>
              Assign to...
            </option>
            <option value="">Unassign</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.user.name || m.user.email}
              </option>
            ))}
          </select>

          {/* Bulk Delete */}
          <button
            disabled={isBulkPending}
            onClick={() => {
              if (
                window.confirm(
                  `Are you sure you want to delete ${selectedIssueIds.length} selected issues?`
                )
              ) {
                bulkDeleteMutation.mutate();
              }
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
            title="Delete Selected"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Clear Selection */}
          <button
            onClick={() => setSelectedIssueIds([])}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition ml-1"
            title="Deselect all"
          >
            <X className="w-4 h-4" />
          </button>

          {isBulkPending && (
            <Loader2 className="w-4 h-4 animate-spin text-blue-500 ml-1" />
          )}
        </div>
      )}
    </div>
  );
}
