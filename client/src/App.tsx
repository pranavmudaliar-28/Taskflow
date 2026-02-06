import { useState } from "react";
import { Switch, Route, useLocation, Link } from "wouter";
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
import { Bell, User, LogOut, Settings } from "lucide-react";
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

import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Dashboard from "@/pages/dashboard";
import ProjectPage from "@/pages/project";
import TimeTracking from "@/pages/time-tracking";
import Analytics from "@/pages/analytics";
import Notifications from "@/pages/notifications";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";

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
          <header className="flex items-center justify-between gap-4 px-4 h-14 border-b shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              {pageTitle && (
                <h1 className="text-lg font-semibold hidden sm:block">{pageTitle}</h1>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link href="/notifications">
                <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Badge>
                  )}
                </Button>
              </Link>
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid="button-user-profile">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.profileImageUrl || undefined} alt={getUserDisplayName()} />
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{getUserDisplayName()}</p>
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
        <Route component={Landing} />
      </Switch>
    );
  }

  return (
    <AuthenticatedLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/projects/:id" component={ProjectPage} />
        <Route path="/time-tracking" component={TimeTracking} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/settings" component={SettingsPage} />
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
          <AppRouter />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
