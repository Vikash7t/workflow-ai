"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Timer,
  CheckCircle,
  Play,
  ArrowRight,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import { SprintDto } from "@workflow-ai/contracts";
import { updateSprint, completeSprint } from "@/lib/api/sprints";

interface ActiveSprintBannerProps {
  workspaceId: string;
  projectId: string;
  sprints: SprintDto[];
}

export function ActiveSprintBanner({
  workspaceId,
  projectId,
  sprints,
}: ActiveSprintBannerProps) {
  const queryClient = useQueryClient();
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [rolloverTargetId, setRolloverTargetId] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeSprint = sprints.find((s) => s.status === "ACTIVE");
  const plannedSprints = sprints.filter((s) => s.status === "PLANNED");

  const startSprintMutation = useMutation({
    mutationFn: (sprintId: string) =>
      updateSprint(workspaceId, sprintId, { status: "ACTIVE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["sprints", workspaceId, projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["issues", workspaceId, projectId],
      });
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to start sprint");
    },
  });

  const completeMutation = useMutation({
    mutationFn: () =>
      completeSprint(workspaceId, activeSprint!.id, {
        targetSprintId: rolloverTargetId || null,
      }),
    onSuccess: () => {
      setIsCompleteOpen(false);
      setRolloverTargetId("");
      queryClient.invalidateQueries({
        queryKey: ["sprints", workspaceId, projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["issues", workspaceId, projectId],
      });
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to complete sprint");
    },
  });

  if (!activeSprint && plannedSprints.length === 0) {
    return null;
  }

  // If no active sprint, show prompt to activate earliest planned sprint
  if (!activeSprint) {
    const nextSprint = plannedSprints[0];
    return (
      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-slate-400" />
          <span className="text-slate-300">
            Next planned sprint: <strong className="text-white">{nextSprint.name}</strong>
          </span>
          <span className="font-mono text-[10px] text-slate-500">
            ({nextSprint.issueCount || 0} issues, {nextSprint.totalPoints || 0} pts)
          </span>
        </div>

        <button
          disabled={startSprintMutation.isPending}
          onClick={() => startSprintMutation.mutate(nextSprint.id)}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition disabled:opacity-50"
        >
          {startSprintMutation.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Play className="w-3 h-3 fill-current" />
          )}
          <span>Start Sprint</span>
        </button>
      </div>
    );
  }

  const completionPercent =
    activeSprint.totalPoints && activeSprint.totalPoints > 0
      ? Math.round(
          ((activeSprint.completedPoints || 0) / activeSprint.totalPoints) * 100
        )
      : 0;

  return (
    <>
      <div className="p-3.5 rounded-2xl bg-blue-950/20 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase">
              Active Sprint
            </span>
            <span className="font-bold text-white text-sm">
              {activeSprint.name}
            </span>
            {activeSprint.endDate && (
              <span className="text-slate-400 font-mono text-[11px]">
                Ends {new Date(activeSprint.endDate).toLocaleDateString()}
              </span>
            )}
          </div>
          {activeSprint.goal && (
            <p className="text-[11px] text-slate-400 italic">
              Goal: {activeSprint.goal}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Points Progress */}
          <div className="flex items-center gap-2 min-w-[140px]">
            <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-500 h-full transition-all duration-300"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <span className="font-mono text-[11px] text-blue-300 whitespace-nowrap">
              {activeSprint.completedPoints || 0}/{activeSprint.totalPoints || 0} pts
            </span>
          </div>

          <button
            onClick={() => setIsCompleteOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Complete Sprint</span>
          </button>
        </div>
      </div>

      {/* Complete Sprint Modal */}
      {isCompleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Complete {activeSprint.name}</span>
              </h2>
              <button
                onClick={() => setIsCompleteOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition"
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

            <div className="space-y-3 text-xs text-slate-300">
              <p>
                Completing this sprint will calculate final velocity and roll over any uncompleted issues.
              </p>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Story Points:</span>
                  <span className="font-mono text-white">{activeSprint.totalPoints || 0} pts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Completed Points:</span>
                  <span className="font-mono text-emerald-400">{activeSprint.completedPoints || 0} pts</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Rollover uncompleted tickets to:
                </label>
                <select
                  value={rolloverTargetId}
                  onChange={(e) => setRolloverTargetId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="">Move to Backlog (sprintId = null)</option>
                  {plannedSprints.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Planned Sprint)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCompleteOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-800 text-xs text-slate-300 hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={completeMutation.isPending}
                onClick={() => completeMutation.mutate()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition disabled:opacity-50"
              >
                {completeMutation.isPending && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>Confirm & Complete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
