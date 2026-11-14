"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import {
  WorkspaceDto,
  ProjectDto,
  WorkflowStatusDto,
  WorkspaceMemberDto,
  IssueDto,
} from "@workflow-ai/contracts";
import { listWorkspaces, listWorkspaceMembers } from "@/lib/api/tenancy";
import { listProjects } from "@/lib/api/projects";
import { listWorkflowStatuses } from "@/lib/api/workflows";
import { listIssues } from "@/lib/api/issues";
import { WorkspaceNav } from "@/components/workspace-nav";
import { KanbanBoard } from "@/components/board/kanban-board";
import { IssueListView } from "@/components/list/issue-list-view";
import { ViewHeader, FilterState } from "@/components/board/view-header";
import { IssueDrawer } from "@/components/issues/issue-drawer";
import { CreateIssueModal } from "@/components/issues/create-issue-modal";
import { CreateProjectModal } from "@/components/projects/create-project-modal";
import {
  FolderKanban,
  Plus,
  Layers,
  Settings,
  ChevronRight,
  Loader2,
  Inbox,
} from "lucide-react";
import Link from "next/link";

export function DashboardView() {
  const { data: session } = useSession();

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>("");
  const [activeProjectId, setActiveProjectId] = useState<string>("");
  const [currentView, setCurrentView] = useState<"board" | "list">("board");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [isCreateIssueOpen, setIsCreateIssueOpen] = useState(false);
  const [quickCreateStatusId, setQuickCreateStatusId] = useState<string | undefined>();
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    statusId: "",
    type: "",
    priority: "",
    assigneeId: "",
  });

  // Global 'C' shortcut to open Create Issue modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === "c" &&
        !isCreateIssueOpen &&
        !isCreateProjectOpen &&
        activeProjectId &&
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement
        )
      ) {
        e.preventDefault();
        setQuickCreateStatusId(undefined);
        setIsCreateIssueOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCreateIssueOpen, isCreateProjectOpen, activeProjectId]);

  // 1. Fetch Workspaces
  const { data: workspaces = [], isLoading: isLoadingWorkspaces } = useQuery<WorkspaceDto[]>({
    queryKey: ["workspaces"],
    queryFn: listWorkspaces,
    enabled: !!session?.user,
  });

  // Select initial workspace
  useEffect(() => {
    if (workspaces.length > 0 && !activeWorkspaceId) {
      setActiveWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, activeWorkspaceId]);

  // 2. Fetch Projects for active workspace
  const { data: projects = [], isLoading: isLoadingProjects } = useQuery<ProjectDto[]>({
    queryKey: ["projects", activeWorkspaceId],
    queryFn: () => listProjects(activeWorkspaceId),
    enabled: !!activeWorkspaceId,
  });

  // Select initial project
  useEffect(() => {
    if (projects.length > 0) {
      if (!activeProjectId || !projects.some((p) => p.id === activeProjectId)) {
        setActiveProjectId(projects[0].id);
      }
    } else {
      setActiveProjectId("");
    }
  }, [projects, activeProjectId]);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  // 3. Fetch Workflow Statuses for active project
  const { data: statuses = [], isLoading: isLoadingStatuses } = useQuery<WorkflowStatusDto[]>({
    queryKey: ["workflows", activeWorkspaceId, activeProjectId],
    queryFn: () => listWorkflowStatuses(activeWorkspaceId, activeProjectId),
    enabled: !!activeWorkspaceId && !!activeProjectId,
  });

  // 4. Fetch Workspace Members
  const { data: members = [] } = useQuery<WorkspaceMemberDto[]>({
    queryKey: ["members", activeWorkspaceId],
    queryFn: () => listWorkspaceMembers(activeWorkspaceId),
    enabled: !!activeWorkspaceId,
  });

  // 5. Fetch Issues for active project
  const { data: issuesResponse, isLoading: isLoadingIssues } = useQuery({
    queryKey: [
      "issues",
      activeWorkspaceId,
      activeProjectId,
      filters,
    ],
    queryFn: () =>
      listIssues(activeWorkspaceId, {
        projectId: activeProjectId,
        search: filters.search || undefined,
        statusId: filters.statusId || undefined,
        type: (filters.type as any) || undefined,
        priority: (filters.priority as any) || undefined,
        assigneeId: filters.assigneeId || undefined,
      }),
    enabled: !!activeWorkspaceId && !!activeProjectId,
  });

  const issues = issuesResponse?.items || [];

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Global Nav */}
      <WorkspaceNav
        activeWorkspaceId={activeWorkspaceId}
        onSelectWorkspace={(ws) => {
          setActiveWorkspaceId(ws.id);
          setActiveProjectId("");
        }}
      />

      {/* Main Workspace App Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-64 border-r border-slate-800 bg-slate-900/40 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5 text-blue-400" />
              <span>Projects</span>
            </span>
            <button
              onClick={() => setIsCreateProjectOpen(true)}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="New Project"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Project List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoadingProjects ? (
              <div className="p-4 text-center text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2 text-blue-500" />
                <span>Loading projects...</span>
              </div>
            ) : projects.length === 0 ? (
              <div className="p-4 text-center space-y-2">
                <p className="text-xs text-slate-500">No projects yet.</p>
                <button
                  onClick={() => setIsCreateProjectOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-medium hover:bg-blue-600/30 transition w-full"
                >
                  Create First Project
                </button>
              </div>
            ) : (
              projects.map((proj) => {
                const isActive = proj.id === activeProjectId;
                return (
                  <button
                    key={proj.id}
                    onClick={() => setActiveProjectId(proj.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                      isActive
                        ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm"
                        : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {proj.key}
                      </span>
                      <span className="truncate">{proj.name}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Bottom Settings Link */}
          <div className="p-3 border-t border-slate-800">
            <Link
              href="/settings"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Workspace Settings</span>
            </Link>
          </div>
        </aside>

        {/* Center Canvas / Board Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-950 p-6">
          {!activeProject ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                <Inbox className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-white">No Project Selected</h2>
              <p className="text-xs text-slate-400 max-w-sm">
                Select a project from the sidebar or create a new project to start managing tasks and workflows.
              </p>
              <button
                onClick={() => setIsCreateProjectOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Project</span>
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 space-y-4">
              {/* Project Header & Filter Controls */}
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                    <span>{activeProject.name}</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                      {activeProject.key}
                    </span>
                  </h1>
                  {activeProject.description && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {activeProject.description}
                    </p>
                  )}
                </div>
              </div>

              <ViewHeader
                currentView={currentView}
                onViewChange={setCurrentView}
                filters={filters}
                onFilterChange={setFilters}
                statuses={statuses}
                members={members}
                onOpenCreateModal={() => {
                  setQuickCreateStatusId(undefined);
                  setIsCreateIssueOpen(true);
                }}
              />

              {/* View Rendering */}
              {isLoadingIssues || isLoadingStatuses ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : currentView === "board" ? (
                <KanbanBoard
                  workspaceId={activeWorkspaceId}
                  projectId={activeProjectId}
                  statuses={statuses}
                  issues={issues}
                  members={members}
                  onSelectIssue={(id) => setSelectedIssueId(id)}
                  onQuickCreate={(statusId) => {
                    setQuickCreateStatusId(statusId);
                    setIsCreateIssueOpen(true);
                  }}
                />
              ) : (
                <IssueListView
                  workspaceId={activeWorkspaceId}
                  projectId={activeProjectId}
                  statuses={statuses}
                  issues={issues}
                  members={members}
                  onSelectIssue={(id) => setSelectedIssueId(id)}
                />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Slide-over Issue Detail Drawer */}
      <IssueDrawer
        issueId={selectedIssueId}
        onClose={() => setSelectedIssueId(null)}
        workspaceId={activeWorkspaceId}
        projectId={activeProjectId}
        statuses={statuses}
        members={members}
      />

      {/* Quick Create Issue Modal */}
      <CreateIssueModal
        isOpen={isCreateIssueOpen}
        onClose={() => {
          setIsCreateIssueOpen(false);
          setQuickCreateStatusId(undefined);
        }}
        workspaceId={activeWorkspaceId}
        projectId={activeProjectId}
        statuses={statuses}
        members={members}
        candidateParents={issues}
        initialStatusId={quickCreateStatusId}
      />

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        workspaceId={activeWorkspaceId}
        onProjectCreated={(newProjId) => setActiveProjectId(newProjId)}
      />
    </div>
  );
}
