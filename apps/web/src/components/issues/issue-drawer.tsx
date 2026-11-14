"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Trash2,
  GitCommit,
  CheckCircle2,
  Calendar,
  User,
  Hash,
  Clock,
  Layers,
  Edit2,
  Check,
  Plus,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  IssueDto,
  IssueType,
  Priority,
  WorkflowStatusDto,
  WorkspaceMemberDto,
  UpdateIssueDto,
} from "@workflow-ai/contracts";
import {
  getIssue,
  updateIssue,
  deleteIssue,
  listIssues,
  createIssue,
} from "@/lib/api/issues";
import { SafeMarkdown } from "@/components/ui/markdown";
import {
  IssueTypeBadge,
  PriorityBadge,
  CategoryPill,
} from "@/components/issues/issue-badges";

interface IssueDrawerProps {
  issueId: string | null;
  onClose: () => void;
  workspaceId: string;
  projectId: string;
  statuses: WorkflowStatusDto[];
  members: WorkspaceMemberDto[];
}

export function IssueDrawer({
  issueId,
  onClose,
  workspaceId,
  projectId,
  statuses,
  members,
}: IssueDrawerProps) {
  const queryClient = useQueryClient();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState("");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Lazy fetch full issue DTO
  const { data: issue, isLoading } = useQuery<IssueDto>({
    queryKey: ["issue", workspaceId, issueId],
    queryFn: () => getIssue(workspaceId, issueId!),
    enabled: !!issueId,
  });

  // Fetch subtasks of this issue
  const { data: subtasksResponse } = useQuery({
    queryKey: ["issues", workspaceId, projectId, { parentId: issueId }],
    queryFn: () => listIssues(workspaceId, { projectId, parentId: issueId! }),
    enabled: !!issueId && issue?.type !== "SUBTASK",
  });

  const subtasks = subtasksResponse?.items || [];
  const completedSubtasks = subtasks.filter(
    (s) => s.status?.category === "COMPLETED"
  ).length;

  const updateMutation = useMutation({
    mutationFn: (data: UpdateIssueDto) =>
      updateIssue(workspaceId, issueId!, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(["issue", workspaceId, issueId], updated);
      queryClient.invalidateQueries({
        queryKey: ["issues", workspaceId, projectId],
      });
    },
  });

  const createSubtaskMutation = useMutation({
    mutationFn: (subtaskTitle: string) => {
      const defaultStatus =
        statuses.find((s) => s.category === "UNSTARTED" || s.category === "BACKLOG") ||
        statuses[0];
      return createIssue(workspaceId, {
        projectId,
        title: subtaskTitle,
        type: "SUBTASK",
        priority: "P2",
        statusId: defaultStatus.id,
        parentId: issueId!,
      });
    },
    onSuccess: () => {
      setNewSubtaskTitle("");
      queryClient.invalidateQueries({
        queryKey: ["issues", workspaceId, projectId],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteIssue(workspaceId, issueId!),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["issues", workspaceId, projectId],
      });
      onClose();
    },
  });

  if (!issueId) return null;

  const handleTitleSubmit = () => {
    if (titleValue.trim() && titleValue !== issue?.title) {
      updateMutation.mutate({ title: titleValue.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleDescSubmit = () => {
    if (descValue !== issue?.description) {
      updateMutation.mutate({ description: descValue.trim() || null });
    }
    setIsEditingDesc(false);
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    createSubtaskMutation.mutate(newSubtaskTitle.trim());
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="absolute inset-y-0 right-0 max-w-2xl w-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col z-10 overscroll-contain animate-in slide-in-from-right duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        {/* Top Header Bar */}
        <div className="h-14 px-6 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
              {issue?.key || "..."}
            </span>
            {issue && <IssueTypeBadge type={issue.type} />}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
              title="Delete Issue"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              title="Close Drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        {isLoading || !issue ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Title Section (Inline Edit) */}
            <div>
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={titleValue}
                    onChange={(e) => setTitleValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleTitleSubmit();
                      if (e.key === "Escape") setIsEditingTitle(false);
                    }}
                    autoFocus
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-blue-500 text-sm font-semibold text-white focus:outline-none"
                  />
                  <button
                    onClick={handleTitleSubmit}
                    className="p-1.5 rounded bg-blue-600 text-white hover:bg-blue-500 transition"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => {
                    setTitleValue(issue.title);
                    setIsEditingTitle(true);
                  }}
                  className="group flex items-start justify-between cursor-pointer rounded-lg p-1.5 -m-1.5 hover:bg-slate-800/60 transition"
                >
                  <h1
                    id="drawer-title"
                    className="text-lg font-bold text-white tracking-tight"
                  >
                    {issue.title}
                  </h1>
                  <Edit2 className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition mt-1 shrink-0" />
                </div>
              )}
            </div>

            {/* Property Controls Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              {/* Status */}
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Status
                </label>
                <select
                  value={issue.statusId}
                  onChange={(e) =>
                    updateMutation.mutate({ statusId: e.target.value })
                  }
                  className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  {statuses.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Priority
                </label>
                <select
                  value={issue.priority}
                  onChange={(e) =>
                    updateMutation.mutate({
                      priority: e.target.value as Priority,
                    })
                  }
                  className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="P0">P0 - Blocker</option>
                  <option value="P1">P1 - High</option>
                  <option value="P2">P2 - Medium</option>
                  <option value="P3">P3 - Low</option>
                </select>
              </div>

              {/* Assignee */}
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Assignee
                </label>
                <select
                  value={issue.assigneeId || ""}
                  onChange={(e) =>
                    updateMutation.mutate({
                      assigneeId: e.target.value || null,
                    })
                  }
                  className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user.name || m.user.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Estimate */}
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Estimate
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={issue.estimate ?? ""}
                  onBlur={(e) => {
                    const val = e.target.value ? parseInt(e.target.value, 10) : null;
                    if (val !== issue.estimate) {
                      updateMutation.mutate({ estimate: val });
                    }
                  }}
                  placeholder="Points"
                  className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Description Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  Description
                </span>
                {!isEditingDesc && (
                  <button
                    onClick={() => {
                      setDescValue(issue.description || "");
                      setIsEditingDesc(true);
                    }}
                    className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              {isEditingDesc ? (
                <div className="space-y-2">
                  <textarea
                    rows={6}
                    value={descValue}
                    onChange={(e) => setDescValue(e.target.value)}
                    className="w-full p-3 rounded-lg bg-slate-950 border border-blue-500 text-xs font-mono text-white focus:outline-none resize-y"
                    placeholder="Write detailed markdown description..."
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setIsEditingDesc(false)}
                      className="px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-400 hover:bg-slate-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDescSubmit}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition"
                    >
                      Save Description
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 min-h-[80px]">
                  <SafeMarkdown content={issue.description} />
                </div>
              )}
            </div>

            {/* Subtasks Section (Depth <= 2 Guard: Hidden if active issue is SUBTASK) */}
            {issue.type !== "SUBTASK" && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GitCommit className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-semibold text-slate-200">
                      Subtasks
                    </span>
                    {subtasks.length > 0 && (
                      <span className="text-[11px] font-mono text-slate-400">
                        ({completedSubtasks}/{subtasks.length})
                      </span>
                    )}
                  </div>
                </div>

                {/* Subtask Progress Bar */}
                {subtasks.length > 0 && (
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{
                        width: `${(completedSubtasks / subtasks.length) * 100}%`,
                      }}
                    />
                  </div>
                )}

                {/* Subtask List */}
                <div className="space-y-1.5">
                  {subtasks.map((st) => (
                    <div
                      key={st.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-950/50 border border-slate-800/60 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-cyan-400">
                          {st.key}
                        </span>
                        <span className="text-slate-200">{st.title}</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                        {st.status?.name || "Pending"}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Quick Add Subtask Input */}
                <form onSubmit={handleAddSubtask} className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="+ Add a subtask (press Enter)..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  />
                  <button
                    type="submit"
                    disabled={createSubtaskMutation.isPending || !newSubtaskTitle.trim()}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 transition disabled:opacity-40"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-100">
            <div className="max-w-sm w-full p-5 rounded-2xl bg-slate-900 border border-red-500/30 space-y-4 shadow-2xl">
              <div className="flex items-center gap-3 text-red-400 font-semibold text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>Delete Issue {issue?.key}?</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                This will delete the issue and any attached subtasks. This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-300 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition disabled:opacity-50"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
