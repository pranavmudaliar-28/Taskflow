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
  Clock,
  BarChart3,
  Settings,
  LogOut,
  ChevronUp,
  Plus,
  Bell,
  Kanban,
  Building2,
  FolderKanban,
  ListTodo,
  CreditCard,
} from "lucide-react";
import type { Project } from "@shared/schema";
import { useIsMobile } from "@/hooks/use-mobile";

interface AppSidebarProps {
  projects: Project[];
  onCreateProject: () => void;
}

export function AppSidebar({ projects, onCreateProject }: AppSidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { state } = useSidebar();
  const isMobile = useIsMobile();
  const isCollapsed = state === "collapsed" && !isMobile;

  const mainNavItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "All Tasks",
      url: "/tasks",
      icon: ListTodo,
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
    {
      title: "Organization",
      url: "/organization-settings",
      icon: Building2,
    },
    {
      title: "Billing",
      url: "/billing",
      icon: CreditCard,
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
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shrink-0">
                  <Kanban className="h-3.5 w-3.5 text-white" />
                </div>
                {!isCollapsed && (
                  <div className="grid flex-1 text-left text-sm leading-tight transition-all duration-200">
                    <span className="truncate font-semibold text-sm">TaskFlow Pro</span>
                    <span className="truncate text-[11px] text-muted-foreground">Project Management</span>
                  </div>
                )}
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
                      {!isCollapsed && <span>{item.title}</span>}
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
            {!isCollapsed ? (
              <>
                <span>Spaces</span>
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
                  <TooltipContent side="right">New Space</TooltipContent>
                </Tooltip>
              </>
            ) : (
              <span className="sr-only">Spaces</span>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isCollapsed ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="New Space"
                    onClick={onCreateProject}
                    data-testid="button-create-project-collapsed"
                  >
                    <Plus />
                    <span className="sr-only">New Space</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : projects.length === 0 ? (
                <div className="px-3 py-4 text-center">
                  <p className="text-xs text-sidebar-foreground/60 mb-2">No spaces yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={onCreateProject}
                    data-testid="button-create-first-project"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Create Space
                  </Button>
                </div>
              ) : (
                projects.map((project) => (
                  <SidebarMenuItem key={project.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={
                        location === `/projects/${project.slug || project.id}` ||
                        location === `/projects/${project.id}`
                      }
                      tooltip={project.name}
                      data-testid={`nav-project-${project.id}`}
                    >
                      <Link href={`/projects/${project.slug || project.id}`}>
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
                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-[10px] font-bold">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <>
                      <div className="grid flex-1 text-left text-sm leading-tight transition-all duration-200">
                        <span className="truncate font-semibold">{getUserDisplayName()}</span>
                        <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
                      </div>
                      <ChevronUp className="ml-auto size-4 shrink-0" />
                    </>
                  )}
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
