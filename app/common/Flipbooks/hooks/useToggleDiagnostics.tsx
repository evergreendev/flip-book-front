import { useEffect, useState } from 'react';

export function useToggleDiagnostics(toggleKey: string = '~') {
    const [showDiagnostics, setShowDiagnostics] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === toggleKey) {
                setShowDiagnostics(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggleKey]);

    return showDiagnostics;
}
