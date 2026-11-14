"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Plus, AlertCircle, Loader2 } from "lucide-react";
import {
  CreateIssueDto,
  IssueDto,
  IssueType,
  Priority,
  WorkflowStatusDto,
  WorkspaceMemberDto,
} from "@workflow-ai/contracts";
import { createIssue } from "@/lib/api/issues";

interface CreateIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  projectId: string;
  statuses: WorkflowStatusDto[];
  members: WorkspaceMemberDto[];
  candidateParents?: IssueDto[];
  initialStatusId?: string;
  initialParentId?: string;
  initialType?: IssueType;
}

export function CreateIssueModal({
  isOpen,
  onClose,
  workspaceId,
  projectId,
  statuses,
  members,
  candidateParents = [],
  initialStatusId,
  initialParentId,
  initialType = "TASK",
}: CreateIssueModalProps) {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<IssueType>(initialType);
  const [priority, setPriority] = useState<Priority>("P2");
  const [statusId, setStatusId] = useState(
    initialStatusId || statuses[0]?.id || ""
  );
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [parentId, setParentId] = useState<string>(initialParentId || "");
  const [estimate, setEstimate] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setDescription("");
      setType(initialType);
      setPriority("P2");
      setStatusId(initialStatusId || statuses[0]?.id || "");
      setAssigneeId("");
      setParentId(initialParentId || "");
      setEstimate("");
      setErrorMsg(null);
    }
  }, [isOpen, initialStatusId, initialParentId, initialType, statuses]);

  // Global keyboard shortcut 'c' when modal is closed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === "c" &&
        !isOpen &&
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement
        )
      ) {
        e.preventDefault();
        // Trigger open via parent
      } else if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const createMutation = useMutation({
    mutationFn: (data: CreateIssueDto) => createIssue(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["issues", workspaceId, projectId],
      });
      onClose();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to create issue");
    },
  });

  if (!isOpen) return null;

  // Filter eligible parents: cannot be EPIC or SUBTASK (Hierarchy depth <= 2)
  const eligibleParents = candidateParents.filter(
    (p) => p.type !== "SUBTASK" && p.type !== "EPIC"
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg("Issue title is required");
      return;
    }
    if (!statusId) {
      setErrorMsg("Please select a status");
      return;
    }
    if (type === "SUBTASK" && !parentId) {
      setErrorMsg("Subtasks must specify a parent issue");
      return;
    }

    const payload: CreateIssueDto = {
      projectId,
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      priority,
      statusId,
      parentId: type === "EPIC" ? undefined : parentId || undefined,
      assigneeId: assigneeId || undefined,
      estimate: estimate ? parseInt(estimate, 10) : undefined,
    };

    createMutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 text-slate-100 space-y-4 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-issue-title"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 id="create-issue-title" className="text-base font-bold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-500" />
            <span>Create New Issue</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement user session expiration handling"
              required
              autoFocus
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Issue Type
              </label>
              <select
                value={type}
                onChange={(e) => {
                  const newType = e.target.value as IssueType;
                  setType(newType);
                  if (newType === "EPIC") setParentId("");
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
              >
                <option value="TASK">Task</option>
                <option value="BUG">Bug</option>
                <option value="STORY">Story</option>
                <option value="EPIC">Epic</option>
                <option value="SUBTASK">Subtask</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
              >
                <option value="P0">P0 - Blocker</option>
                <option value="P1">P1 - High</option>
                <option value="P2">P2 - Medium</option>
                <option value="P3">P3 - Low</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Status <span className="text-red-400">*</span>
              </label>
              <select
                value={statusId}
                onChange={(e) => setStatusId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
              >
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Assignee
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.name || m.user.email} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Conditional Parent Selector (Disabled for EPIC, Required for SUBTASK) */}
          {type !== "EPIC" && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Parent Issue {type === "SUBTASK" && <span className="text-red-400">*</span>}
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                required={type === "SUBTASK"}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
              >
                <option value="">{type === "SUBTASK" ? "Select parent issue..." : "None (Top-level)"}</option>
                {eligibleParents.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.key}] {p.title}
                  </option>
                ))}
              </select>
              {type === "SUBTASK" && (
                <p className="text-[10px] text-slate-500 mt-1">
                  Hierarchy invariant: Subtasks must attach to a Story, Task, or Bug. Epics cannot be subtasks.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Estimate (Story Points)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={estimate}
              onChange={(e) => setEstimate(e.target.value)}
              placeholder="e.g. 3"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Description (Markdown supported)
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed acceptance criteria, context, or technical specifications..."
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition resize-y font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition disabled:opacity-50"
            >
              {createMutation.isPending && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              <span>Create Issue</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
