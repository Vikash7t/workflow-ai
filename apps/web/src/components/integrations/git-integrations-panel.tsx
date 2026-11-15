"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  GitBranch,
  GitPullRequest,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  ExternalLink,
  Shield,
  Loader2,
  CheckCircle2,
  Power,
  Layers,
} from "lucide-react";
import {
  GitIntegrationDto,
  CreatedGitIntegrationDto,
  ProjectDto,
  GitProvider,
} from "@workflow-ai/contracts";
import {
  listGitIntegrations,
  createGitIntegration,
  updateGitIntegration,
  deleteGitIntegration,
} from "@/lib/api/integrations";
import { listProjects } from "@/lib/api/projects";

interface GitIntegrationsPanelProps {
  workspaceId: string;
  isAdmin: boolean;
}

export function GitIntegrationsPanel({
  workspaceId,
  isAdmin,
}: GitIntegrationsPanelProps) {
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [provider, setProvider] = useState<GitProvider>("GITHUB");
  const [projectId, setProjectId] = useState<string>("");
  const [repository, setRepository] = useState("");
  const [createdIntegration, setCreatedIntegration] = useState<CreatedGitIntegrationDto | null>(null);

  const [copiedField, setCopiedField] = useState<string | null>(null);

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

  // 2. Fetch Git integrations
  const {
    data: integrations = [],
    isLoading,
    isError,
  } = useQuery<GitIntegrationDto[]>({
    queryKey: ["git-integrations", workspaceId],
    queryFn: () => listGitIntegrations(workspaceId),
    enabled: !!workspaceId,
  });

  // 3. Create mutation
  const createMutation = useMutation({
    mutationFn: () =>
      createGitIntegration(workspaceId, {
        projectId: projectId || projects[0]?.id || "",
        provider,
        repository: repository.trim().toLowerCase(),
      }),
    onSuccess: (data) => {
      setCreatedIntegration(data);
      queryClient.invalidateQueries({ queryKey: ["git-integrations", workspaceId] });
    },
  });

  // 4. Toggle mutation
  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      updateGitIntegration(workspaceId, id, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git-integrations", workspaceId] });
    },
  });

  // 5. Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGitIntegration(workspaceId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git-integrations", workspaceId] });
    },
  });

  const handleCloseCreateModal = () => {
    setIsCreateOpen(false);
    setCreatedIntegration(null);
    setRepository("");
    setProjectId("");
  };

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <GitPullRequest className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Git Repository Webhooks</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                GitHub & GitLab
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Sync development workflow automatically: commits, PRs, and branch creation progress issues to In Review and Done.
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setProjectId(projects[0]?.id || "");
              setIsCreateOpen(true);
            }}
            disabled={projects.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition active:scale-95 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Connect Repository</span>
          </button>
        )}
      </div>

      {/* Integrations List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
            <span>Loading integrations...</span>
          </div>
        ) : integrations.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 space-y-2">
            <GitBranch className="w-8 h-8 text-slate-600 mx-auto" />
            <h4 className="text-xs font-semibold text-slate-300">
              No Git Integrations Configured
            </h4>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Connect a GitHub or GitLab repository to enable automatic issue status transitions and activity logs whenever code is pushed or merged.
            </p>
          </div>
        ) : (
          integrations.map((integration) => {
            const project = projects.find((p) => p.id === integration.projectId);
            const webhookUrl = `${typeof window !== "undefined" ? window.location.origin.replace(":3000", ":4000") : "http://localhost:4000"}/api/v1/webhooks/integrations/${integration.provider.toLowerCase()}/${integration.id}`;

            return (
              <div
                key={integration.id}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700/80 transition space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        integration.provider === "GITHUB"
                          ? "bg-slate-800 text-white border border-slate-700"
                          : "bg-orange-950/40 text-orange-400 border border-orange-500/30"
                      }`}
                    >
                      {integration.provider}
                    </span>
                    <span className="font-mono text-xs font-bold text-white">
                      {integration.repository}
                    </span>
                    {project && (
                      <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {project.key}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Active toggle */}
                    {isAdmin && (
                      <button
                        onClick={() =>
                          toggleMutation.mutate({
                            id: integration.id,
                            enabled: !integration.enabled,
                          })
                        }
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                          integration.enabled
                            ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/30"
                            : "bg-slate-800 text-slate-500 border border-slate-700"
                        }`}
                      >
                        <Power className="w-3 h-3" />
                        <span>{integration.enabled ? "Active" : "Disabled"}</span>
                      </button>
                    )}

                    {/* Delete button */}
                    {isAdmin && (
                      <button
                        onClick={() => {
                          if (confirm(`Remove integration for ${integration.repository}?`)) {
                            deleteMutation.mutate(integration.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition"
                        title="Delete integration"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Webhook URL & Secret Display */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 truncate mr-2">
                      Webhook: <span className="text-slate-300 font-mono">{webhookUrl}</span>
                    </span>
                    <button
                      onClick={() => copyToClipboard(webhookUrl, `url-${integration.id}`)}
                      className="p-1 rounded text-slate-400 hover:text-white transition shrink-0"
                      title="Copy URL"
                    >
                      {copiedField === `url-${integration.id}` ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-500">
                      Secret: <span className="font-mono text-slate-400">{integration.maskedSecret}</span>
                    </span>
                    <span className="text-[10px] text-slate-500">HMAC-SHA256</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Setup Guide Card */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-2 text-xs text-slate-400">
        <div className="font-semibold text-slate-300 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-blue-400" />
          <span>How Issue Key Syncing Works</span>
        </div>
        <p className="leading-relaxed">
          Reference any issue key (e.g. <code className="text-blue-400 font-mono">ENG-101</code>) in your branch name, commit message, or PR title:
        </p>
        <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
          <li><strong className="text-slate-200">Branch push</strong>: Transitions unstarted issues to <span className="text-blue-400 font-medium">In Progress</span>.</li>
          <li><strong className="text-slate-200">PR Opened / Reopened</strong>: Transitions issues to <span className="text-purple-400 font-medium">In Review</span>.</li>
          <li><strong className="text-slate-200">PR Merged</strong>: Transitions issues to <span className="text-emerald-400 font-medium">Done</span> with traceability link.</li>
        </ul>
      </div>

      {/* Create Integration Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <GitPullRequest className="w-4 h-4 text-blue-400" />
                <span>Connect Git Repository</span>
              </h3>
              <button
                onClick={handleCloseCreateModal}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {!createdIntegration ? (
                <>
                  {/* Provider selection */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Git Provider
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setProvider("GITHUB")}
                        className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                          provider === "GITHUB"
                            ? "bg-blue-600/20 border-blue-500 text-blue-300"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        <span>GitHub</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setProvider("GITLAB")}
                        className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                          provider === "GITLAB"
                            ? "bg-orange-600/20 border-orange-500 text-orange-300"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        <span>GitLab</span>
                      </button>
                    </div>
                  </div>

                  {/* Target project */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Target Project
                    </label>
                    <select
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.key})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Repository identifier */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Repository (owner/repo)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. facebook/react or org/service"
                      value={repository}
                      onChange={(e) => setRepository(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  {createMutation.isError && (
                    <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                      <span>
                        {(createMutation.error as Error)?.message || "Failed to create integration"}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleCloseCreateModal}
                      className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!repository.trim() || createMutation.isPending}
                      onClick={() => createMutation.mutate()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold transition"
                    >
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Generating Webhook...</span>
                        </>
                      ) : (
                        <span>Generate Webhook</span>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                /* Success State with One-Time Plaintext Secret */
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-2 text-emerald-300 text-xs">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>Webhook integration successfully created!</span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Payload URL
                      </span>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200">
                        <span className="truncate mr-2">{createdIntegration.webhookUrl}</span>
                        <button
                          onClick={() => copyToClipboard(createdIntegration.webhookUrl, "created-url")}
                          className="text-slate-400 hover:text-white transition shrink-0"
                        >
                          {copiedField === "created-url" ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Secret (Save this now! It cannot be retrieved again)
                      </span>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-amber-950/20 border border-amber-500/30 font-mono text-xs text-amber-200">
                        <span className="truncate mr-2">{createdIntegration.plaintextSecret}</span>
                        <button
                          onClick={() => copyToClipboard(createdIntegration.plaintextSecret, "created-sec")}
                          className="text-amber-400 hover:text-white transition shrink-0"
                        >
                          {copiedField === "created-sec" ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                    <span className="font-semibold text-slate-300 block">Repository Configuration:</span>
                    <p>1. Go to your repository settings &rarr; Webhooks &rarr; Add Webhook.</p>
                    <p>2. Paste the Payload URL and Secret.</p>
                    <p>3. Select Content type: <code className="text-slate-200 font-mono">application/json</code>.</p>
                    <p>4. Check events: <strong>Pushes</strong> and <strong>Pull Requests</strong>.</p>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleCloseCreateModal}
                      className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
