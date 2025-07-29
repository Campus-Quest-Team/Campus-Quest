import { toast } from 'react-toastify';

export function handleJWTError(
    data: any,
    navigate: (path: string) => void
): boolean {
    if (data.error === 'The JWT is no longer valid') {
        toast.error('Session expired. Please log in again.');
        navigate('/login');
        return true;
    }
    return false;
}
