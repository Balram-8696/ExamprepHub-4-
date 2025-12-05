
import { Timestamp } from 'firebase/firestore';

export const showMessage = (message: string, isError = false) => {
    const el = document.createElement('div');
    el.textContent = message;
    el.className = `fixed top-20 right-4 p-4 rounded-lg text-white font-semibold shadow-xl transition-transform duration-300 translate-x-full z-[100] ${isError ? 'bg-red-600' : 'bg-green-600'}`;
    document.body.appendChild(el);
    
    setTimeout(() => {
        el.style.transform = 'translateX(0)';
    }, 100);

    setTimeout(() => {
        el.style.transform = 'translateX(120%)';
        setTimeout(() => {
            el.remove();
        }, 300);
    }, 4000);
};

export const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// Helper to safely convert various date formats (Timestamp, object, string) to Date
export const safeDate = (val: any): Date => {
    if (!val) return new Date();
    if (val instanceof Timestamp) return val.toDate();
    if (typeof val.toDate === 'function') return val.toDate();
    // Handle serialized Timestamp objects (e.g. from localStorage)
    if (val && typeof val.seconds === 'number') return new Date(val.seconds * 1000);
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
};

export const formatRelativeTime = (timestamp: any): string => {
    const date = safeDate(timestamp);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return `${Math.floor(interval)}y ago`;

    interval = seconds / 2592000;
    if (interval > 1) return `${Math.floor(interval)}mo ago`;

    interval = seconds / 86400;
    if (interval > 1) return `${Math.floor(interval)}d ago`;
    
    interval = seconds / 3600;
    if (interval > 1) return `${Math.floor(interval)}h ago`;

    interval = seconds / 60;
    if (interval > 1) return `${Math.floor(interval)}m ago`;

    return 'Just now';
};

export const formatFirebaseError = (error: unknown, defaultMessage: string = "An unexpected error occurred."): string => {
    if (error instanceof Error) {
        let message = error.message;
        // Check for common Firebase auth codes or messages
        if (message.includes('Firebase: Error (auth/invalid-credential)')) {
            return 'Invalid email or password.';
        }
        if (message.includes('Firebase: Error (auth/email-already-in-use)')) {
            return 'An account with this email already exists.';
        }
        // Check for Firestore permission errors
        if (message.includes('Firebase: Permission denied') || message.includes('Missing or insufficient permissions')) {
            return `${defaultMessage} This might be due to Firebase security rules or your login status.`;
        }
        // General Firebase errors (strip "Firebase: " prefix if present)
        if (message.startsWith('Firebase: ')) {
            return message.replace('Firebase: ', '');
        }
        return message;
    }
    return defaultMessage;
};


export const getStatus = (answer: string | null, isMarked: boolean) => {
    if (answer && isMarked) return 'answered_marked';
    if (answer) return 'answered';
    if (isMarked) return 'marked';
    return 'unattempted';
};

const stringToHash = (str: string): number => {
  if (!str) return 0;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

export const getCategoryStyle = (name: string) => {
    const hash = stringToHash(name);
    const colors = [
        { bg: 'bg-indigo-100', text: 'text-indigo-600' },
        { bg: 'bg-emerald-100', text: 'text-emerald-600' },
        { bg: 'bg-rose-100', text: 'text-rose-600' },
        { bg: 'bg-amber-100', text: 'text-amber-600' },
        { bg: 'bg-sky-100', text: 'text-sky-600' },
        { bg: 'bg-violet-100', text: 'text-violet-600' },
        { bg: 'bg-lime-100', text: 'text-lime-600' },
        { bg: 'bg-pink-100', text: 'text-pink-600' },
        { bg: 'bg-teal-100', text: 'text-teal-600' },
    ];
    return colors[hash % colors.length];
};
