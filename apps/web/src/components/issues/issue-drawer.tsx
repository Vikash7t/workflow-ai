"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import {
  X,
  Trash2,
  GitCommit,
  Layers,
  Edit2,
  Check,
  Plus,
  Loader2,
  AlertTriangle,
  MessageSquare,
  Link as LinkIcon,
  History,
  Send,
  ShieldAlert,
} from "lucide-react";
import {
  IssueDto,
  Priority,
  WorkflowStatusDto,
  WorkspaceMemberDto,
  UpdateIssueDto,
  CommentDto,
  SprintDto,
  ActivityLogDto,
} from "@workflow-ai/contracts";
import {
  getIssue,
  updateIssue,
  deleteIssue,
  listIssues,
  createIssue,
} from "@/lib/api/issues";
import {
  listComments,
  createComment,
  deleteComment,
} from "@/lib/api/comments";
import {
  listDependencies,
  addDependency,
  removeDependency,
} from "@/lib/api/dependencies";
import { listSprints } from "@/lib/api/sprints";
import { getIssueActivities } from "@/lib/api/activities";
import { SafeMarkdown } from "@/components/ui/markdown";
import {
  IssueTypeBadge,
  PriorityBadge,
} from "@/components/issues/issue-badges";

interface IssueDrawerProps {
  issueId: string | null;
  onClose: () => void;
  workspaceId: string;
  projectId: string;
  statuses: WorkflowStatusDto[];
  members: WorkspaceMemberDto[];
  onNavigateToIssue?: (id: string) => void;
}

