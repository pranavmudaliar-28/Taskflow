import { lazy, ComponentType } from 'react';

/**
 * A wrapper for React.lazy that automatically reloads the page 
 * if a dynamic import fails due to a chunk load error.
 */
export function lazyRetry<T extends ComponentType<any>>(
    factory: () => Promise<{ default: T }>
) {
    return lazy(() =>
        factory().catch((error) => {
            const errorMessage = (error?.message || String(error) || '').toLowerCase();

            const isChunkLoadError =
                errorMessage.includes('failed to fetch dynamically imported module') ||
                errorMessage.includes('css_chunk_load_failed') ||
                errorMessage.includes('loading chunk') ||
                errorMessage.includes('module not found') ||
                errorMessage.includes('script error');

            if (isChunkLoadError) {
                const RELOAD_KEY = 'last_chunk_load_reload';
                const now = Date.now();
                const lastReload = sessionStorage.getItem(RELOAD_KEY);

                // Only reload if we haven't reloaded in the last 10 seconds
                if (!lastReload || (now - parseInt(lastReload) > 10000)) {
                    sessionStorage.setItem(RELOAD_KEY, now.toString());
                    window.location.reload();
                    // Return a placeholder that won't be rendered anyway due to reload
                    return { default: (() => null) as unknown as T };
                }
            }

            throw error;
        })
    );
}
