import React, { useState, useEffect } from "react";
import { Switch, Route, useLocation, Link, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Bell, User, LogOut, Settings, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Project, Notification } from "@shared/schema";

import { Suspense } from "react";
import { lazyRetry } from "./lib/lazy-retry";
const Landing = lazyRetry(() => import("@/pages/landing"));
const Login = lazyRetry(() => import("@/pages/login"));
const Signup = lazyRetry(() => import("@/pages/signup"));
const Dashboard = lazyRetry(() => import("@/pages/dashboard"));
const TasksPage = lazyRetry(() => import("@/pages/tasks"));
const TaskView = lazyRetry(() => import("@/pages/task-view"));
const ProjectPage = lazyRetry(() => import("@/pages/project"));
const TimeTracking = lazyRetry(() => import("@/pages/time-tracking"));
const Analytics = lazyRetry(() => import("@/pages/analytics"));
const Notifications = lazyRetry(() => import("@/pages/notifications"));
const SettingsPage = lazyRetry(() => import("@/pages/settings"));
const OrganizationSettings = lazyRetry(() => import("@/pages/organization-settings"));
const AcceptInvitation = lazyRetry(() => import("@/pages/accept-invitation"));
const Onboarding = lazyRetry(() => import("@/pages/onboarding"));
const BillingPage = lazyRetry(() => import("@/pages/billing"));
const ForgotPassword = lazyRetry(() => import("@/pages/forgot-password"));
const NotFound = lazyRetry(() => import("@/pages/not-found"));

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [showCreateProject, setShowCreateProject] = useState(false);
  const { user, logout } = useAuth();

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: notifications } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const unreadCount = notifications?.filter((n) => !n.read).length || 0;

  const getPageTitle = () => {
    if (location.startsWith("/projects/")) return null;
    if (location === "/dashboard" || location === "/") return "Dashboard";
    if (location === "/time-tracking") return "Time Tracking";
    if (location === "/analytics") return "Analytics";
    if (location === "/notifications") return "Notifications";
    if (location === "/settings") return "Settings";
    if (location === "/organization-settings") return "Organization Settings";
    return null;
  };

  const pageTitle = getPageTitle();

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    if (user?.email) return user.email[0].toUpperCase();
    return "U";
  };

  const getUserDisplayName = () => {
    if (user?.firstName && user?.lastName) return `${user.firstName} ${user.lastName}`;
    return user?.email || "User";
  };

  return (
    <SidebarProvider>
      <AppSidebar
        projects={projects || []}
        onCreateProject={() => setShowCreateProject(true)}
      />
      <SidebarInset className="flex flex-col h-screen overflow-hidden bg-background">
        <header className="flex items-center justify-between gap-2 px-[var(--page-padding)] h-14 border-b border-border shrink-0 bg-background/80 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Sidebar toggle visible on mobile and tablet */}
            <SidebarTrigger className="lg:hidden text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors" />

            {pageTitle && (
              <div className="flex items-center gap-2 truncate">
                <div className="hidden xs:block h-4 w-px bg-border" />
                <span className="text-sm font-semibold text-foreground/80 truncate">{pageTitle}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Link href="/notifications">
              <Button variant="ghost" size="icon" className="relative h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center rounded-full bg-violet-600 text-white text-[9px] font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </Link>
            <div className="hidden xs:block">
              <ThemeToggle />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-accent">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user?.profileImageUrl || undefined} />
                    <AvatarFallback className="text-[10px] font-bold bg-violet-600 text-white">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-semibold truncate">{getUserDisplayName()}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <User className="h-4 w-4 mr-2" />
                    My Account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/organization-settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Organization
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-background/50">
          {children}
        </main>
      </SidebarInset>

      <CreateProjectDialog
        open={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        organizationId="default"
      />
    </SidebarProvider>
  );
}

function AppRouter() {
  const { user, isLoading, isError } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();

  useEffect(() => {
    console.info(`[Router] Transitioning to: ${location}`);
    // We intentionally removed queryClient.cancelQueries() here, because it
    // aborts the initial useAuth query on mount, leading to an infinite loader.
  }, [location]);

  // Global Offline Status
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const handleOnline = () => {
      console.info("[Network] App is back online");
      setIsOffline(false);
      toast({ title: "Back online", description: "Connectivity restored." });
      queryClient.invalidateQueries(); // Refresh everything
    };
    const handleOffline = () => {
      console.warn("[Network] App is offline");
      setIsOffline(true);
      toast({ title: "You are offline", description: "Some features may be limited.", variant: "destructive" });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  const params = new URLSearchParams(window.location.search);
  // Honor the logout flag to force login view even if user state is still lingering
  const isLoggingOut = params.get("logout") === "1";

  // ⚠️ IMPORTANT: This hook MUST stay here (before any early returns) to comply with React's Rules of Hooks.
  // The `enabled` flag prevents actual fetching when the user is null/onboarded.
  const { data: pendingInvites, isLoading: inviteLoading } = useQuery<any[]>({
    queryKey: ["/api/invitations/pending"],
    enabled: !!user && user.onboardingStep !== "completed",
    staleTime: 30_000,
  });

  // Transient Error Handling: If we hit a network error or 500, we don't want to 
  // immediately redirect to login. We stay in the "loading" state so focus-refetch
  // can fix it when the user clicks back into the tab.
  if (isLoading || (isError && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <Skeleton className="h-10 w-10 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
          {isError && <p className="text-[10px] text-muted-foreground animate-pulse">Reconnecting to server...</p>}
        </div>
      </div>
    );
  }

  // If user is explicitly null (401 Unauthorized), OR if we are in the middle of a hard logout failsafe redirect
  if (user === null || isLoggingOut) {
    if (isLoggingOut && user) {
      console.log("[Router] Logout flag detected, ignoring user session to break loop");
    }
    return (
      <div className="relative min-h-screen flex flex-col">
        {isOffline && (
          <div className="bg-destructive text-destructive-foreground py-1 text-center text-[10px] font-bold uppercase tracking-widest z-50 animate-in fade-in slide-in-from-top-1">
            Offline Mode · Features may be limited
          </div>
        )}
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/login" component={Login} />
          <Route path="/signup" component={Signup} />
          <Route path="/accept-invitation" component={AcceptInvitation} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route>
            <Redirect to={`/login${window.location.search}`} />
          </Route>
        </Switch>
      </div>
    );
  }

  // If user is logged in, handle onboarding and dashboard routing
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
          <p className="text-[10px] text-muted-foreground animate-pulse">Initializing session...</p>
        </div>
      </div>
    );
  }

  const isOnboarded = user.onboardingStep === "completed";

  // Debug logs for redirection logic
  console.log("[AppRouter] State:", {
    userId: user.id,
    email: user.email,
    onboardingStep: user.onboardingStep,
    isOnboarded,
    inviteLoading,
    pendingInvitesCount: pendingInvites?.length
  });

  // Only consider an invite confirmed once the query has finished loading
  const hasPendingInvite = !inviteLoading && !!(pendingInvites && pendingInvites.length > 0);
  const pendingInviteToken = hasPendingInvite ? pendingInvites![0].token : null;

  if (hasPendingInvite) {
    console.log("[AppRouter] Found pending invite:", pendingInviteToken);
  }

  return (
    <Switch>
      {/* Accept invitation — always accessible when logged in (before or after onboarding) */}
      <Route path="/accept-invitation" component={AcceptInvitation} />

      {/* Onboarding — show immediately; onboarding.tsx useEffect handles invite redirect internally */}
      <Route path="/onboarding">
        {isOnboarded
          ? <Redirect to="/dashboard" />
          : hasPendingInvite
            ? <Redirect to={`/accept-invitation?token=${pendingInviteToken}`} />
            : <Onboarding />}
      </Route>

      {/* Billing is special (allowed during onboarding for Stripe returns) */}
      <Route path="/billing">
        {user.isAdmin ? (
          <AuthenticatedLayout>
            <BillingPage />
          </AuthenticatedLayout>
        ) : (isOnboarded ? <Redirect to="/dashboard" /> : <Redirect to="/onboarding" />)}
      </Route>

      {/* Auth pages → route based on completion status */}
      <Route path="/login">
        {() => {
          const params = new URLSearchParams(window.location.search);
          const redirect = params.get("redirect") ||
            (isOnboarded ? "/dashboard" : hasPendingInvite ? `/accept-invitation?token=${pendingInviteToken}` : "/onboarding");
          return <Redirect to={redirect} />;
        }}
      </Route>
      <Route path="/signup">
        {() => {
          const params = new URLSearchParams(window.location.search);
          const redirect = params.get("redirect") ||
            (isOnboarded ? "/dashboard" : hasPendingInvite ? `/accept-invitation?token=${pendingInviteToken}` : "/onboarding");
          return <Redirect to={redirect} />;
        }}
      </Route>

      {/* Main App Routes (AuthenticatedLayout) */}
      <Route>
        {() => {
          console.log("[AppRouter] Catch-all route evaluation:", {
            isOnboarded,
            inviteLoading,
            hasPendingInvite,
            pendingInviteToken
          });

          // Wait for invite check before deciding where to send the user
          if (inviteLoading) {
            return (
              <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
              </div>
            );
          }

          // Invited user with pending invite — send to accept-invitation
          if (!isOnboarded && hasPendingInvite) {
            console.log("[AppRouter] Redirecting invited user to /accept-invitation");
            return <Redirect to={`/accept-invitation?token=${pendingInviteToken}`} />;
          }

          // Normal non-onboarded user — send to onboarding
          if (!isOnboarded) {
            console.log("[AppRouter] Redirecting non-onboarded user to /onboarding");
            return <Redirect to="/onboarding" />;
          }

          console.log("[AppRouter] All checks passed. Rendering AuthenticatedLayout");
          return (
            <AuthenticatedLayout>
              <Switch>
                <Route path="/">
                  {() => { console.log("[AppRouter] Matched /"); return <Dashboard />; }}
                </Route>
                <Route path="/dashboard" component={Dashboard} />
                <Route path="/tasks" component={TasksPage} />
                <Route path="/tasks/:id">
                  {(params) => { console.log("[AppRouter] Matched /tasks/:id", params); return <TaskView />; }}
                </Route>
                <Route path="/projects/:projectId/:taskId" component={TaskView} />
                <Route path="/projects/:projectId/:parentTaskId/:taskId" component={TaskView} />
                <Route path="/projects/:id">
                  {(params) => { console.log("[AppRouter] Matched /projects/:id", params); return <ProjectPage />; }}
                </Route>
                <Route path="/time-tracking" component={TimeTracking} />
                <Route path="/analytics" component={Analytics} />
                <Route path="/notifications" component={Notifications} />
                <Route path="/settings" component={SettingsPage} />
                <Route path="/organization-settings" component={OrganizationSettings} />
                <Route path="/accept-invitation" component={AcceptInvitation} />
                <Route>
                  {() => { console.log("[AppRouter] Matched NotFound"); return <NotFound />; }}
                </Route>
              </Switch>
            </AuthenticatedLayout>
          );
        }}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-background">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          }>
            <ErrorBoundary>
              <AppRouter />
            </ErrorBoundary>
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
