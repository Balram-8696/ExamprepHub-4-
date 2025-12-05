
import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import DashboardHome from './pages/DashboardHome';
import ManageCategories from './pages/ManageCategories';
import ManageTests from './pages/ManageTests';
// FIX: Changed default import to a named import for ViewTests, which is not default-exported.
import { ViewTests } from './pages/ViewTests';
import ManagePages from './pages/ManagePages';
import ManageUI from './pages/ManageUI';
import ManageReports from './pages/ManageReports';
import ManageCurrentAffairs from './pages/ManageCurrentAffairs';
import ManageCategoryLayout from './pages/ManageCategoryLayout';
import ManageStudyMaterials from './pages/ManageStudyMaterials';
import ManageChats from './pages/ManageChats';
import ManageUpdates from './pages/ManageUpdates';
import { AdminView } from '../../types';

const adminViewTitles: { [key in AdminView]: string } = {
    dashboard: 'Dashboard',
    updates: 'Manage Updates',
    categories: 'Manage Categories',
    tests: 'Upload Test',
    'view-tests': 'All Tests',
    pages: 'Manage Pages',
    'ui-management': 'Appearance',
    reports: 'Reported Questions',
    'current-affairs': 'Current Affairs Generator',
    'category-layout': 'Category Layout',
    'study-materials': 'Study Materials',
    'user-chats': 'User Chats',
};

const AdminDashboard: React.FC = () => {
    const [currentView, setCurrentView] = useState<AdminView>('dashboard');
    const [editingTestId, setEditingTestId] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleNavigation = (view: AdminView) => {
        setCurrentView(view);
        setIsSidebarOpen(false); // Close sidebar on mobile after navigation
    };

    const handleEditTest = (testId: string) => {
        setEditingTestId(testId);
        setCurrentView('tests');
    };

    const handleFinishEditing = () => {
        setEditingTestId(null);
        setCurrentView('view-tests');
    };

    const renderContent = () => {
        switch (currentView) {
            case 'updates':
                return <ManageUpdates />;
            case 'categories':
                return <ManageCategories />;
            case 'tests':
                return <ManageTests testIdToEdit={editingTestId} onSaveComplete={handleFinishEditing} />;
            case 'view-tests':
                return <ViewTests onEditTest={handleEditTest} />;
            case 'pages':
                return <ManagePages />;
            case 'ui-management':
                return <ManageUI />;
            case 'reports':
                return <ManageReports />;
            case 'current-affairs':
                return <ManageCurrentAffairs />;
            case 'category-layout':
                return <ManageCategoryLayout />;
            case 'study-materials':
                return <ManageStudyMaterials />;
            case 'user-chats':
                return <ManageChats />;
            case 'dashboard':
            default:
                return <DashboardHome onNavigate={handleNavigation} />;
        }
    };

    return (
        <div className="dark:bg-gray-900">
            {isSidebarOpen && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}
            
            <AdminSidebar 
                currentView={currentView} 
                onSetView={handleNavigation}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            <div className="lg:pl-64">
                <header className="sticky top-16 z-10 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 lg:hidden">
                    <button type="button" className="-m-2.5 p-2.5 text-gray-700 dark:text-gray-300 lg:hidden" onClick={() => setIsSidebarOpen(true)}>
                        <Menu className="h-6 w-6" />
                    </button>
                    <div className="flex-1 text-lg font-semibold leading-6 text-gray-900 dark:text-gray-100">
                        {adminViewTitles[currentView]}
                    </div>
                </header>

                <main className="py-10">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        {renderContent()}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;
