import { useEffect } from 'react';

/**
 * useScrollLock
 * Locks body scroll (and touch scrolling on iOS) when a modal is open.
 * Uses a reference counter so stacked modals all keep scroll locked
 * until the LAST one closes.
 */

let lockCount = 0;

const useScrollLock = (isLocked) => {
    useEffect(() => {
        if (!isLocked) return;

        lockCount += 1;

        if (lockCount === 1) {
            // Compensate for scrollbar width to avoid layout shift
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
            document.body.style.overflow = 'hidden';
            document.body.style.touchAction = 'none'; // iOS Safari
            if (scrollbarWidth > 0) {
                document.body.style.paddingRight = `${scrollbarWidth}px`;
            }
        }

        return () => {
            lockCount -= 1;
            if (lockCount <= 0) {
                lockCount = 0;
                document.body.style.overflow = '';
                document.body.style.touchAction = '';
                document.body.style.paddingRight = '';
            }
        };
    }, [isLocked]);
};

export default useScrollLock;
