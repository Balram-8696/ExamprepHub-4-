
import React, { useState, useContext } from 'react';
import { Category } from '../../types';
import { X, Home, ChevronRight, Newspaper, Radio, BookmarkCheck } from 'lucide-react';
import SkeletonListItem from '../skeletons/SkeletonListItem';
import DynamicIcon from './DynamicIcon';
import { getCategoryStyle } from '../../utils/helpers';
import { AuthContext } from '../../AuthContext';

interface MobileMenuProps {
    isOpen: boolean;
    onClose: () => void;
    categories: Category[];
    loading: boolean;
    onSelectCategory: (category: { id: string; name: string }) => void;
    onNavigate: (view: string) => void;
}

const MobileMenuCategoryItem: React.FC<{ 
    category: Category; 
    allCategories: Category[]; 
    onSelectCategory: (category: { id: string; name: string }) => void; 
}> = ({ category, allCategories, onSelectCategory }) => {
    const [isOpen, setIsOpen] = useState(false);
    const childCategories = allCategories.filter(c => c.parentId === category.id);
    const hasChildren = childCategories.length > 0;
    const style = getCategoryStyle(category.name);

    return (
        <li>
            <div className="flex items-center justify-between group rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
                <button
                    onClick={() => onSelectCategory({ id: category.id, name: category.name })}
                    className="flex-grow flex items-center text-left p-3"
                >
                    <DynamicIcon name={category.icon || category.name} className={`w-5 h-5 flex-shrink-0 ${style.text}`} />
                    <span className="ml-3 font-bold text-black dark:text-white truncate">{category.name}</span>
                </button>
                {hasChildren && (
                    <button
                        onClick={() => setIsOpen(prev => !prev)}
                        className="p-2 mr-1 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 rounded-full flex-shrink-0"
                        aria-label={isOpen ? `Collapse ${category.name}` : `Expand ${category.name}`}
                    >
                        <ChevronRight className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                    </button>
                )}
            </div>
            {hasChildren && isOpen && (
                <ul className="pl-5 ml-3 mt-1 space-y-1 border-l-2 border-gray-200 dark:border-gray-700 animate-fade-in">
                    {childCategories.map(child => {
                        const childStyle = getCategoryStyle(child.name);
                        return (
                        <li key={child.id}>
                            <button onClick={() => onSelectCategory({ id: child.id, name: child.name })} className="w-full text-left flex items-center p-2 text-sm rounded-lg transition-colors text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 font-bold">
                                <DynamicIcon name={child.icon || child.name} className={`w-4 h-4 mr-2 flex-shrink-0 ${childStyle.text}`} />
                                <span className="truncate">{child.name}</span>
                            </button>
                        </li>
                    )})}
                </ul>
            )}
        </li>
    );
};

const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose, categories, loading, onSelectCategory, onNavigate }) => {
    const { user, userProfile } = useContext(AuthContext);
    const topLevelCategories = categories.filter(c => !c.parentId);
    const hasEnrolledExams = user && userProfile?.enrolledCategoryIds && userProfile.enrolledCategoryIds.length > 0;

    return (
        <div className={`lg:hidden fixed inset-0 z-50 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
            {/* Overlay */}
            <div 
                className={`fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0'}`} 
                onClick={onClose}
                aria-hidden="true"
            ></div>
            
            {/* Menu Panel */}
            <div className={`fixed top-0 left-0 h-full bg-white dark:bg-gray-800 shadow-2xl z-50 transition-transform duration-300 ease-in-out w-72 sm:w-80 border-r border-gray-200 dark:border-gray-700 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                    <div className="text-2xl font-extrabold text-indigo-700 dark:text-indigo-400">Exam<span className="text-gray-900 dark:text-gray-100">Hub</span></div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-6 h-6 text-gray-600 dark:text-gray-300" /></button>
                </div>
                <div className="p-2 overflow-y-auto h-[calc(100vh-65px)] pretty-scrollbar">
                    <nav className="space-y-1 p-2">
                        <button onClick={() => onNavigate('home')} className="w-full flex items-center p-3 text-black dark:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 font-bold">
                            <Home className="text-indigo-500 w-5 h-5" />
                            <span className="ml-3">Home</span>
                        </button>
                        {hasEnrolledExams && (
                            <button onClick={() => onNavigate('enrolled-exams')} className="w-full flex items-center p-3 text-black dark:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 font-bold">
                                <BookmarkCheck className="text-purple-500 w-5 h-5" />
                                <span className="ml-3">Your Exams</span>
                            </button>
                        )}
                        <button onClick={() => onNavigate('live-exams')} className="w-full flex items-center p-3 text-black dark:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 font-bold">
                            <Radio className="text-red-500 w-5 h-5" />
                            <span className="ml-3">Live Exams</span>
                        </button>
                        <button onClick={() => onNavigate('updates')} className="w-full flex items-center p-3 text-black dark:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 font-bold">
                            <Newspaper className="text-green-500 w-5 h-5" />
                            <span className="ml-3">Updates</span>
                        </button>
                    </nav>
                    <div className="mt-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <h3 className="px-3 text-xs font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wider mb-2">Test Categories</h3>
                         <ul className="space-y-1">
                            {loading ? (
                                <>
                                    {Array.from({ length: 5 }).map((_, index) => <SkeletonListItem key={index} />)}
                                </>
                            ) : (
                                topLevelCategories.map(category => (
                                    <MobileMenuCategoryItem key={category.id} category={category} allCategories={categories} onSelectCategory={onSelectCategory} />
                                ))
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MobileMenu;
