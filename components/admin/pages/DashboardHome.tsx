
import React, { useContext } from 'react';
import { AuthContext } from '../../../AuthContext';
import { AdminView } from '../../../types';
import { 
    Settings, FolderKanban, FilePlus, ListChecks, 
    PenSquare, Newspaper, BookCopy, BookText, 
    Palette, LayoutGrid, MessageSquare, Flag,
    ArrowRight
} from 'lucide-react';

interface DashboardHomeProps {
    onNavigate: (view: AdminView) => void;
}

const DashboardHome: React.FC<DashboardHomeProps> = ({ onNavigate }) => {
    const { userProfile } = useContext(AuthContext);

    const modules = [
        { 
            id: 'categories', 
            label: 'Categories', 
            icon: FolderKanban, 
            color: 'text-blue-600 dark:text-blue-400', 
            bg: 'bg-blue-100 dark:bg-blue-900/30', 
            desc: 'Manage test categories, subcategories, and hierarchy.' 
        },
        { 
            id: 'tests', 
            label: 'Create Test', 
            icon: FilePlus, 
            color: 'text-indigo-600 dark:text-indigo-400', 
            bg: 'bg-indigo-100 dark:bg-indigo-900/30', 
            desc: 'Create new mock tests manually, via CSV, or using AI.' 
        },
        { 
            id: 'view-tests', 
            label: 'Manage Tests', 
            icon: ListChecks, 
            color: 'text-indigo-600 dark:text-indigo-400', 
            bg: 'bg-indigo-100 dark:bg-indigo-900/30', 
            desc: 'View, edit, publish, or delete existing tests.' 
        },
        { 
            id: 'updates', 
            label: 'Updates & Articles', 
            icon: PenSquare, 
            color: 'text-purple-600 dark:text-purple-400', 
            bg: 'bg-purple-100 dark:bg-purple-900/30', 
            desc: 'Publish news, announcements, and blog articles.' 
        },
        { 
            id: 'current-affairs', 
            label: 'Current Affairs', 
            icon: Newspaper, 
            color: 'text-orange-600 dark:text-orange-400', 
            bg: 'bg-orange-100 dark:bg-orange-900/30', 
            desc: 'Manage daily current affairs sections and generate tests.' 
        },
        { 
            id: 'study-materials', 
            label: 'Study Materials', 
            icon: BookCopy, 
            color: 'text-teal-600 dark:text-teal-400', 
            bg: 'bg-teal-100 dark:bg-teal-900/30', 
            desc: 'Upload and organize PDFs and video learning resources.' 
        },
        { 
            id: 'pages', 
            label: 'Custom Pages', 
            icon: BookText, 
            color: 'text-pink-600 dark:text-pink-400', 
            bg: 'bg-pink-100 dark:bg-pink-900/30', 
            desc: 'Create and manage static pages like About Us or Privacy Policy.' 
        },
        { 
            id: 'ui-management', 
            label: 'Appearance', 
            icon: Palette, 
            color: 'text-rose-600 dark:text-rose-400', 
            bg: 'bg-rose-100 dark:bg-rose-900/30', 
            desc: 'Customize homepage layout, footer links, and visual themes.' 
        },
        { 
            id: 'category-layout', 
            label: 'Category Layouts', 
            icon: LayoutGrid, 
            color: 'text-cyan-600 dark:text-cyan-400', 
            bg: 'bg-cyan-100 dark:bg-cyan-900/30', 
            desc: 'Configure specific layouts and widgets for category pages.' 
        },
        { 
            id: 'user-chats', 
            label: 'User Chats', 
            icon: MessageSquare, 
            color: 'text-violet-600 dark:text-violet-400', 
            bg: 'bg-violet-100 dark:bg-violet-900/30', 
            desc: 'View user messages and reply to inquiries in real-time.' 
        },
        { 
            id: 'reports', 
            label: 'Reports', 
            icon: Flag, 
            color: 'text-red-600 dark:text-red-400', 
            bg: 'bg-red-100 dark:bg-red-900/30', 
            desc: 'Review and resolve reported questions from users.' 
        },
    ];

    return (
        <div className="space-y-8">
            <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-lg border-t-4 border-indigo-500 dark:border-indigo-400">
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                    <Settings size={32} /> Admin Dashboard
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-2">Welcome back, <span className="font-bold">{userProfile?.name || userProfile?.email}</span>!</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Select a module below to manage your application.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {modules.map((module) => (
                    <button 
                        key={module.id} 
                        onClick={() => onNavigate(module.id as AdminView)}
                        className="group flex flex-col text-left bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-in-out"
                    >
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-colors ${module.bg} group-hover:scale-110 duration-300`}>
                            <module.icon className={`w-6 h-6 ${module.color}`} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {module.label}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex-grow line-clamp-2">
                            {module.desc}
                        </p>
                        <div className="flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-x-[-10px] group-hover:translate-x-0">
                            Open Module <ArrowRight size={12} className="ml-1" />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default DashboardHome;
