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

import { lazy, Suspense } from "react";
const Landing = lazy(() => import("@/pages/landing"));
const Login = lazy(() => import("@/pages/login"));
const Signup = lazy(() => import("@/pages/signup"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const TasksPage = lazy(() => import("@/pages/tasks"));
const TaskView = lazy(() => import("@/pages/task-view"));
const ProjectPage = lazy(() => import("@/pages/project"));
const TimeTracking = lazy(() => import("@/pages/time-tracking"));
const Analytics = lazy(() => import("@/pages/analytics"));
const Notifications = lazy(() => import("@/pages/notifications"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const OrganizationSettings = lazy(() => import("@/pages/organization-settings"));
const AcceptInvitation = lazy(() => import("@/pages/accept-invitation"));
const Onboarding = lazy(() => import("@/pages/onboarding"));
const BillingPage = lazy(() => import("@/pages/billing"));
const NotFound = lazy(() => import("@/pages/not-found"));


function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [showCreateProject, setShowCreateProject] = useState(false);
  const { user, logout } = useAuth();

  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: notifications } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const unreadCount = notifications?.filter((n) => !n.read).length || 0;

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

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
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const getUserDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user?.email || "User";
  };

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full">
        <AppSidebar
          projects={projects || []}
          onCreateProject={() => setShowCreateProject(true)}
        />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 px-5 h-14 border-b shrink-0 backdrop-blur-md bg-background/90 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <SidebarTrigger data-testid="button-sidebar-toggle" className="text-muted-foreground hover:text-foreground transition-colors" />
              {pageTitle && (
                <div className="hidden sm:flex items-center gap-2">
                  <div className="h-4 w-px bg-border" />
                  <h1 className="text-sm font-semibold">{pageTitle}</h1>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Link href="/notifications">
                <Button variant="ghost" size="icon" className="relative h-8 w-8" data-testid="button-notifications">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center rounded-full bg-violet-600 text-white text-[9px] font-bold leading-none">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>
              </Link>
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-user-profile">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user?.profileImageUrl || undefined} alt={getUserDisplayName()} />
                      <AvatarFallback className="text-[10px] font-bold bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-semibold">{getUserDisplayName()}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings" data-testid="menu-my-account">
                      <User className="h-4 w-4 mr-2" />
                      My Account
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" data-testid="menu-settings-header">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/organization-settings" data-testid="menu-organization-settings">
                      <Settings className="h-4 w-4 mr-2" />
                      Organization
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => logout()}
                    className="text-destructive focus:text-destructive"
                    data-testid="menu-logout-header"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </div>

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

  if (!user) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/accept-invitation" component={AcceptInvitation} />
        <Route component={Landing} />
      </Switch>
    );
  }

  // If user is logged in but hasn't completed onboarding
  // NOTE: /billing is intentionally allowed here so users returning from Stripe
  // aren't immediately bounced to /onboarding before session-status updates the DB.
  if (user.onboardingStep !== "completed") {
    return (
      <Switch>
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/accept-invitation" component={AcceptInvitation} />
        <Route path="/billing">
          {user.isAdmin ? <BillingPage /> : <Redirect to="/onboarding" />}
        </Route>
        <Route>
          <Redirect to="/onboarding" />
        </Route>
      </Switch>
    );
  }

  return (
    <AuthenticatedLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/tasks" component={TasksPage} />
        <Route path="/tasks/:id" component={TaskView} />
        <Route path="/projects/:id" component={ProjectPage} />
        <Route path="/time-tracking" component={TimeTracking} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/organization-settings" component={OrganizationSettings} />
        <Route path="/accept-invitation" component={AcceptInvitation} />
        <Route path="/onboarding">
          <Redirect to="/dashboard" />
        </Route>
        <Route path="/billing">
          {user.isAdmin ? <BillingPage /> : <Redirect to="/dashboard" />}
        </Route>
        {/* Redirect auth pages → dashboard for logged-in users */}
        <Route path="/login"><Redirect to="/dashboard" /></Route>
        <Route path="/signup"><Redirect to="/dashboard" /></Route>
        <Route path="/"><Redirect to="/dashboard" /></Route>
        <Route component={NotFound} />
      </Switch>
    </AuthenticatedLayout>
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
