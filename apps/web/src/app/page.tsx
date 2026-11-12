import { Activity, CheckCircle, Database, ShieldCheck, Zap, Users, ArrowRight } from "lucide-react";
import Link from "next/link";
import { WorkspaceNav } from "@/components/workspace-nav";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <WorkspaceNav />

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-3xl w-full space-y-8 my-auto">
          <div className="space-y-3 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Zap className="w-3.5 h-3.5" />
              Phase 2: Auth, Tenancy & RBAC Active
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-white">
              Workflow <span className="text-blue-500">AI</span>
            </h1>
            <p className="text-base text-slate-400 max-w-xl mx-auto">
              Intelligent, Predictive, AI-Native Project Management SaaS.
            </p>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition"
              >
                <span>Authentication Center</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/settings"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 font-medium text-xs transition"
              >
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>Workspace Settings</span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>Better Auth</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Passwordless magic link, email/password, and OAuth integration running on NestJS.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur space-y-2">
              <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm">
                <Database className="w-4 h-4" />
                <span>Multi-Tenancy</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                2-tier Organizations & Workspaces with scoped membership and invitation tokens.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur space-y-2">
              <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>RBAC Enforcement</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Owner, Admin, Member, and Viewer permissions verified at API guards and query layers.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-xs font-mono text-slate-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Auth Gateway: http://localhost:4000/api/v1/auth</span>
            </div>
            <span className="text-slate-500">v0.2.0</span>
          </div>
        </div>
      </main>
    </div>
  );
}
