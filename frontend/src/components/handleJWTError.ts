import { toast } from 'react-toastify';

let hasShownJWTError = false;

export function handleJWTError(
    data: any,
    navigate: (path: string) => void
): boolean {
    if (data.error === 'The JWT is no longer valid') {
        if (!hasShownJWTError) {
            hasShownJWTError = true;
            toast.error('Session expired. Please log in again.');
            navigate('/login');
        }
        return true;
    }
    return false;
}

export function resetJWTErrorToast() {
    hasShownJWTError = false;
}