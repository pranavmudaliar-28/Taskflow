import { useState } from "react";
import { Switch, Route, useLocation, Link, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { useAuth } from "@/hooks/use-auth";
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
  const { user, isLoading } = useAuth();
  const params = new URLSearchParams(window.location.search);
  // Honor the logout flag to force login view even if user state is still lingering
  const isLoggingOut = params.get("logout") === "1";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <Skeleton className="h-10 w-10 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  // If user is logged out, OR if we are in the middle of a hard logout failsafe redirect
  if (!user || isLoggingOut) {
    if (isLoggingOut && user) {
      console.log("[Router] Logout flag detected, ignoring user session to break loop");
    }
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/accept-invitation" component={AcceptInvitation} />
        <Route>
          <Redirect to={`/login${window.location.search}`} />
        </Route>
      </Switch>
    );
  }

  // If user is logged in, handle onboarding and dashboard routing
  const isOnboarded = user.onboardingStep === "completed";

  return (
    <Switch>
      {/* Onboarding pages */}
      <Route path="/onboarding">
        {isOnboarded ? <Redirect to="/dashboard" /> : <Onboarding />}
      </Route>

      {/* Billing is special (allowed during onboarding for Stripe returns) */}
      <Route path="/billing">
        {user.isAdmin ? <BillingPage /> : (isOnboarded ? <Redirect to="/dashboard" /> : <Redirect to="/onboarding" />)}
      </Route>

      {/* Auth pages -> Dashboard (user is logged in) */}
      <Route path="/login">
        <Redirect to={isOnboarded ? "/dashboard" : "/onboarding"} />
      </Route>
      <Route path="/signup">
        <Redirect to={isOnboarded ? "/dashboard" : "/onboarding"} />
      </Route>

      {/* Main App Routes (AuthenticatedLayout) */}
      <Route path="/:rest*">
        {!isOnboarded ? (
          <Redirect to="/onboarding" />
        ) : (
          <AuthenticatedLayout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/tasks" component={TasksPage} />
              <Route path="/tasks/:id" component={TaskView} />
              <Route path="/projects/:projectId/:taskId" component={TaskView} />
              <Route path="/projects/:projectId/:parentTaskId/:taskId" component={TaskView} />
              <Route path="/projects/:id" component={ProjectPage} />
              <Route path="/time-tracking" component={TimeTracking} />
              <Route path="/analytics" component={Analytics} />
              <Route path="/notifications" component={Notifications} />
              <Route path="/settings" component={SettingsPage} />
              <Route path="/organization-settings" component={OrganizationSettings} />
              <Route path="/accept-invitation" component={AcceptInvitation} />
              <Route component={NotFound} />
            </Switch>
          </AuthenticatedLayout>
        )}
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
            <AppRouter />
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
