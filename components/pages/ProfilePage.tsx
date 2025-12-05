import React, { useContext, useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, Timestamp, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import { updateProfile, updatePassword } from 'firebase/auth';
import { db, auth } from '../../services/firebase';
import { AuthContext } from '../../AuthContext';
import { UserResult } from '../../types';
import { showMessage, formatFirebaseError } from '../../utils/helpers';
import { 
    User, Inbox, Award, TrendingUp, BookOpen, Save, Loader2, 
    CheckCircle, XCircle, Target, Shield, KeyRound, 
    LayoutDashboard, Settings, BarChart2, Calendar, Medal, Trash2, Phone
} from 'lucide-react';
import SkeletonProfile from '../skeletons/SkeletonProfile';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend } from 'recharts';
import ConfirmModal from '../modals/ConfirmModal';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

interface ProfilePageProps { }

type TabType = 'overview' | 'analytics' | 'settings';

const ProfilePage: React.FC<ProfilePageProps> = () => {
    const { user, userProfile } = useContext(AuthContext);
    const [results, setResults] = useState<UserResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('overview');

    // Settings Forms State
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeletingData, setIsDeletingData] = useState(false);

    useEffect(() => {
        if (userProfile) {
            setName(userProfile.name || '');
            setMobile(userProfile.mobileNumber || '');
        }
    }, [userProfile]);

    useEffect(() => {
        if (user) {
            setLoading(true);
            const q = query(collection(db, 'results'), where("userId", "==", user.uid), orderBy('submittedAt', 'desc'));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const resultsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserResult));
                setResults(resultsData);
                setLoading(false);
            }, (error) => {
                console.error("Error fetching results:", error);
                setLoading(false);
            });
            return () => unsubscribe();
        } else {
            setResults([]);
            setLoading(false);
        }
    }, [user]);

    // --- Calculations & Analytics ---

    const stats = useMemo(() => {
        const totalTests = results.length;
        if (totalTests === 0) return { totalTests: 0, averageScore: 0, highestScore: 0, totalCorrect: 0, totalQuestions: 0, accuracy: 0 };

        const averageScore = results.reduce((sum, r) => sum + r.percentage, 0) / totalTests;
        const highestScore = Math.max(...results.map(r => r.percentage));
        const totalCorrect = results.reduce((sum, r) => sum + r.correctCount, 0);
        const totalQuestionsAttempted = results.reduce((sum, r) => sum + (r.correctCount + r.incorrectCount), 0);
        const accuracy = totalQuestionsAttempted > 0 ? (totalCorrect / totalQuestionsAttempted) * 100 : 0;
        
        return { totalTests, averageScore, highestScore, totalCorrect, totalQuestions: totalQuestionsAttempted, accuracy };
    }, [results]);

    const progressData = useMemo(() => {
        // Take last 10 results, reverse for chronological order
        return [...results].reverse().slice(-10).map((r, i) => ({
            name: `Test ${i + 1}`,
            score: r.percentage,
            date: r.submittedAt instanceof Timestamp ? r.submittedAt.toDate().toLocaleDateString() : ''
        }));
    }, [results]);

    const categoryPerformance = useMemo(() => {
        const catMap: Record<string, { total: number, count: number }> = {};
        results.forEach(r => {
            const cat = r.categoryName || 'Uncategorized';
            if (!catMap[cat]) catMap[cat] = { total: 0, count: 0 };
            catMap[cat].total += r.percentage;
            catMap[cat].count += 1;
        });
        return Object.keys(catMap).map(key => ({
            name: key,
            average: Math.round(catMap[key].total / catMap[key].count)
        })).sort((a, b) => b.average - a.average);
    }, [results]);

    const badges = useMemo(() => {
        const b = [];
        if (stats.totalTests >= 1) b.push({ icon: FlagIcon, label: 'First Step', color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' });
        if (stats.totalTests >= 5) b.push({ icon: BookOpen, label: 'Dedicated', color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/30' });
        if (stats.totalTests >= 20) b.push({ icon: TrophyIcon, label: 'Scholar', color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' });
        if (stats.highestScore >= 80) b.push({ icon: Target, label: 'Sharpshooter', color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' });
        if (stats.highestScore === 100) b.push({ icon: CrownIcon, label: 'Perfectionist', color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' });
        if (stats.accuracy > 90 && stats.totalTests > 2) b.push({ icon: ZapIcon, label: 'Laser Focus', color: 'text-rose-500', bg: 'bg-rose-100 dark:bg-rose-900/30' });
        return b;
    }, [stats]);

    // --- Handlers ---

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSavingProfile(true);
        try {
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, { name: name, mobileNumber: mobile });
            if (auth.currentUser) await updateProfile(auth.currentUser, { displayName: name });
            showMessage('Profile updated successfully!');
        } catch (error) {
            showMessage(formatFirebaseError(error, 'Failed to update profile.'), true);
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) { showMessage("Password too short.", true); return; }
        if (newPassword !== confirmNewPassword) { showMessage("Passwords do not match.", true); return; }
        if (!auth.currentUser) return;
        
        setIsSavingPassword(true);
        try {
            await updatePassword(auth.currentUser, newPassword);
            showMessage('Password updated successfully.');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (err: any) {
            let message = formatFirebaseError(err);
            if (message.includes('requires-recent-login')) message = "Please sign out and sign in again to change password.";
            showMessage(message, true);
        } finally {
            setIsSavingPassword(false);
        }
    };

    const confirmDeleteAllData = async () => {
        if (!user) return;
        setIsDeletingData(true);
        try {
            const resultsQuery = query(collection(db, 'results'), where('userId', '==', user.uid));
            const querySnapshot = await getDocs(resultsQuery);
            const batch = writeBatch(db);
            querySnapshot.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            localStorage.removeItem(`inProgressTest_${user.uid}`);
            showMessage("All test history deleted.");
            setResults([]); // Clear local state
        } catch (error) {
            showMessage("Failed to delete data.", true);
        } finally {
            setIsDeleteModalOpen(false);
            setIsDeletingData(false);
        }
    };

    // --- Render Helpers ---

    if (loading) return <SkeletonProfile />;
    
    if (!user || !userProfile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-xl">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Please Log In</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">Log in to view your profile dashboard.</p>
                </div>
            </div>
        );
    }

    const TabButton = ({ id, label, icon: Icon }: { id: TabType; label: string; icon: React.ElementType }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === id 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
        >
            <Icon size={16} />
            {label}
        </button>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 h-40 sm:h-48 w-full relative">
                <div className="absolute -bottom-16 sm:-bottom-12 left-0 right-0 px-4 flex flex-col sm:flex-row items-center sm:items-end justify-center sm:justify-start max-w-6xl mx-auto">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white dark:bg-gray-800 p-1 shadow-xl z-10">
                        <div className="w-full h-full rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-3xl sm:text-4xl font-bold text-indigo-600 dark:text-indigo-300">
                            {userProfile.name.charAt(0).toUpperCase()}
                        </div>
                    </div>
                    <div className="mt-3 sm:mb-3 sm:ml-4 text-center sm:text-left">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white sm:text-white sm:drop-shadow-md">{userProfile.name}</h1>
                        <p className="text-gray-600 dark:text-gray-300 sm:text-indigo-100 text-sm font-medium sm:opacity-90">{userProfile.email}</p>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-16">
                {/* Navigation Tabs */}
                <div className="flex overflow-x-auto gap-2 mb-8 border-b border-gray-200 dark:border-gray-700 pb-2 pretty-scrollbar">
                    <TabButton id="overview" label="Overview" icon={LayoutDashboard} />
                    <TabButton id="analytics" label="Analytics" icon={BarChart2} />
                    <TabButton id="settings" label="Settings" icon={Settings} />
                </div>

                {/* TAB: OVERVIEW */}
                {activeTab === 'overview' && (
                    <div className="space-y-8 animate-fade-in">
                        {/* Key Stats */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            <StatCard icon={Inbox} label="Tests Taken" value={stats.totalTests} color="text-blue-600" bg="bg-blue-50 dark:bg-blue-900/20" />
                            <StatCard icon={Target} label="Average Score" value={`${stats.averageScore.toFixed(0)}%`} color="text-indigo-600" bg="bg-indigo-50 dark:bg-indigo-900/20" />
                            <StatCard icon={Award} label="Highest Score" value={`${stats.highestScore.toFixed(0)}%`} color="text-amber-600" bg="bg-amber-50 dark:bg-amber-900/20" />
                            <StatCard icon={CheckCircle} label="Accuracy" value={`${stats.accuracy.toFixed(0)}%`} color="text-emerald-600" bg="bg-emerald-50 dark:bg-emerald-900/20" />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Badges Section */}
                            <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2"><Medal size={20} className="text-amber-500"/> Achievements</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {badges.length > 0 ? badges.map((badge, i) => (
                                        <div key={i} className={`p-3 rounded-lg ${badge.bg} flex flex-col items-center text-center transition-transform hover:scale-105`}>
                                            <badge.icon className={`w-8 h-8 mb-2 ${badge.color}`} />
                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{badge.label}</span>
                                        </div>
                                    )) : (
                                        <p className="col-span-2 text-sm text-gray-500 text-center py-4">Complete tests to earn badges!</p>
                                    )}
                                </div>
                            </div>

                            {/* Recent Activity */}
                            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2"><Calendar size={20} className="text-indigo-500"/> Recent Activity</h3>
                                <div className="space-y-3 max-h-80 overflow-y-auto pretty-scrollbar">
                                    {results.slice(0, 8).map(r => (
                                        <div key={r.id} className="flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg border border-transparent hover:border-gray-100 dark:hover:border-gray-700 transition-all">
                                            <div className="min-w-0 flex-1 mr-4">
                                                <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm truncate">{r.testTitle}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{r.categoryName} • {r.submittedAt && (r.submittedAt as Timestamp).toDate().toLocaleDateString()}</p>
                                            </div>
                                            <div className={`font-bold text-sm flex-shrink-0 ${r.percentage >= 80 ? 'text-green-600' : r.percentage >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                                {r.percentage.toFixed(0)}%
                                            </div>
                                        </div>
                                    ))}
                                    {results.length === 0 && <p className="text-gray-500 text-center py-4 text-sm">No recent activity.</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: ANALYTICS */}
                {activeTab === 'analytics' && (
                    <div className="space-y-8 animate-fade-in">
                        {results.length < 2 ? (
                            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                                <BarChart2 className="w-12 h-12 text-gray-300 mx-auto mb-3"/>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Not Enough Data</h3>
                                <p className="text-gray-500 dark:text-gray-400">Complete at least 2 tests to unlock performance analytics.</p>
                            </div>
                        ) : (
                            <>
                                {/* Progress Line Chart */}
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                    <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2"><TrendingUp size={20} className="text-indigo-500"/> Score Progression</h3>
                                    <div className="h-72 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={progressData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                                <XAxis dataKey="date" tick={{fontSize: 12}} stroke="#9ca3af" />
                                                <YAxis domain={[0, 100]} tick={{fontSize: 12}} stroke="#9ca3af" />
                                                <Tooltip 
                                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                                />
                                                <Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Category Performance Bar Chart */}
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                    <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2"><Target size={20} className="text-emerald-500"/> Subject-wise Performance (Avg %)</h3>
                                    <div className="h-72 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={categoryPerformance} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                                <XAxis dataKey="name" tick={{fontSize: 12}} stroke="#9ca3af" />
                                                <YAxis domain={[0, 100]} tick={{fontSize: 12}} stroke="#9ca3af" />
                                                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                                                <Bar dataKey="average" radius={[4, 4, 0, 0]}>
                                                    {categoryPerformance.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* TAB: SETTINGS */}
                {activeTab === 'settings' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                        {/* Edit Profile */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2"><User size={20}/> Edit Profile</h3>
                            <form onSubmit={handleSaveProfile} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mobile Number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                        <input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="+1 234 567 890" className="w-full pl-10 p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                                    </div>
                                </div>
                                <button type="submit" disabled={isSavingProfile} className="w-full py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 flex justify-center items-center gap-2 transition-all shadow-sm">
                                    {isSavingProfile ? <Loader2 className="animate-spin" /> : <Save size={18} />} Save Changes
                                </button>
                            </form>
                        </div>

                        {/* Security */}
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2"><Shield size={20}/> Security</h3>
                                <form onSubmit={handlePasswordChange} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                                        <div className="relative">
                                            <KeyRound className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full pl-10 p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="••••••••" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
                                        <div className="relative">
                                            <KeyRound className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                            <input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} className="w-full pl-10 p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="••••••••" />
                                        </div>
                                    </div>
                                    <button type="submit" disabled={isSavingPassword} className="w-full py-2.5 bg-gray-800 dark:bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-900 dark:hover:bg-gray-600 disabled:opacity-50 flex justify-center items-center gap-2 transition-all shadow-sm">
                                        {isSavingPassword ? <Loader2 className="animate-spin" /> : 'Update Password'}
                                    </button>
                                </form>
                            </div>
                            
                            <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl border border-red-100 dark:border-red-800">
                                <h3 className="font-bold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2"><Trash2 size={20}/> Danger Zone</h3>
                                <p className="text-sm text-red-600 dark:text-red-300 mb-4">Permanently delete all your test results and analytics history. This cannot be undone.</p>
                                <button onClick={() => setIsDeleteModalOpen(true)} className="text-sm font-bold text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 underline decoration-red-300">
                                    Delete All My Data
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

             <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDeleteAllData}
                title="Confirm Data Deletion"
                message="Are you absolutely sure? This will wipe all your test attempts, scores, and badges permanently."
                confirmText={isDeletingData ? "Deleting..." : "Yes, Delete Everything"}
            />
        </div>
    );
};

const StatCard: React.FC<{ icon: React.ElementType; label: string; value: string | number; color: string; bg: string }> = ({ icon: Icon, label, value, color, bg }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4 transition-transform hover:scale-105">
        <div className={`p-3 rounded-lg ${bg} ${color} flex-shrink-0`}>
            <Icon size={24} />
        </div>
        <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
        </div>
    </div>
);

// Icon Components for Badges
const FlagIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>;
const TrophyIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>;
const CrownIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>;
const ZapIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;

export default ProfilePage;