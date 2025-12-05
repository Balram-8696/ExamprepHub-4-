import React, { useState } from 'react';
import Modal from './Modal';
import { updatePassword } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { showMessage, formatFirebaseError } from '../../utils/helpers';
import { Loader2 } from 'lucide-react';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth.currentUser) {
            setError("No user is signed in.");
            return;
        }
        setLoading(true);
        setError('');
        try {
            await updatePassword(auth.currentUser, newPassword);
            showMessage('Password updated successfully.');
            onClose();
            setNewPassword('');
        } catch (err: any) {
            setError(formatFirebaseError(err, err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Change Password" size="sm">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="new-password" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">New Password</label>
                    <input type="password" id="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" required />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 text-white text-lg font-semibold rounded-lg flex justify-center items-center shadow-md hover:bg-indigo-700 transition-all disabled:bg-indigo-400">
                     {loading ? <Loader2 className="spinner w-6 h-6"/> : 'Update Password'}
                </button>
            </form>
        </Modal>
    );
};

export default ChangePasswordModal;