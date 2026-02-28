import { QueryClient, QueryFunction, QueryCache, MutationCache } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    if (res.status === 401) {
      queryClient.setQueryData(["/api/auth/user"], null);

      // Prevent redirect loop if we're already on an auth page, 
      // or if we're on a deep page and just need to show login (without hard reload if possible)
      const isAuthPage = ["/", "/login", "/signup"].includes(window.location.pathname);
      const isCallback = window.location.pathname === "/api/callback";

      if (!isAuthPage && !isCallback) {
        window.location.href = "/login";
      }
    }
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const res = await fetch(queryKey.join("/") as string, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    };

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Don't toast for authorization checks since we handle redirects in the fetcher
      if (query.meta?.silentError) return;

      console.error(`[Query Error] ${query.queryKey.join("/")}:`, error);

      // We don't toast for all queries to avoid spamming, 
      // but mutations should always toast.
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      console.error("[Mutation Error]", error);
      toast({
        title: "Action failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    },
  }),
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
