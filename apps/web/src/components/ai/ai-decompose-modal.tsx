"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  Layers,
  ArrowLeft,
  Check,
  Calendar,
  Hash,
} from "lucide-react";
import {
  SprintDto,
  DecomposeTaskItemDto,
  AiActionDto,
  IssueType,
  Priority,
} from "@workflow-ai/contracts";
import { decomposeTasks, commitAiAction } from "@/lib/api/ai";
import { IssueTypeBadge, PriorityBadge } from "@/components/issues/issue-badges";

interface AiDecomposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  projectId: string;
  sprints?: SprintDto[];
}

export function AiDecomposeModal({
  isOpen,
  onClose,
  workspaceId,
  projectId,
  sprints = [],
}: AiDecomposeModalProps) {
  const queryClient = useQueryClient();

  // Step 1: Input / Step 2: Review / Step 3: Success
  const [step, setStep] = useState<"input" | "review" | "success">("input");
  const [rawText, setRawText] = useState("");
  const [selectedSprintId, setSelectedSprintId] = useState<string>("");
  const [currentAction, setCurrentAction] = useState<AiActionDto | null>(null);
  const [reviewedItems, setReviewedItems] = useState<DecomposeTaskItemDto[]>([]);
  const [createdSummary, setCreatedSummary] = useState<{
    createdCount: number;
    epicKey: string;
    issueKeys: string[];
  } | null>(null);

  const resetState = () => {
    setStep("input");
    setRawText("");
    setSelectedSprintId("");
    setCurrentAction(null);
    setReviewedItems([]);
    setCreatedSummary(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // 1. Decompose Mutation
  const decomposeMutation = useMutation({
    mutationFn: () =>
      decomposeTasks(workspaceId, {
        projectId,
        rawText,
        sprintId: selectedSprintId || undefined,
      }),
    onSuccess: (action) => {
      setCurrentAction(action);
      setReviewedItems(action.plan.items || []);
      setStep("review");
    },
  });

  // 2. Commit Mutation
  const commitMutation = useMutation({
    mutationFn: () =>
      commitAiAction(workspaceId, currentAction!.id, {
        items: reviewedItems,
        sprintId: selectedSprintId || undefined,
      }),
    onSuccess: (result) => {
      setCreatedSummary(result);
      setStep("success");
      queryClient.invalidateQueries({ queryKey: ["issues", workspaceId, projectId] });
      queryClient.invalidateQueries({ queryKey: ["activities", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["projects", workspaceId] });
    },
  });

  // Handlers for modifying reviewed items
  const handleItemChange = (
    index: number,
    field: keyof DecomposeTaskItemDto,
    value: any
  ) => {
    setReviewedItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setReviewedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddItem = () => {
    setReviewedItems((prev) => [
      ...prev,
      {
        title: "New Task Item",
        type: "TASK",
        priority: "P2",
        estimate: 3,
        description: "",
        acceptanceCriteria: ["Meets acceptance criteria definition"],
      },
    ]);
  };

  const handleAddCriteria = (itemIndex: number) => {
    setReviewedItems((prev) => {
      const copy = [...prev];
      const criteria = copy[itemIndex].acceptanceCriteria || [];
      copy[itemIndex] = {
        ...copy[itemIndex],
        acceptanceCriteria: [...criteria, "New verification criterion"],
      };
      return copy;
    });
  };

  const handleRemoveCriteria = (itemIndex: number, critIndex: number) => {
    setReviewedItems((prev) => {
      const copy = [...prev];
      const criteria = copy[itemIndex].acceptanceCriteria || [];
      copy[itemIndex] = {
        ...copy[itemIndex],
        acceptanceCriteria: criteria.filter((_, i) => i !== critIndex),
      };
      return copy;
    });
  };

  const handleCriteriaChange = (
    itemIndex: number,
    critIndex: number,
    text: string
  ) => {
    setReviewedItems((prev) => {
      const copy = [...prev];
      const criteria = [...(copy[itemIndex].acceptanceCriteria || [])];
      criteria[critIndex] = text;
      copy[itemIndex] = {
        ...copy[itemIndex],
        acceptanceCriteria: criteria,
      };
      return copy;
    });
  };

  if (!isOpen) return null;

  const totalPoints = reviewedItems.reduce((acc, item) => acc + (item.estimate || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>AI Task Decomposition</span>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Human-in-the-Loop
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Transform raw product notes into structured Epics, Stories & Acceptance Criteria.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* STEP 1: INPUT */}
          {step === "input" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Raw Product Requirements or Meeting Notes
                </label>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste user stories, meeting notes, customer feedback, or technical requirements here (min 10 characters)..."
                  rows={8}
                  className="w-full px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition resize-none leading-relaxed font-mono"
                />
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                  <span>Character count: {rawText.length} / 10,000</span>
                  {rawText.length > 0 && rawText.length < 10 && (
                    <span className="text-amber-400">Requires at least 10 characters</span>
                  )}
                </div>
              </div>

              {/* Target Sprint Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  <span>Target Destination</span>
                </label>
                <select
                  value={selectedSprintId}
                  onChange={(e) => setSelectedSprintId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="">Backlog (No Sprint)</option>
                  {sprints.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.status})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Template Prompts */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-400">
                  Try an example:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setRawText(
                        "We need to implement Multi-Factor Authentication (MFA) via TOTP authenticator apps. Users should be able to scan a QR code, verify a 6-digit passcode, and generate emergency recovery backup codes. Require step-up MFA challenge on critical settings changes."
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-[11px] text-slate-300 border border-slate-700/60 transition"
                  >
                    🔐 MFA with TOTP & Backup Codes
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setRawText(
                        "Build Slack and Discord webhooks integration. Allow team leads to configure incoming webhooks so when issues are created, assigned, or closed, rich notifications are dispatched with links back to the board."
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-[11px] text-slate-300 border border-slate-700/60 transition"
                  >
                    💬 Slack & Discord Webhooks Integration
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setRawText(
                        "Refactor the issue dependency DAG cycle detection to run inside a PostgreSQL recursive CTE. Handle transitive dependency depth limits and surface human-readable blocker alerts on the board cards."
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-[11px] text-slate-300 border border-slate-700/60 transition"
                  >
                    ⚡ Issue DAG Cycle Detection Refactor
                  </button>
                </div>
              </div>

              {decomposeMutation.isError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 flex items-center gap-2 text-red-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>
                    {(decomposeMutation.error as Error)?.message ||
                      "Failed to decompose requirements."}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: REVIEW (HUMAN-IN-THE-LOOP APPROVAL) */}
          {step === "review" && currentAction && (
            <div className="space-y-4">
              {/* Epic Summary Card */}
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      PROPOSED EPIC
                    </span>
                    <h3 className="text-sm font-bold text-white">
                      {currentAction.plan.epicTitle}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-purple-400" />
                      <span>{reviewedItems.length} items</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-semibold text-slate-200">
                      <Hash className="w-3.5 h-3.5 text-blue-400" />
                      <span>{totalPoints} Story Points</span>
                    </span>
                  </div>
                </div>
                {currentAction.plan.epicDescription && (
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {currentAction.plan.epicDescription}
                  </p>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">
                    Review & Edit Items Before Creation
                  </span>
                  <button
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Task</span>
                  </button>
                </div>

                {reviewedItems.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    No items in plan. Click "+ Add Task" to create items.
                  </div>
                ) : (
                  reviewedItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition space-y-3"
                    >
                      {/* Item Top Row */}
                      <div className="flex items-start gap-2.5">
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) =>
                              handleItemChange(idx, "title", e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-purple-500 transition"
                            placeholder="Task title..."
                          />

                          {/* Controls Row */}
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Type Dropdown */}
                            <select
                              value={item.type}
                              onChange={(e) =>
                                handleItemChange(
                                  idx,
                                  "type",
                                  e.target.value as IssueType
                                )
                              }
                              className="px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] text-slate-300 focus:outline-none focus:border-purple-500"
                            >
                              <option value="STORY">STORY</option>
                              <option value="TASK">TASK</option>
                              <option value="BUG">BUG</option>
                            </select>

                            {/* Priority Dropdown */}
                            <select
                              value={item.priority}
                              onChange={(e) =>
                                handleItemChange(
                                  idx,
                                  "priority",
                                  e.target.value as Priority
                                )
                              }
                              className="px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] text-slate-300 focus:outline-none focus:border-purple-500"
                            >
                              <option value="P0">P0 (Critical)</option>
                              <option value="P1">P1 (High)</option>
                              <option value="P2">P2 (Medium)</option>
                              <option value="P3">P3 (Low)</option>
                            </select>

                            {/* Estimate Input */}
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                              <span>Points:</span>
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={item.estimate || ""}
                                onChange={(e) =>
                                  handleItemChange(
                                    idx,
                                    "estimate",
                                    e.target.value
                                      ? parseInt(e.target.value, 10)
                                      : undefined
                                  )
                                }
                                className="w-12 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-white text-center focus:outline-none focus:border-purple-500"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Remove item button */}
                        <button
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-900 transition"
                          title="Delete item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Acceptance Criteria Checklist */}
                      <div className="pl-2 border-l-2 border-purple-500/30 space-y-1.5">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Acceptance Criteria
                        </span>
                        {(item.acceptanceCriteria || []).map((crit, cIdx) => (
                          <div
                            key={cIdx}
                            className="flex items-center gap-2 text-xs"
                          >
                            <span className="text-slate-500 text-[10px]">•</span>
                            <input
                              type="text"
                              value={crit}
                              onChange={(e) =>
                                handleCriteriaChange(idx, cIdx, e.target.value)
                              }
                              className="flex-1 px-2 py-0.5 rounded bg-slate-900/60 border border-slate-800 text-[11px] text-slate-200 focus:outline-none focus:border-purple-500 transition"
                            />
                            <button
                              onClick={() => handleRemoveCriteria(idx, cIdx)}
                              className="text-slate-500 hover:text-red-400 transition"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => handleAddCriteria(idx)}
                          className="text-[11px] text-purple-400 hover:text-purple-300 font-medium inline-flex items-center gap-1 transition pt-0.5"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add criterion</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {commitMutation.isError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 flex items-center gap-2 text-red-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>
                    {(commitMutation.error as Error)?.message ||
                      "Failed to commit AI action."}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: SUCCESS */}
          {step === "success" && createdSummary && (
            <div className="py-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">
                  Successfully Created {createdSummary.createdCount} Issues!
                </h3>
                <p className="text-xs text-slate-400">
                  Epic <span className="font-mono font-semibold text-purple-400">{createdSummary.epicKey}</span> and all child tasks have been committed to your project.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 max-w-md mx-auto text-left">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Created Issue Keys
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {createdSummary.issueKeys.map((k) => (
                    <span
                      key={k}
                      className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-800/80 bg-slate-900/90 flex items-center justify-between">
          {step === "input" && (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rawText.trim().length < 10 || decomposeMutation.isPending}
                onClick={() => decomposeMutation.mutate()}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-lg shadow-purple-600/20 transition active:scale-95"
              >
                {decomposeMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing & Decomposing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Decompose with AI</span>
                  </>
                )}
              </button>
            </>
          )}

          {step === "review" && (
            <>
              <button
                type="button"
                onClick={() => setStep("input")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Raw Input</span>
              </button>
              <button
                type="button"
                disabled={reviewedItems.length === 0 || commitMutation.isPending}
                onClick={() => commitMutation.mutate()}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition active:scale-95"
              >
                {commitMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Committing Issues...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm & Create Issues ({reviewedItems.length})</span>
                  </>
                )}
              </button>
            </>
          )}

          {step === "success" && (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
