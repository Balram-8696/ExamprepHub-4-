

import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    updateProfile,
    sendPasswordResetEmail
} from 'firebase/auth';
import { auth, db } from '../../services/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { showMessage, formatFirebaseError } from '../../utils/helpers';
import { Loader2 } from 'lucide-react';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialView?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialView = 'signin' }) => {
    const [view, setView] = useState<'signin' | 'signup' | 'forgot'>(initialView);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setView(initialView);
            // Reset form fields and errors when modal opens or view changes
            setError('');
            setName('');
            setEmail('');
            setPassword('');
            setConfirmPassword('');
        } else {
            // Reset to signin view when modal is fully closed
            setTimeout(() => setView('signin'), 300);
        }
    }, [isOpen, initialView]);

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (view === 'signup') {
                if (password !== confirmPassword) {
                    setError("Passwords do not match.");
                    setLoading(false);
                    return;
                }
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                await updateProfile(user, { displayName: name });

                const role = user.email === 'resotainofficial@gmail.com' ? 'admin' : 'user';
                await setDoc(doc(db, 'users', user.uid), {
                    name,
                    email: user.email,
                    createdAt: serverTimestamp(),
                    role: role,
                    mobileNumber: '',
                    notificationSettings: { newContent: true, adminReplies: true },
                });
                showMessage('Sign up successful! Welcome.');
            } else {
                await signInWithEmailAndPassword(auth, email, password);
                showMessage('Welcome back!');
            }
            onClose();
        } catch (err: any) {
            setError(formatFirebaseError(err, 'Sign in/up failed.'));
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await sendPasswordResetEmail(auth, email);
            showMessage('Password reset email sent. Please check your inbox (and spam folder).');
            setView('signin');
        } catch (err: any) {
            setError(formatFirebaseError(err, 'Password reset failed.'));
        } finally {
            setLoading(false);
        }
    };
    
    const handleGoogleSignIn = async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (!userDoc.exists()) {
                const role = user.email === 'resotainofficial@gmail.com' ? 'admin' : 'user';
                await setDoc(userDocRef, {
                    name: user.displayName || user.email!.split('@')[0],
                    email: user.email,
                    createdAt: serverTimestamp(),
                    role: role,
                    mobileNumber: '',
                    notificationSettings: { newContent: true, adminReplies: true },
                });
            }

            showMessage('Successfully signed in with Google!');
            onClose();
        } catch (error: any) {
            showMessage(`Google Sign-In Failed: ${formatFirebaseError(error)}`, true);
        }
    };

    const modalTitle = view === 'signin' ? 'Sign In' : view === 'signup' ? 'Sign Up' : 'Reset Password';

    const inputClasses = "w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100";
    const labelClasses = "block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
            {view === 'forgot' ? (
                <form onSubmit={handlePasswordReset} className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Enter your email address and we will send you a link to reset your password.</p>
                    <div>
                        <label htmlFor="user-email" className={labelClasses}>Email</label>
                        <input type="email" id="user-email" value={email} onChange={e => setEmail(e.target.value)} className={inputClasses} required />
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 text-white text-lg font-semibold rounded-lg flex justify-center items-center shadow-md hover:bg-indigo-700 transition-all disabled:bg-indigo-400">
                        {loading ? <Loader2 className="spinner w-6 h-6"/> : 'Send Reset Link'}
                    </button>
                    <button type="button" onClick={() => setView('signin')} className="w-full text-center text-sm text-indigo-600 dark:text-indigo-400 hover:underline mt-2">
                        Back to Sign In
                    </button>
                </form>
            ) : (
                <>
                    <form onSubmit={handleEmailAuth} className="space-y-4">
                        {view === 'signup' && (
                             <div>
                                <label htmlFor="user-name" className={labelClasses}>Name</label>
                                <input type="text" id="user-name" value={name} onChange={e => setName(e.target.value)} className={inputClasses} required />
                            </div>
                        )}
                        <div>
                            <label htmlFor="user-email" className={labelClasses}>Email</label>
                            <input type="email" id="user-email" value={email} onChange={e => setEmail(e.target.value)} className={inputClasses} required />
                        </div>
                        <div>
                            <label htmlFor="user-password" className={labelClasses}>Password</label>
                            <input type="password" id="user-password" value={password} onChange={e => setPassword(e.target.value)} className={inputClasses} required />
                        </div>
                        {view === 'signup' && (
                            <div>
                                <label htmlFor="confirm-password" className={labelClasses}>Confirm Password</label>
                                <input type="password" id="confirm-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClasses} required />
                            </div>
                        )}
                        {view === 'signin' && (
                            <div className="text-right -mb-2">
                                <button type="button" onClick={() => setView('forgot')} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                                    Forgot Password?
                                </button>
                            </div>
                        )}
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 text-white text-lg font-semibold rounded-lg flex justify-center items-center shadow-md hover:bg-indigo-700 transition-all disabled:bg-indigo-400">
                            {loading ? <Loader2 className="spinner w-6 h-6"/> : (view === 'signup' ? 'Sign Up' : 'Sign In')}
                        </button>
                        <button type="button" onClick={() => setView(view === 'signup' ? 'signin' : 'signup')} className="w-full text-center text-sm text-indigo-600 dark:text-indigo-400 hover:underline mt-2">
                            {view === 'signup' ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
                        </button>
                    </form>
                    <div className="relative my-5"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300 dark:border-gray-600"></div></div><div className="relative flex justify-center text-sm"><span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or</span></div></div>
                    <button onClick={handleGoogleSignIn} className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition">
                        <svg className="w-5 h-5 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.
