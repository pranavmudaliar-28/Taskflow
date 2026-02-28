import { lazy, ComponentType } from 'react';

/**
 * A wrapper for React.lazy that propagates dynamic import failures to the
 * nearest ErrorBoundary instead of triggering silent reloads or returning a
 * null component (which produced blank screens).
 *
 * Previously this function called window.location.reload() and returned
 * { default: () => null } on chunk-load errors, causing either an infinite
 * reload loop or a guaranteed blank page. Now we always let the error bubble
 * to ErrorBoundary so the user sees a recoverable error card.
 */
export function lazyRetry<T extends ComponentType<any>>(
    factory: () => Promise<{ default: T }>
) {
    // Add debugging context to track the factory creation
    const factoryString = factory.toString();
    const componentNameMatch = factoryString.match(/import\(['"]([^'"]+)['"]\)/);
    const componentName = componentNameMatch ? componentNameMatch[1] : 'unknown';

    return lazy(() => {
        console.log(`[lazyRetry] Starting import for: ${componentName}`);
        const promise = factory();

        promise.then(() => {
            console.log(`[lazyRetry] Successfully loaded: ${componentName}`);
        }).catch((error) => {
            console.error(`[lazyRetry] Failed to load: ${componentName}`, error);
            // Always re-throw so ErrorBoundary can catch and display the error.
            throw error;
        });

        return promise;
    });
}
