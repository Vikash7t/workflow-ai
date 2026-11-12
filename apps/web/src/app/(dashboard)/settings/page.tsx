"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WorkspaceNav } from "@/components/workspace-nav";
import { useSession } from "@/lib/auth-client";
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Building,
  Check,
  AlertCircle,
  Trash2,
  Plus,
} from "lucide-react";
import { WorkspaceDto, WorkspaceMemberDto, WorkspaceInvitationDto, Role } from "@workflow-ai/contracts";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("MEMBER");
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);

  // New Workspace state
  const [newWsName, setNewWsName] = useState("");
  const [isCreatingWs, setIsCreatingWs] = useState(false);

  // Fetch workspaces
  const { data: workspaces = [] } = useQuery<WorkspaceDto[]>({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const res = await fetch("http://localhost:4000/api/v1/workspaces", {
        credentials: "include",
      });
      if (!res.ok) return [];
      const data = await res.json();
      if (data.length > 0 && !activeWorkspaceId) {
        setActiveWorkspaceId(data[0].id);
      }
      return data;
    },
    enabled: !!session?.user,
  });

  const currentWorkspaceId = activeWorkspaceId || workspaces[0]?.id;
  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId);
  const isAdminOrOwner = currentWorkspace?.role === "ADMIN" || currentWorkspace?.role === "OWNER";

  // Fetch members
  const { data: members = [], isLoading: membersLoading } = useQuery<WorkspaceMemberDto[]>({
    queryKey: ["members", currentWorkspaceId],
    queryFn: async () => {
      if (!currentWorkspaceId) return [];
      const res = await fetch(`http://localhost:4000/api/v1/workspaces/${currentWorkspaceId}/members`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!currentWorkspaceId,
  });

  // Fetch invitations
  const { data: invitations = [] } = useQuery<WorkspaceInvitationDto[]>({
    queryKey: ["invitations", currentWorkspaceId],
    queryFn: async () => {
      if (!currentWorkspaceId || !isAdminOrOwner) return [];
      const res = await fetch(`http://localhost:4000/api/v1/workspaces/${currentWorkspaceId}/invitations`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!currentWorkspaceId && isAdminOrOwner,
  });

  // Send invitation mutation
  const inviteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`http://localhost:4000/api/v1/workspaces/${currentWorkspaceId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to send invitation");
      }
      return res.json();
    },
    onSuccess: () => {
      setInviteStatus("Invitation sent successfully!");
      setInviteEmail("");
      queryClient.invalidateQueries({ queryKey: ["invitations", currentWorkspaceId] });
      setTimeout(() => setInviteStatus(null), 3000);
    },
    onError: (err: any) => {
      setInviteStatus(`Error: ${err.message}`);
    },
  });

  // Create Workspace mutation
  const createWsMutation = useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.organizationId) throw new Error("Organization ID required");
      const res = await fetch("http://localhost:4000/api/v1/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          organizationId: currentWorkspace.organizationId,
          name: newWsName,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to create workspace");
      }
      return res.json();
    },
    onSuccess: (newWs) => {
      setNewWsName("");
      setIsCreatingWs(false);
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      setActiveWorkspaceId(newWs.id);
    },
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <WorkspaceNav
        activeWorkspaceId={currentWorkspaceId}
        onSelectWorkspace={(ws) => setActiveWorkspaceId(ws.id)}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Building className="w-6 h-6 text-blue-500" />
              <span>Workspace Settings</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage workspace details, role permissions, and invite team members.
            </p>
          </div>

          <button
            onClick={() => setIsCreatingWs(!isCreatingWs)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Workspace</span>
          </button>
        </div>

        {isCreatingWs && (
          <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-3">
            <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
              Create New Workspace
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Workspace Name (e.g. Frontend Engineering)"
                value={newWsName}
                onChange={(e) => setNewWsName(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                disabled={!newWsName.trim() || createWsMutation.isPending}
                onClick={() => createWsMutation.mutate()}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition disabled:opacity-50"
              >
                {createWsMutation.isPending ? "Creating..." : "Create"}
              </button>
              <button
                onClick={() => setIsCreatingWs(false)}
                className="px-3 py-2 rounded-lg border border-slate-800 hover:bg-slate-900 text-xs text-slate-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Members Management Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-semibold text-sm">
              <Users className="w-4 h-4 text-blue-400" />
              <span>Workspace Members ({members.length})</span>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              Your Role: {currentWorkspace?.role || "GUEST"}
            </span>
          </div>

          {/* Members Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium">
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-3 font-medium text-white flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[10px] text-blue-400">
                        {m.user.name ? m.user.name[0].toUpperCase() : "U"}
                      </div>
                      <span>{m.user.name || "Anonymous User"}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">{m.user.email}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {m.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">{new Date(m.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Invite Section (Admin Only) */}
          {isAdminOrOwner && (
            <div className="pt-6 border-t border-slate-800 space-y-4">
              <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-blue-400" />
                <span>Invite New Member</span>
              </h3>

              {inviteStatus && (
                <div className={`p-3 text-xs rounded-lg flex items-center gap-2 ${
                  inviteStatus.startsWith("Error")
                    ? "bg-red-500/10 border border-red-500/20 text-red-400"
                    : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                }`}>
                  {inviteStatus.startsWith("Error") ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  <span>{inviteStatus}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as Role)}
                  className="px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="MEMBER">Member (Standard Access)</option>
                  <option value="ADMIN">Admin (Manage Members & Settings)</option>
                  <option value="VIEWER">Viewer (Read Only)</option>
                </select>

                <button
                  disabled={!inviteEmail.trim() || inviteMutation.isPending}
                  onClick={() => inviteMutation.mutate()}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition disabled:opacity-50"
                >
                  {inviteMutation.isPending ? "Sending..." : "Send Invite"}
                </button>
              </div>

              {/* Pending Invitations */}
              {invitations.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="text-[11px] font-medium text-slate-400">Pending Invitations ({invitations.length})</div>
                  <div className="space-y-1.5">
                    {invitations.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800/80 bg-slate-950/40 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{inv.email}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">{inv.role}</span>
                        </div>
                        <span className="text-[10px] text-slate-500">Expires {new Date(inv.expiresAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
