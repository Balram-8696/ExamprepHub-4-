
import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { Category } from '../../types';
import { Home, ChevronRight, Newspaper, ChevronDown, LayoutGrid, BookmarkCheck } from 'lucide-react';
import SkeletonListItem from '../skeletons/SkeletonListItem';
import DynamicIcon from './DynamicIcon';
import { AuthContext } from '../../AuthContext';

interface DesktopSidebarProps {
    categories: Category[];
    loading: boolean;
    selectedCategory: { id: string; name: string };
    onSelectCategory: (category: { id: string; name: string }) => void;
    onNavigate: (view: string) => void;
}

const SidebarCategoryItem: React.FC<{ 
    category: Category; 
    allCategories: Category[]; 
    onSelectCategory: (category: { id: string; name: string }) => void; 
    selectedCategory: { id: string; name: string }; 
}> = ({ category, allCategories, onSelectCategory, selectedCategory }) => {
    const [isOpen, setIsOpen] = useState(false);
    const childCategories = allCategories.filter(c => c.parentId === category.id);
    const hasChildren = childCategories.length > 0;
    
    const getDescendantIds = useCallback((catId: string): string[] => {
        let ids: string[] = [];
        const children = allCategories.filter(c => c.parentId === catId);
        for (const child of children) {
            ids.push(child.id);
            ids = ids.concat(getDescendantIds(child.id));
        }
        return ids;
    }, [allCategories]);

    const isParentOfSelected = useMemo(() => {
        if (!selectedCategory.id) return false;
        const descendantIds = getDescendantIds(category.id);
        return descendantIds.includes(selectedCategory.id);
    }, [selectedCategory.id, category.id, getDescendantIds]);
    
    const isSelected = selectedCategory.id === category.id;

    useEffect(() => {
        if (isParentOfSelected && !isOpen) {
            setIsOpen(true);
        }
    }, [isParentOfSelected]);

    return (
        <li className="mb-1">
            <div className={`flex items-center justify-between group rounded-lg transition-all duration-200 ${isSelected ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200'}`}>
                <button
                    onClick={() => onSelectCategory({ id: category.id, name: category.name })}
                    className="flex-grow flex items-center text-left px-3 py-2 gap-3 w-full"
                >
                    <DynamicIcon name={category.icon || category.name} className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`} />
                    <span className={`text-sm truncate ${isSelected ? 'font-bold' : 'font-medium'}`}>{category.name}</span>
                </button>
                {hasChildren && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsOpen(prev => !prev); }}
                        className="p-2 mr-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        aria-label={isOpen ? `Collapse ${category.name}` : `Expand ${category.name}`}
                    >
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                )}
            </div>
            {hasChildren && isOpen && (
                <div className="relative ml-2 mt-1 pl-3 border-l-2 border-gray-100 dark:border-gray-800 space-y-1">
                    {childCategories.map(child => {
                        const isChildSelected = selectedCategory.id === child.id;
                        return (
                        <div key={child.id}>
                            <button 
                                onClick={() => onSelectCategory({ id: child.id, name: child.name })} 
                                className={`w-full text-left flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${isChildSelected ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200 font-medium'}`}
                            >
                                <span className="truncate">{child.name}</span>
                            </button>
                        </div>
                    )})}
                </div>
            )}
        </li>
    );
};

const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ categories, loading, selectedCategory, onSelectCategory, onNavigate }) => {
    const { user, userProfile } = useContext(AuthContext);
    const topLevelCategories = categories.filter(c => !c.parentId);
    const hasEnrolledExams = user && userProfile?.enrolledCategoryIds && userProfile.enrolledCategoryIds.length > 0;

    return (
        <aside className="w-64 flex-shrink-0 hidden lg:block self-start sticky top-24">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Main Navigation */}
                <div className="p-4 space-y-1">
                    <button 
                        onClick={() => onNavigate('home')} 
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-bold ${!selectedCategory.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'}`}
                    >
                        <Home size={18} className={!selectedCategory.id ? 'text-white' : 'text-gray-400 dark:text-gray-500'} />
                        <span>Dashboard</span>
                    </button>
                    {hasEnrolledExams && (
                        <button 
                            onClick={() => onNavigate('enrolled-exams')} 
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white"
                        >
                            <BookmarkCheck size={18} className="text-gray-400 dark:text-gray-500" />
                            <span>Your Exams</span>
                        </button>
                    )}
                     <button 
                        onClick={() => onNavigate('updates')} 
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white"
                    >
                        <Newspaper size={18} className="text-gray-400 dark:text-gray-500" />
                        <span>Latest Updates</span>
                    </button>
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-100 dark:bg-gray-700 mx-4"></div>

                {/* Categories */}
                <div className="p-4">
                    <div className="flex items-center gap-2 px-2 mb-3">
                        <LayoutGrid size={14} className="text-gray-400" />
                        <h3 className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">Categories</h3>
                    </div>
                    
                    <ul className="space-y-0.5">
                        {loading ? (
                            <div className="space-y-2 px-2">
                                {Array.from({ length: 5 }).map((_, index) => <SkeletonListItem key={index} />)}
                            </div>
                        ) : (
                            topLevelCategories.map(category => (
                                <SidebarCategoryItem 
                                    key={category.id} 
                                    category={category} 
                                    allCategories={categories} 
                                    onSelectCategory={onSelectCategory} 
                                    selectedCategory={selectedCategory} 
                                />
                            ))
                        )}
                    </ul>
                </div>
            </div>
        </aside>
    );
};

export default DesktopSidebar;
