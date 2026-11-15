"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Check,
  AlertCircle,
  ArrowRight,
  Shield,
  Layers,
  CheckCircle2,
  HelpCircle,
  CornerDownLeft,
} from "lucide-react";
import {
  ChatMessageDto,
  CopilotProposedActionDto,
  CopilotResponseDto,
} from "@workflow-ai/contracts";
import { sendCopilotMessage, commitCopilotAction } from "@/lib/api/copilot";
import { SafeMarkdown } from "@/components/ui/markdown";

interface CopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  projectId: string;
  projectName?: string;
  projectKey?: string;
}

interface ThreadMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestedAction?: CopilotProposedActionDto | null;
  actionId?: string | null;
  suggestedFollowUps?: string[];
  actionCommitted?: boolean;
}

export function CopilotModal({
  isOpen,
  onClose,
  workspaceId,
  projectId,
  projectName = "Active Project",
  projectKey = "ENG",
}: CopilotModalProps) {
  const queryClient = useQueryClient();

  const [inputQuery, setInputQuery] = useState("");
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Chat Mutation
  const chatMutation = useMutation({
    mutationFn: (queryText: string) => {
      const historyPayload: ChatMessageDto[] = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      return sendCopilotMessage(workspaceId, {
        projectId,
        query: queryText,
        history: historyPayload,
      });
    },
    onSuccess: (response: CopilotResponseDto) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          role: "assistant",
          content: response.message,
          suggestedAction: response.suggestedAction,
          actionId: response.actionId,
          suggestedFollowUps: response.suggestedFollowUps,
        },
      ]);
    },
  });

  // Action Commit Mutation
  const commitMutation = useMutation({
    mutationFn: (actionId: string) => commitCopilotAction(workspaceId, actionId),
    onSuccess: (_, actionId) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.actionId === actionId ? { ...m, actionCommitted: true } : m
        )
      );
      queryClient.invalidateQueries({ queryKey: ["issues", workspaceId, projectId] });
      queryClient.invalidateQueries({ queryKey: ["activities", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["sprints", workspaceId, projectId] });
    },
  });

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || inputQuery).trim();
    if (!text || chatMutation.isPending) return;

    setMessages((prev) => [
      ...prev,
      {
        id: `usr-${Date.now()}`,
        role: "user",
        content: text,
      },
    ]);
    setInputQuery("");
    chatMutation.mutate(text);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[650px] max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/80 bg-slate-900/95">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Project Copilot</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
                  Two-Phase Commit
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                  {projectKey}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Ask anything about blockers, sprint progress, or command issue updates.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-400 border border-slate-700">
              ESC
            </kbd>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">
                  How can I help with {projectName}?
                </h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  I can analyze sprint velocity, track down dependency blockers, find P0 issues, or prepare verified issue updates.
                </p>
              </div>

              {/* Starter Quick Chips */}
              <div className="flex flex-wrap justify-center gap-2 max-w-md pt-2">
                <button
                  onClick={() => handleSend("What issues are currently blocked?")}
                  className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-xs text-slate-300 border border-slate-700/80 transition"
                >
                  🛑 What are the current blockers?
                </button>
                <button
                  onClick={() => handleSend("Summarize the active sprint progress")}
                  className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-xs text-slate-300 border border-slate-700/80 transition"
                >
                  📊 Active sprint summary
                </button>
                <button
                  onClick={() => handleSend("Show all P0 critical issues")}
                  className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-xs text-slate-300 border border-slate-700/80 transition"
                >
                  🚨 Show all P0 issues
                </button>
                <button
                  onClick={() => handleSend(`Move ${projectKey}-101 to Done`)}
                  className="px-3 py-1.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 text-xs text-purple-200 border border-purple-500/30 transition"
                >
                  ⚡ Move ticket to Done (Action)
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === "user" ? "items-end" : "items-start"
                }`}
              >
                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-950 border border-slate-800 text-slate-200"
                  }`}
                >
                  {msg.role === "user" ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <SafeMarkdown content={msg.content} />
                  )}
                </div>

                {/* Interactive Action Proposal Card (Two-Phase Commit) */}
                {msg.suggestedAction && msg.actionId && (
                  <div className="w-full max-w-[85%] mt-2.5 p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {msg.suggestedAction.actionType.replace("_", " ")}
                        </span>
                        <span className="font-mono text-xs font-bold text-white">
                          {msg.suggestedAction.targetIssueKey}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {msg.suggestedAction.targetIssueTitle}
                      </span>
                    </div>

                    {/* Change preview: Old -> New */}
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
                      {msg.suggestedAction.oldValue && (
                        <>
                          <span className="text-slate-400 font-mono">
                            {msg.suggestedAction.oldValue}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        </>
                      )}
                      <span className="text-emerald-400 font-bold font-mono">
                        {msg.suggestedAction.newValue}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      {msg.suggestedAction.reasoning}
                    </p>

                    {/* Action Controls */}
                    <div className="flex justify-end pt-1">
                      {msg.actionCommitted ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Applied to {msg.suggestedAction.targetIssueKey}</span>
                        </div>
                      ) : (
                        <button
                          disabled={commitMutation.isPending}
                          onClick={() => commitMutation.mutate(msg.actionId!)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition active:scale-95"
                        >
                          {commitMutation.isPending ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Applying...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Confirm & Apply</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Follow-up Quick Chips */}
                {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 max-w-[85%]">
                    {msg.suggestedFollowUps.map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(chip)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-[11px] text-slate-400 hover:text-slate-200 border border-slate-700/60 transition"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}

          {chatMutation.isPending && (
            <div className="flex items-center gap-2 text-xs text-slate-400 p-3 bg-slate-950/60 border border-slate-800 rounded-xl w-fit">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
              <span>Copilot is analyzing project state...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-900/90">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask Copilot a question or command an update (e.g. 'Move ENG-101 to Done')..."
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || chatMutation.isPending}
              className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-sm transition active:scale-95 shrink-0"
              title="Send (Enter)"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
