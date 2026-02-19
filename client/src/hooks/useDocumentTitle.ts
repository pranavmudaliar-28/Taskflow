import { useEffect, useRef } from 'react';

interface UseDocumentTitleOptions {
    prefix?: string;
    suffix?: string;
}

/**
 * Hook to update the browser tab title
 * Useful for showing timer status, notification counts, etc.
 * 
 * @example
 * useDocumentTitle('Dashboard');
 * useDocumentTitle('⏱️ 01:23:45', { suffix: 'TaskFlow' });
 */
export function useDocumentTitle(title: string, options: UseDocumentTitleOptions = {}) {
    const { prefix = '', suffix = 'TaskFlow Pro' } = options;
    const originalTitle = useRef(document.title);

    useEffect(() => {
        const parts = [prefix, title, suffix].filter(Boolean);
        document.title = parts.join(' | ');

        return () => {
            document.title = originalTitle.current;
        };
    }, [title, prefix, suffix]);
}

/**
 * Hook to format and update document title with a timer
 * 
 * @example
 * useTimerDocumentTitle(elapsedSeconds, isRunning);
 */
export function useTimerDocumentTitle(elapsedSeconds: number, isRunning: boolean) {
    const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const title = isRunning
        ? `⏱️ ${formatTime(elapsedSeconds)}`
        : 'Time Tracking';

    useDocumentTitle(title);
}
