
import React, { useContext } from 'react';
import { 
    LayoutDashboard, FolderKanban, FilePlus, Palette, ListChecks, 
    BookText, X, Flag, Newspaper, LayoutGrid, BookCopy, 
    MessageSquare, PenSquare, LogOut, User 
} from 'lucide-react';
import { AdminView } from '../../types';
import { AuthContext } from '../../AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { showMessage } from '../../utils/helpers';

interface AdminSidebarProps {
    currentView: AdminView;
    onSetView: (view: AdminView) => void;
    isOpen: boolean;
    onClose: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ currentView, onSetView, isOpen, onClose }) => {
    const { userProfile } = useContext(AuthContext);

    const handleLogout = () => {
        signOut(auth).then(() => {
            showMessage('Logged out successfully.');
            // Redirect is handled by auth listener in App.tsx usually, 
            // but if we are in Admin view, App.tsx will likely redirect to home or show login.
        }).catch((error) => {
            showMessage(`Logout failed: ${error.message}`, true);
        });
    };

    const menuGroups = [
        {
            label: "Overview",
            items: [
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }
            ]
        },
        {
            label: "Content",
            items: [
                { id: 'categories', label: 'Categories', icon: FolderKanban },
                { id: 'tests', label: 'Upload Test', icon: FilePlus },
                { id: 'view-tests', label: 'All Tests', icon: ListChecks },
                { id: 'updates', label: 'Updates & Articles', icon: PenSquare },
                { id: 'current-affairs', label: 'Current Affairs', icon: Newspaper },
                { id: 'study-materials', label: 'Study Materials', icon: BookCopy },
            ]
        },
        {
            label: "Configuration",
            items: [
                { id: 'pages', label: 'Custom Pages', icon: BookText },
                { id: 'ui-management', label: 'Appearance', icon: Palette },
                { id: 'category-layout', label: 'Layouts', icon: LayoutGrid },
            ]
        },
        {
            label: "Support",
            items: [
                { id: 'user-chats', label: 'User Chats', icon: MessageSquare },
                { id: 'reports', label: 'Reports', icon: Flag },
            ]
        }
    ];

    return (
        <>
            {/* Mobile Overlay */}
            <div 
                className={`fixed inset-0 bg-gray-900/60 z-40 lg:hidden transition-opacity duration-300 backdrop-blur-sm ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Sidebar Container */}
            <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-2xl lg:shadow-none ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between h-16 px-6 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-indigo-200 dark:shadow-none shadow-lg">
                             <LayoutDashboard className="text-white w-5 h-5" />
                        </div>
                        <div className="leading-none">
                            <span className="block text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">Exam<span className="text-indigo-600">Hub</span></span>
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Admin</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-8 pretty-scrollbar">
                    {menuGroups.map((group, index) => (
                        <div key={index}>
                            <h3 className="px-4 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-slate-700"></span>
                                {group.label}
                            </h3>
                            <ul className="space-y-1.5">
                                {group.items.map((item) => {
                                    const isActive = currentView === item.id;
                                    const Icon = item.icon;
                                    
                                    return (
                                        <li key={item.id}>
                                            <button
                                                onClick={() => onSetView(item.id as AdminView)}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group ${
                                                    isActive 
                                                        ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 shadow-sm ring-1 ring-indigo-200/50 dark:ring-indigo-500/20' 
                                                        : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50 hover:text-gray-900 dark:hover:text-slate-200'
                                                }`}
                                            >
                                                <Icon 
                                                    size={20} 
                                                    strokeWidth={isActive ? 2.5 : 2}
                                                    className={`transition-colors ${
                                                        isActive 
                                                            ? 'text-indigo-600 dark:text-indigo-400' 
                                                            : 'text-gray-400 dark:text-slate-500 group-hover:text-gray-600 dark:group-hover:text-slate-300'
                                                    }`} 
                                                />
                                                {item.label}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </nav>

                {/* Footer User Info */}
                <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900">
                    <div className="flex items-center gap-3 p-2 rounded-xl transition-colors">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-sm font-bold text-white shadow-md">
                            {userProfile?.name?.charAt(0).toUpperCase() || <User size={18}/>}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                {userProfile?.name || 'Admin User'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                                {userProfile?.email || 'admin@example.com'}
                            </p>
                        </div>
                        <button 
                            onClick={handleLogout}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                            title="Sign Out"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default AdminSidebar;
