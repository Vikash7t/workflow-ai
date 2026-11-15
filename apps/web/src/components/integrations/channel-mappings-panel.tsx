"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  Hash,
  Shield,
  Layers,
  Terminal,
} from "lucide-react";
import {
  ChannelMappingDto,
  ProjectDto,
  Platform,
  Priority,
} from "@workflow-ai/contracts";
import {
  listChannelMappings,
  createChannelMapping,
  deleteChannelMapping,
} from "@/lib/api/ingestion";
import { listProjects } from "@/lib/api/projects";

interface ChannelMappingsPanelProps {
  workspaceId: string;
  isAdmin: boolean;
}

export function ChannelMappingsPanel({
  workspaceId,
  isAdmin,
}: ChannelMappingsPanelProps) {
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>("SLACK");
  const [projectId, setProjectId] = useState<string>("");
  const [channelId, setChannelId] = useState("");
  const [channelName, setChannelName] = useState("");
  const [defaultPriority, setDefaultPriority] = useState<Priority>("P2");
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const apiBase =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      : "http://localhost:4000";

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // 1. Fetch projects
  const { data: projects = [] } = useQuery<ProjectDto[]>({
    queryKey: ["projects", workspaceId],
    queryFn: () => listProjects(workspaceId),
    enabled: !!workspaceId,
  });

  // 2. Fetch channel mappings
  const {
    data: mappings = [],
    isLoading,
    isError,
  } = useQuery<ChannelMappingDto[]>({
    queryKey: ["channel-mappings", workspaceId],
    queryFn: () => listChannelMappings(workspaceId),
    enabled: !!workspaceId,
  });

  // 3. Create mutation
  const createMutation = useMutation({
    mutationFn: () => {
      const targetProjectId = projectId || projects[0]?.id;
      if (!targetProjectId) {
        throw new Error("A valid project must be selected");
      }
      return createChannelMapping(workspaceId, {
        projectId: targetProjectId,
        platform,
        channelId: channelId.trim(),
        channelName: channelName.trim() || undefined,
        defaultPriority,
      });
    },
    onSuccess: () => {
      setChannelId("");
      setChannelName("");
      setIsCreateOpen(false);
      setFormError(null);
      queryClient.invalidateQueries({
        queryKey: ["channel-mappings", workspaceId],
      });
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to create channel mapping");
    },
  });

  // 4. Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (mappingId: string) =>
      deleteChannelMapping(workspaceId, mappingId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["channel-mappings", workspaceId],
      });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-400" />
              <span>Slack & Discord Ingestion</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Turn chat conversations and team channels directly into Workflow
              AI issues with automatic author attribution, severity flags, and
              workspace isolation.
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() => {
                setIsCreateOpen(!isCreateOpen);
                setFormError(null);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition self-start sm:self-auto shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Connect Channel</span>
            </button>
          )}
        </div>

        {/* Setup URLs */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-950/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Slack Slash Command Request URL
              </span>
              <button
                onClick={() =>
                  copyToClipboard(`${apiBase}/ingestion/slack/commands`, "slackUrl")
                }
                className="text-slate-400 hover:text-white p-1 rounded"
                title="Copy URL"
              >
                {copiedField === "slackUrl" ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <code className="text-[11px] font-mono text-indigo-300 break-all select-all block bg-slate-900 p-2 rounded border border-slate-800">
              {apiBase}/ingestion/slack/commands
            </code>
            <p className="text-[10px] text-slate-500">
              Configure in your Slack App: Slash Commands $\rightarrow$ <code className="text-slate-400">/issue</code> or <code className="text-slate-400">/workflow</code>.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-950/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                Discord Interactions Endpoint URL
              </span>
              <button
                onClick={() =>
                  copyToClipboard(
                    `${apiBase}/ingestion/discord/interactions`,
                    "discordUrl"
                  )
                }
                className="text-slate-400 hover:text-white p-1 rounded"
                title="Copy URL"
              >
                {copiedField === "discordUrl" ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <code className="text-[11px] font-mono text-indigo-300 break-all select-all block bg-slate-900 p-2 rounded border border-slate-800">
              {apiBase}/ingestion/discord/interactions
            </code>
            <p className="text-[10px] text-slate-500">
              Paste in Discord Developer Portal $\rightarrow$ General Information $\rightarrow$ Interactions Endpoint URL.
            </p>
          </div>
        </div>
      </div>

      {/* Connect Channel Modal / Inline Form */}
      {isCreateOpen && (
        <div className="p-5 rounded-xl border border-indigo-500/30 bg-indigo-950/20 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
              <Hash className="w-4 h-4 text-indigo-400" />
              <span>Map Channel to Project</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-400">
              Zero-leakage channel isolation
            </span>
          </div>

          {formError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-300 block mb-1">
                Platform
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="SLACK">Slack</option>
                <option value="DISCORD">Discord</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-300 block mb-1">
                Target Project
              </label>
              <select
                value={projectId || (projects[0]?.id ?? "")}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.key})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-300 block mb-1">
                Channel ID
              </label>
              <input
                type="text"
                placeholder={platform === "SLACK" ? "e.g. C0123456789" : "e.g. 1029384756"}
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-300 block mb-1">
                Channel Name (Optional)
              </label>
              <input
                type="text"
                placeholder="#bugs or #product-triage"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-medium text-slate-400">
                Default Priority:
              </label>
              <select
                value={defaultPriority}
                onChange={(e) => setDefaultPriority(e.target.value as Priority)}
                className="px-2 py-1 text-xs rounded bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="P0">P0 (Critical)</option>
                <option value="P1">P1 (High)</option>
                <option value="P2">P2 (Medium)</option>
                <option value="P3">P3 (Low)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-900 text-xs text-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!channelId.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate()}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition disabled:opacity-50"
              >
                {createMutation.isPending ? "Connecting..." : "Save Mapping"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mappings Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Active Channel Mappings ({mappings.length})</span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-500">
            Loading channel mappings...
          </div>
        ) : isError ? (
          <div className="py-8 text-center text-xs text-red-400">
            Failed to load channel mappings.
          </div>
        ) : mappings.length === 0 ? (
          <div className="py-12 text-center space-y-3 border border-dashed border-slate-800 rounded-lg">
            <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="text-xs text-slate-400 font-medium">
              No channels mapped yet
            </div>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Map a Slack or Discord channel above to start creating issues directly from your team conversations.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium">
                  <th className="py-2.5 px-3">Platform</th>
                  <th className="py-2.5 px-3">Channel</th>
                  <th className="py-2.5 px-3">Target Project</th>
                  <th className="py-2.5 px-3">Default Priority</th>
                  <th className="py-2.5 px-3">Created</th>
                  {isAdmin && <th className="py-2.5 px-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {mappings.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold ${
                          m.platform === "SLACK"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                        }`}
                      >
                        {m.platform}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-white flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5 text-slate-500" />
                        <span>{m.channelName || m.channelId}</span>
                      </div>
                      {m.channelName && (
                        <div className="text-[10px] font-mono text-slate-500">
                          ID: {m.channelId}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-medium text-slate-200">
                        {m.project?.name || "Project"}
                      </span>
                      <span className="ml-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {m.project?.key}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                        {m.defaultPriority}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {new Date(m.createdAt).toLocaleDateString()}
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-3 text-right">
                        <button
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (
                              confirm(
                                `Disconnect channel "${m.channelName || m.channelId}"?`
                              )
                            ) {
                              deleteMutation.mutate(m.id);
                            }
                          }}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition"
                          title="Delete Mapping"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slash Command Usage Quick Reference */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-5 space-y-3">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <span>Slash Command Syntax Guide</span>
        </h3>
        <p className="text-xs text-slate-400">
          In any mapped Slack or Discord channel, use the command to instantly create an issue:
        </p>
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 space-y-1.5">
          <p className="text-emerald-400">
            /issue Fix payment processing race condition --p0
          </p>
          <p className="text-slate-500">
            Customers experiencing timeout during Stripe checkout peak hours.
          </p>
        </div>
        <p className="text-[11px] text-slate-500">
          Supported severity flags: <code className="text-slate-400">--p0</code> (Critical), <code className="text-slate-400">--p1</code> (High), <code className="text-slate-400">--p2</code> (Medium), <code className="text-slate-400">--p3</code> (Low).
        </p>
      </div>
    </div>
  );
}
