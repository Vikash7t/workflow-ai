"use client";

import React from "react";
import { AlertTriangle, ExternalLink, X, Sparkles } from "lucide-react";
import { DuplicateMatchDto } from "@workflow-ai/contracts";

interface DuplicateWarningBannerProps {
  matches: DuplicateMatchDto[];
  confidence: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  isLoading?: boolean;
  onDismiss?: () => void;
  onSelectIssue?: (issueId: string) => void;
}

export function DuplicateWarningBanner({
  matches,
  confidence,
  isLoading,
  onDismiss,
  onSelectIssue,
}: DuplicateWarningBannerProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300 animate-pulse">
        <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-400" />
        <span>Scanning for potential duplicates using semantic similarity...</span>
      </div>
    );
  }

  if (matches.length === 0 || confidence === "NONE") {
    return null;
  }

  const isHigh = confidence === "HIGH";

  return (
    <div
      className={`p-3 rounded-lg border text-xs transition-all ${
        isHigh
          ? "bg-red-950/30 border-red-500/40 text-red-200"
          : "bg-amber-950/30 border-amber-500/40 text-amber-200"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle
            className={`w-4 h-4 shrink-0 ${
              isHigh ? "text-red-400" : "text-amber-400"
            }`}
          />
          <span className="font-semibold">
            {isHigh ? "Possible Duplicate Detected" : "Similar Existing Issues Found"}
          </span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium tracking-wide uppercase ${
              isHigh
                ? "bg-red-500/20 text-red-300 border border-red-500/30"
                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
            }`}
          >
            {confidence} CONFIDENCE
          </span>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-slate-400 hover:text-white p-0.5 rounded transition"
            title="Dismiss duplicate alert"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <p className="text-[11px] text-slate-300 mb-2 leading-relaxed">
        {isHigh
          ? "An existing issue with highly matching scope was found. Consider linking to or updating the existing ticket to avoid redundant work:"
          : "The following tickets appear related to your draft:"}
      </p>

      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
        {matches.map((match) => (
          <div
            key={match.issueId}
            className="flex items-center justify-between p-2 rounded bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition"
          >
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <span className="font-mono font-medium text-blue-400 shrink-0">
                {match.key}
              </span>
              <span className="truncate text-slate-200" title={match.title}>
                {match.title}
              </span>
              <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-slate-300">
                {match.status.name}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono text-[10px] text-slate-400">
                {Math.round(match.similarity * 100)}% match
              </span>
              {onSelectIssue && (
                <button
                  type="button"
                  onClick={() => onSelectIssue(match.issueId)}
                  className="p-1 rounded text-slate-400 hover:text-blue-400 transition"
                  title="View existing issue"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
