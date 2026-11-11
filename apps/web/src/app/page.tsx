import { Activity, CheckCircle, Database, ShieldCheck, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-100">
      <div className="max-w-3xl w-full space-y-8">
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Zap className="w-3.5 h-3.5" />
            Phase 1: Engineering Foundation Online
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-white">
            Workflow <span className="text-blue-500">AI</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            Intelligent, Predictive, AI-Native Project Management SaaS.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>Modular Monorepo</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Next.js 16 App Router & NestJS 12 running on npm workspaces with typed shared contracts.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur space-y-2">
            <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm">
              <Database className="w-4 h-4" />
              <span>PostgreSQL 18</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Prisma ORM 7 with native pg adapter, atomic counters, and multi-tenant schema ready.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur space-y-2">
            <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>OWASP Top 10</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Centralized Problem Details exception filter, Helmet security headers, and RBAC guards.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-xs font-mono text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>API Gateway Target: http://localhost:4000/api/v1/health/ready</span>
          </div>
          <span className="text-slate-500">v0.1.0</span>
        </div>
      </div>
    </main>
  );
}
