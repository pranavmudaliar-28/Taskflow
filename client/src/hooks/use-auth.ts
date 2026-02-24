import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryClient as globalQueryClient } from "@/lib/queryClient";
import type { User } from "@shared/models/auth";

async function fetchUser(): Promise<User | null> {
  console.log("[Auth] Fetching user session status...");
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  if (response.status === 401) {
    console.log("[Auth] Session status: Unauthorized (401)");
    return null;
  }

  if (!response.ok) {
    console.error(`[Auth] Session status error: ${response.status}`);
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  const user = await response.json();
  console.log("[Auth] Session status: Authenticated", { userId: user.id });
  return user;
}

async function logout(): Promise<void> {
  console.log("[Logout] Starting frontend logout cleanup...");
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    console.log("[Logout] Backend logout API call successful");
  } catch (error) {
    console.error("[Logout] Backend logout API call failed", error);
  }

  // Clear frontend storage
  console.log("[Logout] Clearing localStorage and sessionStorage");
  localStorage.clear();
  sessionStorage.clear();

  // Clear all readable cookies
  console.log("[Logout] Clearing all readable cookies");
  document.cookie.split(";").forEach((c) => {
    document.cookie = c
      .replace(/^ +/, "")
      .replace(/=.*/, "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/");
  });

  // Wipe entire React Query cache to prevent stale data visibility
  console.log("[Logout] Clearing globalQueryClient cache");
  globalQueryClient.clear();

  // Use a hard redirect with a failsafe flag to break auto-login loops
  console.log("[Logout] Performing hard failsafe redirect to /login?logout=1");
  window.location.href = "/login?logout=1";
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 0, // Force fresh check on mount to catch logout state
    refetchOnWindowFocus: true,
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
