
import React, { useState, useContext, useRef, useEffect } from 'react';
import { LogIn, User as UserIcon, Menu, User as UserViewIcon, Search, Sun, Moon, Bell, Newspaper, MessageSquare, MessageCircle, ArrowLeft, LayoutDashboard, History, LogOut, Settings, Radio } from 'lucide-react';
import { AuthContext } from '../../AuthContext';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../services/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { showMessage, formatRelativeTime } from '../../utils/helpers';
import { useTheme } from '../../ThemeContext';
import { Notification } from '../../types';

interface HeaderProps {
    onNavigate: (view: string) => void;
    onMenuClick: () => void;
    isAdminView: boolean;
    onSwitchToUserView: () => void;
    searchQuery: string;
    onSearch: (query: string) => void;
    notifications: Notification[];
    onOpenChat: () => void;
    onMarkAsRead: (ids: string[]) => void;
    onNotificationClick: (notification: Notification) => void;
    onOpenAuthModal: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
    onNavigate, onMenuClick, isAdminView, onSwitchToUserView, searchQuery, onSearch,
    notifications, onOpenChat, onMarkAsRead, onNotificationClick, onOpenAuthModal
}) => {
    const { user, userProfile } = useContext(AuthContext);
    const { theme, toggleTheme } = useTheme();
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const [hasLiveExams, setHasLiveExams] = useState(false);
    
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const notificationsMenuRef = useRef<HTMLDivElement>(null);

    const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    // Check for live exams to show indicator
    useEffect(() => {
        const checkLiveExams = async () => {
            const now = new Date();
            const q = query(collection(db, 'tests'), where('isLive', '==', true));
            const snap = await getDocs(q);
            let isLive = false;
            snap.forEach(doc => {
                const data = doc.data();
                const from = data.liveFrom instanceof Timestamp ? data.liveFrom.toDate() : new Date(data.liveFrom || 0);
                const until = data.liveUntil instanceof Timestamp ? data.liveUntil.toDate() : new Date(data.liveUntil || 0);
                if (now >= from && now <= until) {
                    isLive = true;
                }
            });
            setHasLiveExams(isLive);
        };
        
        if (!isAdminView) {
            checkLiveExams();
            const interval = setInterval(checkLiveExams, 60000); // Check every minute
            return () => clearInterval(interval);
        }
    }, [isAdminView]);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (localSearchQuery !== searchQuery) {
                onSearch(localSearchQuery);
            }
        }, 300);
        return () => { clearTimeout(handler); };
    }, [localSearchQuery, onSearch, searchQuery]);

    useEffect(() => { setLocalSearchQuery(searchQuery); }, [searchQuery]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setProfileDropdownOpen(false);
            }
            if (notificationsMenuRef.current && !notificationsMenuRef.current.contains(event.target as Node)) {
                setNotificationsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const handleToggleNotifications = () => {
        const newOpenState = !notificationsOpen;
        setNotificationsOpen(newOpenState);
        if (newOpenState && unreadCount > 0) {
            const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
            onMarkAsRead(unreadIds);
        }
    };
    
    const handleMobileSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch(localSearchQuery);
        setMobileSearchOpen(false);
    };

    const handleLogout = () => {
        signOut(auth).then(() => {
            showMessage('You have been logged out.');
            onNavigate('home');
        }).catch((error) => {
            showMessage(`Logout failed: ${error.message}`, true);
        });
        setProfileDropdownOpen(false);
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl transition-all duration-300 supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-900/60">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex justify-between items-center gap-2 sm:gap-4">
                
                {/* Left Side: Logo & Desktop Nav */}
                <div className="flex items-center gap-2 sm:gap-6 lg:gap-8">
                    <div className="flex items-center gap-2 sm:gap-3">
                        {!isAdminView && (
                            <button onClick={onMenuClick} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden transition-colors" aria-label="Open menu">
                                <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                            </button>
                        )}
                        <button onClick={() => onNavigate('home')} className="flex items-center gap-2 group focus:outline-none">
                            <div className="bg-indigo-600 text-white p-1.5 rounded-lg group-hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200 dark:shadow-none">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
                                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                            <span className="text-lg sm:text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 tracking-tight">
                                ExamHub
                            </span>
                        </button>
                    </div>

                    {/* Desktop Navigation Links */}
                    {!isAdminView && (
                        <nav className="hidden md:flex items-center gap-1">
                            <button 
                                onClick={() => onNavigate('home')}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-all"
                            >
                                <LayoutDashboard size={18} className="opacity-70" /> Dashboard
                            </button>
                            <button 
                                onClick={() => onNavigate('live-exams')}
                                className="relative flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-all"
                            >
                                <Radio size={18} className={`opacity-70 ${hasLiveExams ? 'text-red-500' : ''}`} /> Live Exams
                                {hasLiveExams && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>}
                            </button>
                            <button 
                                onClick={() => onNavigate('updates')}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-all"
                            >
                                <Newspaper size={18} className="opacity-70" /> Updates
                            </button>
                             <button 
                                onClick={() => onNavigate('history')}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-all"
                            >
                                <History size={18} className="opacity-70" /> History
                            </button>
                        </nav>
                    )}
                </div>
                
                {/* Center: Search (Desktop) */}
                {!isAdminView && (
                    <div className="hidden md:flex flex-1 max-w-md mx-4">
                        <div className="relative w-full group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search tests, topics..."
                                value={localSearchQuery}
                                onChange={(e) => setLocalSearchQuery(e.target.value)}
                                className="block w-full pl-10 pr-4 py-2 border-0 rounded-full bg-slate-100 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white dark:focus:bg-gray-800 transition-all text-sm shadow-sm"
                            />
                        </div>
                    </div>
                )}
                
                {/* Right Side: Actions */}
                <div className="flex items-center gap-1 sm:gap-3">
                    {/* Mobile Search Icon */}
                     {!isAdminView && (
                        <button onClick={() => setMobileSearchOpen(true)} className="md:hidden p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <Search className="w-5 h-5" />
                        </button>
                    )}

                    {/* Theme Toggle */}
                    <button onClick={toggleTheme} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Toggle theme">
                        {theme === 'light' ? 
                            <Moon className="w-5 h-5" /> : 
                            <Sun className="w-5 h-5" />
                        }
                    </button>

                    {/* Admin View Toggle */}
                    {isAdminView && (
                        <button onClick={onSwitchToUserView} className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wide rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors shadow-sm">
                            <UserViewIcon size={14} /> Exit Admin
                        </button>
                    )}

                    {!user ? (
                        <button onClick={onOpenAuthModal} className="flex items-center gap-2 px-3 sm:px-5 py-2 bg-indigo-600 text-white text-sm font-bold rounded-full shadow-md hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                            <LogIn size={16} />
                            <span className="hidden sm:inline">Login</span>
                        </button>
                    ) : (
                        <>
                        {/* Notifications */}
                        <div ref={notificationsMenuRef} className="relative">
                            <button onClick={handleToggleNotifications} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative">
                                <Bell className="w-5 h-5"/>
                                {unreadCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-900 animate-pulse"></span>
                                )}
                            </button>
                            {notificationsOpen && (
                                 <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl z-50 origin-top-right border border-gray-100 dark:border-gray-700 animate-scale-in ring-1 ring-black ring-opacity-5">
                                     <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50 rounded-t-xl">
                                        <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Notifications</p>
                                        {unreadCount > 0 && <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">{unreadCount} NEW</span>}
                                     </div>
                                     <div className="py-1 max-h-80 overflow-y-auto pretty-scrollbar">
                                        {notifications.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                                                <Bell className="w-8 h-8 mb-2 opacity-20" />
                                                <p className="text-sm">No new notifications</p>
                                            </div>
                                        ) : (
                                            notifications.map(n => (
                                                <button 
                                                    key={n.id} 
                                                    onClick={() => { onNotificationClick(n); setNotificationsOpen(false); }}
                                                    className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-50 dark:border-gray-700/50 last:border-0 ${!n.isRead ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className={`mt-1.5 flex-shrink-0 w-2 h-2 rounded-full ${!n.isRead ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                {n.type === 'admin_reply' ? <MessageSquare className="w-3.5 h-3.5 text-green-500"/> : n.type === 'chat_reply' ? <MessageCircle className="w-3.5 h-3.5 text-purple-500"/> : <Newspaper className="w-3.5 h-3.5 text-blue-500"/>}
                                                                <span className="text-xs text-gray-400">{formatRelativeTime(n.createdAt)}</span>
                                                            </div>
                                                            <p className={`text-gray-700 dark:text-gray-200 text-sm ${!n.isRead ? 'font-semibold' : 'font-normal'}`}>{n.message}</p>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                     </div>
                                 </div>
                            )}
                        </div>

                        {/* User Menu */}
                        <div ref={profileMenuRef} className="relative pl-2">
                            <button onClick={() => setProfileDropdownOpen(prev => !prev)} className="flex items-center gap-2 focus:outline-none group">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 p-0.5 shadow-md group-hover:shadow-lg transition-all ring-2 ring-transparent group-hover:ring-indigo-200 dark:group-hover:ring-indigo-900">
                                    <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold text-sm">
                                        {userProfile?.name?.charAt(0).toUpperCase() || <UserIcon size={16}/>}
                                    </div>
                                </div>
                            </button>
                            {profileDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl z-50 origin-top-right border border-gray-100 dark:border-gray-700 animate-scale-in ring-1 ring-black ring-opacity-5 overflow-hidden">
                                    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/50">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1">Signed in as</p>
                                        <p className="font-bold text-gray-900 dark:text-white truncate">{userProfile?.name || user.email}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{user.email}</p>
                                    </div>
                                    <div className="py-2">
                                        {userProfile?.role === 'admin' && (
                                            <button onClick={() => { onNavigate('admin'); setProfileDropdownOpen(false); }} className="w-full text-left px-5 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors font-medium flex items-center gap-3 group">
                                                <LayoutDashboard size={16} className="text-gray-400 group-hover:text-indigo-500 transition-colors" /> Admin Dashboard
                                            </button>
                                        )}
                                        <button onClick={() => { onNavigate('profile'); setProfileDropdownOpen(false); }} className="w-full text-left px-5 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors font-medium flex items-center gap-3 group">
                                            <UserIcon size={16} className="text-gray-400 group-hover:text-indigo-500 transition-colors" /> My Profile
                                        </button>
                                        <button onClick={() => { onNavigate('settings'); setProfileDropdownOpen(false); }} className="w-full text-left px-5 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors font-medium flex items-center gap-3 group">
                                            <Settings size={16} className="text-gray-400 group-hover:text-indigo-500 transition-colors" /> Settings
                                        </button>
                                        <button onClick={() => { onOpenChat(); setProfileDropdownOpen(false); }} className="w-full text-left px-5 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors font-medium flex items-center gap-3 group">
                                            <MessageCircle size={16} className="text-gray-400 group-hover:text-indigo-500 transition-colors" /> Chat with us
                                        </button>
                                    </div>
                                    <div className="py-2 border-t border-gray-100 dark:border-gray-700">
                                        <button onClick={handleLogout} className="w-full text-left px-5 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-semibold flex items-center gap-3">
                                            <LogOut size={16} /> Sign out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        </>
                    )}
                </div>

                {/* Mobile Search expanded view */}
                {mobileSearchOpen && (
                    <div className="absolute inset-0 z-50 bg-white dark:bg-gray-900 px-3 flex items-center h-16 animate-fade-in border-b border-gray-200 dark:border-gray-700">
                        <button onClick={() => setMobileSearchOpen(false)} className="p-2 -ml-2 mr-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <form onSubmit={handleMobileSearchSubmit} className="flex-1">
                            <input
                                type="search"
                                placeholder="Search tests, topics..."
                                autoFocus
                                value={localSearchQuery}
                                onChange={(e) => setLocalSearchQuery(e.target.value)}
                                className="w-full bg-transparent text-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none"
                            />
                        </form>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;
