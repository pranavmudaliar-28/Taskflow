import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  FolderKanban,
  Clock,
  BarChart3,
  Settings,
  LogOut,
  ChevronUp,
  Plus,
  Bell,
  Kanban,
} from "lucide-react";
import type { Project } from "@shared/schema";

interface AppSidebarProps {
  projects: Project[];
  onCreateProject: () => void;
}

export function AppSidebar({ projects, onCreateProject }: AppSidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const mainNavItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Time Tracking",
      url: "/time-tracking",
      icon: Clock,
    },
    {
      title: "Analytics",
      url: "/analytics",
      icon: BarChart3,
    },
  ];

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
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="TaskFlow Pro">
              <Link href="/dashboard">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary shrink-0">
                  <Kanban className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold text-sm">TaskFlow Pro</span>
                  <span className="text-xs text-muted-foreground">Project Management</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    tooltip={item.title}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>
            <span>Projects</span>
            {!isCollapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onCreateProject}
                    data-testid="button-create-project"
                    className="ml-auto"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">New Project</TooltipContent>
              </Tooltip>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isCollapsed ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="New Project"
                    onClick={onCreateProject}
                    data-testid="button-create-project-collapsed"
                  >
                    <Plus />
                    <span>New Project</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : projects.length === 0 ? (
                <div className="px-3 py-4 text-center">
                  <p className="text-xs text-sidebar-foreground/60 mb-2">No projects yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={onCreateProject}
                    data-testid="button-create-first-project"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Create Project
                  </Button>
                </div>
              ) : (
                projects.map((project) => (
                  <SidebarMenuItem key={project.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === `/projects/${project.id}`}
                      tooltip={project.name}
                      data-testid={`nav-project-${project.id}`}
                    >
                      <Link href={`/projects/${project.id}`}>
                        <FolderKanban />
                        <span className="truncate">{project.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  data-testid="button-user-menu"
                >
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarImage src={user?.profileImageUrl || undefined} alt={getUserDisplayName()} />
                    <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-left flex-1 min-w-0">
                    <span className="text-sm font-medium truncate w-full">{getUserDisplayName()}</span>
                    <span className="text-xs text-sidebar-foreground/60 truncate w-full">{user?.email}</span>
                  </div>
                  <ChevronUp className="h-4 w-4 shrink-0" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/settings" data-testid="menu-settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/notifications" data-testid="menu-notifications">
                    <Bell className="h-4 w-4 mr-2" />
                    Notifications
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => logout()}
                  className="text-destructive focus:text-destructive"
                  data-testid="menu-logout"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
