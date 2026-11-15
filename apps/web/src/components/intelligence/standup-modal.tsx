"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  FileText,
  X,
  Sparkles,
  CheckCircle,
  Clock,
  AlertTriangle,
  Copy,
  Check,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import {
  StandupReportResponseDto,
  StandupPeriod,
} from "@workflow-ai/contracts";
import { generateStandup } from "@/lib/api/intelligence";

interface StandupModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  projectId: string;
  sprintId?: string;
  projectName: string;
}

export function StandupModal({
  isOpen,
  onClose,
  workspaceId,
  projectId,
  sprintId,
  projectName,
}: StandupModalProps) {
  const [period, setPeriod] = useState<StandupPeriod>("DAILY");
  const [synthesizeWithAi, setSynthesizeWithAi] = useState(false);
  const [report, setReport] = useState<StandupReportResponseDto | null>(null);
  const [copied, setCopied] = useState(false);

  const standupMutation = useMutation({
    mutationFn: () =>
      generateStandup(workspaceId, {
        projectId,
        sprintId,
        period,
        synthesizeWithAi,
      }),
    onSuccess: (data) => {
      setReport(data);
    },
  });

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!report) return;

    const completedMd =
      report.completedItems.length > 0
        ? report.completedItems
            .map((c) => `- **${c.key}**: ${c.title} (${c.assigneeName || "Unassigned"})`)
            .join("\n")
        : "- None";

    const inProgressMd =
      report.inProgressItems.length > 0
        ? report.inProgressItems
            .map((i) => `- **${i.key}**: ${i.title} [${i.statusName}] (${i.assigneeName || "Unassigned"})`)
            .join("\n")
        : "- None";

    const blockersMd =
      report.blockers.length > 0
        ? report.blockers
            .map((b) => `- **${b.key}**: ${b.title} *(Blocked by: ${b.blockedByKeys.join(", ")})*`)
            .join("\n")
        : "- None";

    const risksMd =
      report.risks.length > 0
        ? report.risks.map((r) => `- **[${r.severity}]**: ${r.description}`).join("\n")
        : "- None";

    const md = `## 📋 ${projectName} — ${report.period} Standup Report
*Generated on ${new Date(report.generatedAt).toLocaleString()}*

### 🎯 Executive Summary
${report.executiveSummary}

### ✅ Completed
${completedMd}

### 🚀 In Progress
${inProgressMd}

### ⚠️ Blockers & Dependencies
${blockersMd}

### 🛡️ Delivery Risks
${risksMd}
`;

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[90vh] rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl flex flex-col text-slate-100 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                Delivery Intelligence Standup
              </h2>
              <p className="text-[11px] text-slate-400">
                Generate verified progress, blocker, and risk reports for{" "}
                <span className="text-slate-200">{projectName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Configuration Bar */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-0.5">
              <button
                type="button"
                onClick={() => setPeriod("DAILY")}
                className={`px-3 py-1 rounded text-xs font-medium transition ${
                  period === "DAILY"
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Daily (24h)
              </button>
              <button
                type="button"
                onClick={() => setPeriod("WEEKLY")}
                className={`px-3 py-1 rounded text-xs font-medium transition ${
                  period === "WEEKLY"
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Weekly (7d)
              </button>
            </div>

            <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none ml-2">
              <input
                type="checkbox"
                checked={synthesizeWithAi}
                onChange={(e) => setSynthesizeWithAi(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
              />
              <span className="flex items-center gap-1 text-[11px]">
                <Sparkles className="w-3 h-3 text-purple-400" />
                AI Executive Summary
              </span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            {report && (
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Markdown</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              disabled={standupMutation.isPending}
              onClick={() => standupMutation.mutate()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition disabled:opacity-50"
            >
              {standupMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Compiling...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Report</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Report Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {!report && !standupMutation.isPending && (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <FileText className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-medium text-slate-300">
                Ready to generate standup report
              </p>
              <p className="text-[11px] max-w-sm mx-auto">
                Click &quot;Generate Report&quot; above to compile verified completed items,
                in-flight work, blockers, and active delivery risks.
              </p>
            </div>
          )}

          {report && (
            <div className="space-y-4">
              {/* Executive Summary Card */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/30 to-purple-950/30 border border-blue-500/20 text-slate-200">
                <div className="flex items-center gap-1.5 text-blue-400 font-semibold mb-1 text-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Executive Summary</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-300">
                  {report.executiveSummary}
                </p>
              </div>

              {/* Completed Work */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-200 border-b border-slate-800 pb-1.5">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Completed ({report.completedItems.length})</span>
                  </span>
                </div>
                {report.completedItems.length === 0 ? (
                  <p className="text-slate-500 text-[11px] italic">
                    No tickets completed during this window.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {report.completedItems.map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800/80"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span className="font-mono text-blue-400 shrink-0 font-medium">
                            {item.key}
                          </span>
                          <span className="truncate text-slate-300">
                            {item.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {item.assigneeName || "Unassigned"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* In Progress Work */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-200 border-b border-slate-800 pb-1.5">
                  <span className="flex items-center gap-1.5 text-blue-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>In Progress ({report.inProgressItems.length})</span>
                  </span>
                </div>
                {report.inProgressItems.length === 0 ? (
                  <p className="text-slate-500 text-[11px] italic">
                    No issues currently marked in progress.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {report.inProgressItems.map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800/80"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span className="font-mono text-blue-400 shrink-0 font-medium">
                            {item.key}
                          </span>
                          <span className="truncate text-slate-300">
                            {item.title}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-slate-300 shrink-0">
                            {item.statusName}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {item.assigneeName || "Unassigned"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Blockers */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-200 border-b border-slate-800 pb-1.5">
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Blockers ({report.blockers.length})</span>
                  </span>
                </div>
                {report.blockers.length === 0 ? (
                  <p className="text-slate-500 text-[11px] italic">
                    Zero active blockers reported!
                  </p>
                ) : (
                  <div className="space-y-1">
                    {report.blockers.map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800/80"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span className="font-mono text-amber-400 shrink-0 font-medium">
                            {item.key}
                          </span>
                          <span className="truncate text-slate-300">
                            {item.title}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-red-400 shrink-0">
                          Blocked by: {item.blockedByKeys.join(", ")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Delivery Risks */}
              {report.risks.length > 0 && (
                <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/20 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-red-300 border-b border-red-500/20 pb-1.5">
                    <span className="flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                      <span>Delivery Risks ({report.risks.length})</span>
                    </span>
                  </div>
                  <div className="space-y-1">
                    {report.risks.map((risk, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-1.5 rounded bg-slate-900/60 border border-slate-800 text-[11px]"
                      >
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            risk.severity === "CRITICAL"
                              ? "bg-red-500/20 text-red-300"
                              : risk.severity === "HIGH"
                              ? "bg-orange-500/20 text-orange-300"
                              : "bg-amber-500/20 text-amber-300"
                          }`}
                        >
                          {risk.severity}
                        </span>
                        <span className="text-slate-300">{risk.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
