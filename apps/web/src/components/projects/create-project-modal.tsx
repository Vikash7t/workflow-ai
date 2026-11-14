"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, FolderPlus, AlertCircle, Loader2 } from "lucide-react";
import { CreateProjectDto } from "@workflow-ai/contracts";
import { createProject } from "@/lib/api/projects";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onProjectCreated: (projectId: string) => void;
}

export function CreateProjectModal({
  isOpen,
  onClose,
  workspaceId,
  onProjectCreated,
}: CreateProjectModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: CreateProjectDto) => createProject(workspaceId, data),
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({
        queryKey: ["projects", workspaceId],
      });
      onProjectCreated(newProject.id);
      onClose();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to create project");
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const formattedKey = key.trim().toUpperCase();
    if (!/^[A-Z0-9]{2,10}$/.test(formattedKey)) {
      setErrorMsg(
        "Project key must be 2 to 10 uppercase alphanumeric characters (e.g. ENG, PROD)"
      );
      return;
    }

    createMutation.mutate({
      name: name.trim(),
      key: formattedKey,
      description: description.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 text-slate-100 space-y-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-project-title"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 id="create-project-title" className="text-base font-bold text-white flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-blue-500" />
            <span>Create New Project</span>
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
              Project Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!key) {
                  const autoKey = e.target.value
                    .replace(/[^a-zA-Z0-9]/g, "")
                    .slice(0, 4)
                    .toUpperCase();
                  setKey(autoKey);
                }
              }}
              placeholder="e.g. Core Engineering"
              required
              autoFocus
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Project Key <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              placeholder="e.g. ENG"
              maxLength={10}
              required
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono uppercase text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Used as prefix for issue identifiers (e.g. ENG-101).
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this project scope..."
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition resize-none"
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
              <span>Create Project</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