export function IssueDrawer({
  issueId,
  onClose,
  workspaceId,
  projectId,
  statuses,
  members,
  onNavigateToIssue,
}: IssueDrawerProps) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const [activeTab, setActiveTab] = useState<"details" | "comments" | "deps" | "activity">("details");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState("");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newCommentBody, setNewCommentBody] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Dependency add state
  const [targetIssueId, setTargetIssueId] = useState("");
  const [depError, setDepError] = useState<string | null>(null);

  // 1. Lazy fetch full issue DTO
  const { data: issue, isLoading } = useQuery<IssueDto>({
    queryKey: ["issue", workspaceId, issueId],
    queryFn: () => getIssue(workspaceId, issueId!),
    enabled: !!issueId,
  });

  // 2. Fetch subtasks
  const { data: subtasksResponse } = useQuery({
    queryKey: ["issues", workspaceId, projectId, { parentId: issueId }],
    queryFn: () => listIssues(workspaceId, { projectId, parentId: issueId! }),
    enabled: !!issueId && issue?.type !== "SUBTASK",
  });
  const subtasks = subtasksResponse?.items || [];
  const completedSubtasks = subtasks.filter(
    (s) => s.status?.category === "COMPLETED"
  ).length;

  // 3. Fetch Sprints for project
  const { data: sprints = [] } = useQuery<SprintDto[]>({
    queryKey: ["sprints", workspaceId, projectId],
    queryFn: () => listSprints(workspaceId, projectId),
    enabled: !!workspaceId && !!projectId,
  });

  // 4. Fetch Comments
  const { data: comments = [], isLoading: isLoadingComments } = useQuery<CommentDto[]>({
    queryKey: ["comments", workspaceId, issueId],
    queryFn: () => listComments(workspaceId, issueId!),
    enabled: !!issueId && activeTab === "comments",
  });

  // 5. Fetch Dependencies
  const { data: depsData, isLoading: isLoadingDeps } = useQuery({
    queryKey: ["dependencies", workspaceId, issueId],
    queryFn: () => listDependencies(workspaceId, issueId!),
    enabled: !!issueId && activeTab === "deps",
  });

  // 6. Fetch Activities
  const { data: activities = [], isLoading: isLoadingActivities } = useQuery<ActivityLogDto[]>({
    queryKey: ["activities", workspaceId, issueId],
    queryFn: () => getIssueActivities(workspaceId, issueId!),
    enabled: !!issueId && activeTab === "activity",
  });

  // 7. Candidate issues for dependencies (other issues in this project)
  const { data: projectIssuesResp } = useQuery({
    queryKey: ["issues", workspaceId, projectId, "candidates"],
    queryFn: () => listIssues(workspaceId, { projectId, pageSize: 100 }),
    enabled: !!issueId && activeTab === "deps",
  });
  const candidateTargetIssues = (projectIssuesResp?.items || []).filter(
    (i) => i.id !== issueId
  );

  // Mutations
  const updateMutation = useMutation({
    mutationFn: (data: UpdateIssueDto) =>
      updateIssue(workspaceId, issueId!, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(["issue", workspaceId, issueId], updated);
      queryClient.invalidateQueries({
        queryKey: ["issues", workspaceId, projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["activities", workspaceId, issueId],
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

  const commentMutation = useMutation({
    mutationFn: (body: string) => createComment(workspaceId, issueId!, body),
    onSuccess: () => {
      setNewCommentBody("");
      queryClient.invalidateQueries({
        queryKey: ["comments", workspaceId, issueId],
      });
      queryClient.invalidateQueries({
        queryKey: ["activities", workspaceId, issueId],
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => deleteComment(workspaceId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["comments", workspaceId, issueId],
      });
    },
  });

  const addDepMutation = useMutation({
    mutationFn: (targetId: string) =>
      addDependency(workspaceId, issueId!, targetId, "BLOCKS"),
    onSuccess: () => {
      setTargetIssueId("");
      setDepError(null);
      queryClient.invalidateQueries({
        queryKey: ["dependencies", workspaceId, issueId],
      });
      queryClient.invalidateQueries({
        queryKey: ["activities", workspaceId, issueId],
      });
    },
    onError: (err: any) => {
      setDepError(err.message || "Failed to add dependency");
    },
  });

  const removeDepMutation = useMutation({
    mutationFn: (depId: string) => removeDependency(workspaceId, depId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["dependencies", workspaceId, issueId],
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

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentBody.trim()) return;
    commentMutation.mutate(newCommentBody.trim());
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

              {/* Sprint Assignment */}
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Sprint
                </label>
                <select
                  value={issue.sprintId || ""}
                  onChange={(e) =>
                    updateMutation.mutate({
                      sprintId: e.target.value || null,
                    })
                  }
                  className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Backlog</option>
                  {sprints.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-800 pb-2 text-xs">
              <button
                onClick={() => setActiveTab("details")}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  activeTab === "details"
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Details & Subtasks
              </button>
              <button
                onClick={() => setActiveTab("comments")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                  activeTab === "comments"
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Comments</span>
                {comments.length > 0 && (
                  <span className="font-mono text-[10px] text-blue-400">
                    ({comments.length})
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("deps")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                  activeTab === "deps"
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Dependencies</span>
              </button>
              <button
                onClick={() => setActiveTab("activity")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                  activeTab === "activity"
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Audit Trail</span>
              </button>
            </div>

            {/* Tab 1: Details & Subtasks */}
            {activeTab === "details" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Description */}
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

                {/* Subtasks Section */}
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

            {/* Tab 2: Comments */}
            {activeTab === "comments" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* Comments List */}
                <div className="space-y-3">
                  {isLoadingComments ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto text-blue-500" />
                    </div>
                  ) : comments.length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-3 text-center border border-dashed border-slate-800 rounded-xl">
                      No comments yet. Start the discussion below.
                    </p>
                  ) : (
                    comments.map((c) => {
                      const isAuthor = session?.user?.id === c.userId;
                      return (
                        <div
                          key={c.id}
                          className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[9px] text-blue-400">
                                {(c.user.name || c.user.email)[0].toUpperCase()}
                              </div>
                              <span className="font-semibold text-slate-200">
                                {c.user.name || c.user.email}
                              </span>
                              <span className="text-slate-500 font-mono text-[10px]">
                                {new Date(c.createdAt).toLocaleDateString()}
                              </span>
                            </div>

                            {isAuthor && (
                              <button
                                onClick={() => deleteCommentMutation.mutate(c.id)}
                                className="text-slate-500 hover:text-red-400 transition p-1"
                                title="Delete comment"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          <div className="text-slate-200 pl-7">
                            <SafeMarkdown content={c.body} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add Comment Input */}
                <form onSubmit={handleAddComment} className="space-y-2 pt-2">
                  <textarea
                    rows={3}
                    value={newCommentBody}
                    onChange={(e) => setNewCommentBody(e.target.value)}
                    placeholder="Write a comment (Markdown supported)..."
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition font-mono resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={commentMutation.isPending || !newCommentBody.trim()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition disabled:opacity-50"
                    >
                      {commentMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>Post Comment</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Tab 3: Dependencies */}
            {activeTab === "deps" && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* Error Banner */}
                {depError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{depError}</span>
                  </div>
                )}

                {/* Blocked By List */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-300">
                    Blocked By (Waiting on these issues)
                  </h3>
                  {depsData?.blockedBy?.length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-2 border border-dashed border-slate-800 rounded-lg">
                      No blockers. This issue is ready to progress.
                    </p>
                  ) : (
                    depsData?.blockedBy.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs"
                      >
                        <div
                          onClick={() => onNavigateToIssue?.(d.issue.id)}
                          className="flex items-center gap-2 cursor-pointer hover:text-blue-400 transition"
                        >
                          <span className="font-mono text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                            {d.issue.key}
                          </span>
                          <span className="text-slate-200">{d.issue.title}</span>
                        </div>
                        <button
                          onClick={() => removeDepMutation.mutate(d.id)}
                          className="text-slate-500 hover:text-red-400 transition p-1"
                          title="Remove dependency"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Blocking List */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-300">
                    Blocks (These issues are waiting on this ticket)
                  </h3>
                  {depsData?.blocking?.length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-2 border border-dashed border-slate-800 rounded-lg">
                      This issue does not block any other tickets.
                    </p>
                  ) : (
                    depsData?.blocking.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs"
                      >
                        <div
                          onClick={() => onNavigateToIssue?.(d.issue.id)}
                          className="flex items-center gap-2 cursor-pointer hover:text-blue-400 transition"
                        >
                          <span className="font-mono text-[10px] font-bold text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">
                            {d.issue.key}
                          </span>
                          <span className="text-slate-200">{d.issue.title}</span>
                        </div>
                        <button
                          onClick={() => removeDepMutation.mutate(d.id)}
                          className="text-slate-500 hover:text-red-400 transition p-1"
                          title="Remove dependency"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Blocker Form */}
                <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2">
                  <span className="text-xs font-semibold text-slate-300 block">
                    + Add Blocker Ticket
                  </span>
                  <div className="flex items-center gap-2">
                    <select
                      value={targetIssueId}
                      onChange={(e) => setTargetIssueId(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Select ticket that blocks this issue...</option>
                      {candidateTargetIssues.map((cand) => (
                        <option key={cand.id} value={cand.id}>
                          [{cand.key}] {cand.title}
                        </option>
                      ))}
                    </select>
                    <button
                      disabled={addDepMutation.isPending || !targetIssueId}
                      onClick={() => addDepMutation.mutate(targetIssueId)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition disabled:opacity-50"
                    >
                      {addDepMutation.isPending ? "Adding..." : "Add Blocker"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Activity Audit Trail */}
            {activeTab === "activity" && (
              <div className="space-y-3 animate-in fade-in duration-150">
                {isLoadingActivities ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto text-blue-500" />
                  </div>
                ) : activities.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 text-center border border-dashed border-slate-800 rounded-xl">
                    No activity recorded yet.
                  </p>
                ) : (
                  activities.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/60 text-xs"
                    >
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-300">
                            {a.action.replace("_", " ")}
                          </span>
                          <span className="text-slate-500 font-mono text-[10px]">
                            {new Date(a.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {a.metadata && (
                          <p className="text-[11px] text-slate-400 font-mono">
                            {JSON.stringify(a.metadata)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
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
