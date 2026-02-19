import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface OptimisticUpdateOptions<TData, TVariables> {
    mutationFn: (variables: TVariables) => Promise<TData>;
    queryKey: string[];
    updateFn: (oldData: any, variables: TVariables) => any;
    successMessage?: string;
    errorMessage?: string;
}

/**
 * Hook for implementing optimistic updates with automatic rollback on error
 * 
 * @example
 * const updateTask = useOptimisticUpdate({
 *   mutationFn: (task) => apiRequest('PATCH', `/api/tasks/${task.id}`, task),
 *   queryKey: ['/api/tasks'],
 *   updateFn: (oldTasks, updatedTask) => 
 *     oldTasks.map(t => t.id === updatedTask.id ? updatedTask : t),
 *   successMessage: 'Task updated',
 * });
 */
export function useOptimisticUpdate<TData = any, TVariables = any>({
    mutationFn,
    queryKey,
    updateFn,
    successMessage,
    errorMessage = 'Update failed',
}: OptimisticUpdateOptions<TData, TVariables>) {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn,

        // Before mutation - optimistically update the cache
        onMutate: async (variables: TVariables) => {
            // Cancel any outgoing refetches to avoid overwriting optimistic update
            await queryClient.cancelQueries({ queryKey });

            // Snapshot the previous value
            const previousData = queryClient.getQueryData(queryKey);

            // Optimistically update to the new value
            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old) return old;
                return updateFn(old, variables);
            });

            // Return context with the snapshotted value
            return { previousData };
        },

        // On error - rollback to previous value
        onError: (err, variables, context: any) => {
            if (context?.previousData) {
                queryClient.setQueryData(queryKey, context.previousData);
            }

            toast({
                title: 'Error',
                description: errorMessage,
                variant: 'destructive',
            });

            console.error('Optimistic update failed:', err);
        },

        // On success - show success message and refetch to ensure sync
        onSuccess: (data) => {
            if (successMessage) {
                toast({
                    title: 'Success',
                    description: successMessage,
                });
            }
        },

        // Always refetch after error or success to ensure we have the latest data
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });
}

/**
 * Hook for optimistic task status updates
 */
export function useOptimisticTaskUpdate() {
    return useOptimisticUpdate({
        mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
            const response = await fetch(`/api/tasks/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(updates),
            });
            if (!response.ok) throw new Error('Failed to update task');
            return response.json();
        },
        queryKey: ['/api/tasks'],
        updateFn: (oldTasks: any[], { id, updates }: { id: string; updates: any }) => {
            return oldTasks.map(task =>
                task.id === id ? { ...task, ...updates } : task
            );
        },
        successMessage: 'Task updated',
    });
}

/**
 * Hook for optimistic project updates
 */
export function useOptimisticProjectUpdate() {
    return useOptimisticUpdate({
        mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
            const response = await fetch(`/api/projects/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(updates),
            });
            if (!response.ok) throw new Error('Failed to update project');
            return response.json();
        },
        queryKey: ['/api/projects'],
        updateFn: (oldProjects: any[], { id, updates }: { id: string; updates: any }) => {
            return oldProjects.map(project =>
                project.id === id ? { ...project, ...updates } : project
            );
        },
        successMessage: 'Project updated',
    });
}
