import React, { useState, useContext } from 'react';
import { Sun, Moon, Loader2, Bell, Shield, Trash2 } from 'lucide-react';
import { useTheme } from '../../ThemeContext';
import { auth, db } from '../../services/firebase';
import { showMessage, formatFirebaseError } from '../../utils/helpers';
import { AuthContext } from '../../AuthContext';
import { doc, updateDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import ConfirmModal from '../modals/ConfirmModal';

interface SettingsPageProps {
}

const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void; disabled?: boolean }> = ({ checked, onChange, disabled }) => (
    <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" disabled={disabled} />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
    </label>
);

const SettingsPage: React.FC<SettingsPageProps> = () => {
    const { theme, toggleTheme } = useTheme();
    const { user, userProfile } = useContext(AuthContext);

    const [notificationSettings, setNotificationSettings] = useState(userProfile?.notificationSettings ?? { newContent: true, adminReplies: true });
    const [isSavingNotifications, setIsSavingNotifications] = useState(false);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeletingData, setIsDeletingData] = useState(false);

    const handleToggleNotification = async (key: 'newContent' | 'adminReplies') => {
        if (!user) return;
        
        const newSettings = {
            ...notificationSettings,
            [key]: !notificationSettings[key],
        };
        setNotificationSettings(newSettings);
        setIsSavingNotifications(true);
        
        try {
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, { notificationSettings: newSettings });
            showMessage('Notification settings updated.');
        } catch (error) {
            showMessage(formatFirebaseError(error, 'Failed to update settings.'), true);
            setNotificationSettings(prev => ({ ...prev, [key]: !prev[key] })); // Revert on error
        } finally {
            setIsSavingNotifications(false);
        }
    };

    const confirmDeleteAllData = async () => {
        if (!user) return;
        setIsDeletingData(true);
        try {
            const resultsQuery = query(collection(db, 'results'), where('userId', '==', user.uid));
            const querySnapshot = await getDocs(resultsQuery);
            
            if (querySnapshot.empty) {
                showMessage("No test data found to delete.");
                setIsDeleteModalOpen(false);
                setIsDeletingData(false);
                return;
            }
    
            const batch = writeBatch(db);
            querySnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
    
            localStorage.removeItem(`inProgressTest_${user.uid}`);
            
            showMessage("All your test data has been successfully deleted.");
        } catch (error) {
            showMessage(formatFirebaseError(error, "An error occurred while deleting your data."), true);
            console.error(error);
        } finally {
            setIsDeleteModalOpen(false);
            setIsDeletingData(false);
        }
    };


    return (
        <div className="bg-slate-50 dark:bg-slate-900 min-h-full animate-fade-in">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-8">Settings</h1>

                <div className="space-y-8">
                    {/* Appearance Settings */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Appearance</h2>
                        <div className="flex justify-between items-center">
                            <p className="text-gray-600 dark:text-gray-300">Theme</p>
                            <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                <button onClick={toggleTheme} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${theme === 'light' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>
                                    <Sun size={16} /> Light
                                </button>
                                 <button onClick={toggleTheme} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${theme === 'dark' ? 'bg-gray-800 shadow text-white' : 'text-gray-500'}`}>
                                    <Moon size={16} /> Dark
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Notification Settings */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2"><Bell /> Notification Settings</h2>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-medium text-gray-700 dark:text-gray-200">New Tests and Content</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Receive notifications when new tests are added.</p>
                                </div>
                                <ToggleSwitch checked={notificationSettings.newContent ?? true} onChange={() => handleToggleNotification('newContent')} disabled={isSavingNotifications} />
                            </div>
                            <div className="flex justify-between items-center">
                                 <div>
                                    <p className="font-medium text-gray-700 dark:text-gray-200">Admin Replies</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Get notified when an admin replies to your reports.</p>
                                </div>
                                <ToggleSwitch checked={notificationSettings.adminReplies ?? true} onChange={() => handleToggleNotification('adminReplies')} disabled={isSavingNotifications} />
                            </div>
                        </div>
                    </div>

                    {/* Data & Privacy Settings */}
                     <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-red-200 dark:border-red-900/50">
                        <h2 className="text-xl font-bold text-red-800 dark:text-red-400 mb-4 flex items-center gap-2"><Shield /> Data & Privacy</h2>
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-medium text-gray-700 dark:text-gray-200">Delete All My Test Data</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Permanently delete all of your results and performance history.</p>
                            </div>
                             <button onClick={() => setIsDeleteModalOpen(true)} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:bg-red-400 flex items-center gap-2 shadow-sm">
                                <Trash2 size={16}/> Delete Data
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDeleteAllData}
                title="Confirm Data Deletion"
                message="Are you absolutely sure? This will permanently erase all your test results, scores, and performance analytics. This action cannot be undone."
                confirmText={isDeletingData ? "Deleting..." : "Yes, Delete Everything"}
            />
        </div>
    );
};

export default SettingsPage;