import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Plus,
  Bell,
  Building2,
  ListTodo,
  CreditCard,
} from "lucide-react";
import type { Project } from "@shared/schema";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  projects: Project[];
  onCreateProject: () => void;
}

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "All Tasks", url: "/tasks", icon: ListTodo },
  { title: "Time Tracking", url: "/time-tracking", icon: Clock },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Organization", url: "/organization-settings", icon: Building2 },
];

const bottomNavItems = [
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Billing", url: "/billing", icon: CreditCard, adminOnly: true },
];

const projectColors = [
  { bg: "bg-blue-500", text: "text-blue-500" },
  { bg: "bg-violet-500", text: "text-violet-500" },
  { bg: "bg-emerald-500", text: "text-emerald-500" },
  { bg: "bg-amber-500", text: "text-amber-500" },
  { bg: "bg-pink-500", text: "text-pink-500" },
  { bg: "bg-cyan-500", text: "text-cyan-500" },
];

export function AppSidebar({ projects, onCreateProject }: AppSidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { state } = useSidebar();
  const isMobile = useIsMobile();

  const isCollapsed = state === "collapsed" && !isMobile;

  const { data: notifications } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30_000,
  });

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

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
    <Sidebar
      collapsible={isMobile ? "offcanvas" : "icon"}
      className="border-r border-slate-100 bg-white"
    >
      <SidebarHeader className="px-4 py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="TaskFlow">
              <Link href="/dashboard">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-transparent shrink-0">
                  <div className="h-2.5 w-2.5 rounded-full bg-violet-600" />
                </div>
                {!isCollapsed && (
                  <div className="flex flex-col text-left">
                    <span className="font-extrabold text-lg text-slate-900 leading-none tracking-tighter">
                      taskflow
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      Project Management
                    </span>
                  </div>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
            Menu
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map((item) => {
                const isActive = location === item.url || location.startsWith(item.url + "/");
                const showBadge = item.title === "Notifications" && unreadCount > 0;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link href={item.url}>
                        <div className="relative shrink-0">
                          <item.icon className={cn("h-4 w-4", isActive ? "text-violet-600" : "text-slate-500")} />
                          {showBadge && isCollapsed && (
                            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 border-2 border-white" />
                          )}
                        </div>

                        <span className="flex-1 text-sm font-medium">{item.title}</span>

                        {showBadge && !isCollapsed && (
                          <span className="ml-auto h-5 min-w-5 flex items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-2" />

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between group-data-[collapsible=icon]:hidden">
            <span>Spaces</span>
            <button
              onClick={onCreateProject}
              className="h-5 w-5 rounded flex items-center justify-center hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Plus className="h-3 w-3" />
            </button>
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {projects.slice(0, 8).map((project, i) => {
                const color = projectColors[i % projectColors.length];
                const isActive =
                  location.startsWith(`/projects/${project.id}`) ||
                  location.startsWith(`/projects/${project.slug}`);

                return (
                  <SidebarMenuItem key={project.id}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={project.name}>
                      <Link href={`/projects/${project.slug || project.id}`}>
                        <div className={`h-2 w-2 rounded-full shrink-0 ${color.bg}`} />
                        <span className="text-sm font-medium truncate">{project.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {!isCollapsed && (
                <SidebarMenuItem>
                  <button
                    onClick={onCreateProject}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg w-full text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-colors text-sm font-medium"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>New Space</span>
                  </button>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-2" />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {bottomNavItems
                .filter((i) => !i.adminOnly || user?.isAdmin)
                .map((item) => {
                  const isActive = location === item.url;

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                        <Link href={item.url}>
                          <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-violet-600" : "text-slate-500")} />
                          <span className="text-sm font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />
      <SidebarFooter className="p-4">
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl p-2 bg-slate-50 border border-slate-100",
            isCollapsed && "justify-center p-1"
          )}
        >
          <div className="relative shrink-0">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback className="bg-violet-600 text-white text-xs font-bold">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white" />
          </div>

          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{getUserDisplayName()}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => logout()}
                className="text-slate-400 hover:text-red-500 transition-colors"
                title="Logout"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
