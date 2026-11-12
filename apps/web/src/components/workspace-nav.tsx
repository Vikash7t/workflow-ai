"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession, signOut } from "@/lib/auth-client";
import { ChevronDown, Plus, LogOut, Building, Shield, User } from "lucide-react";
import Link from "next/link";
import { WorkspaceDto } from "@workflow-ai/contracts";

export function WorkspaceNav({
  activeWorkspaceId,
  onSelectWorkspace,
}: {
  activeWorkspaceId?: string;
  onSelectWorkspace?: (ws: WorkspaceDto) => void;
}) {
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { data: workspaces = [], isLoading } = useQuery<WorkspaceDto[]>({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const res = await fetch("http://localhost:4000/api/v1/workspaces", {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!session?.user,
  });

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-950/80 backdrop-blur px-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <Link href="/" className="font-black text-lg text-white tracking-tight flex items-center gap-1.5">
          <span>Workflow</span>
          <span className="text-blue-500 font-extrabold">AI</span>
        </Link>

        {session?.user && (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-xs font-medium text-slate-200 transition"
            >
              <Building className="w-3.5 h-3.5 text-blue-400" />
              <span>{activeWorkspace ? activeWorkspace.name : "Select Workspace"}</span>
              {activeWorkspace?.role && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {activeWorkspace.role}
                </span>
              )}
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 mt-1 w-64 rounded-xl border border-slate-800 bg-slate-900 shadow-2xl p-1 space-y-1 z-50">
                <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Workspaces
                </div>

                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      onSelectWorkspace?.(ws);
                      setDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition ${
                      ws.id === activeWorkspace?.id
                        ? "bg-blue-600/15 text-blue-400 font-medium border border-blue-500/20"
                        : "hover:bg-slate-800 text-slate-300"
                    }`}
                  >
                    <span>{ws.name}</span>
                    <span className="text-[10px] font-mono text-slate-500">{ws.role}</span>
                  </button>
                ))}

                <div className="border-t border-slate-800 my-1 pt-1">
                  <Link
                    href="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Workspace Settings & Members</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {session?.user ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[10px] text-blue-400">
                {session.user.name ? session.user.name[0].toUpperCase() : "U"}
              </div>
              <span className="hidden sm:inline font-medium">{session.user.name || session.user.email}</span>
            </div>

            <button
              onClick={() => signOut()}
              className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-red-400 transition"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition"
          >
            <User className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </Link>
        )}
      </div>
    </header>
  );
}
