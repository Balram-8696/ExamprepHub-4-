import React from 'react';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
    label: string;
    path?: string;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
    onNavigate: (path: string) => void;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, onNavigate }) => {
    if (items.length <= 1) {
        return null;
    }

    return (
        <nav className="bg-slate-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700" aria-label="Breadcrumb">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <ol className="flex items-center space-x-2 py-3 text-sm flex-wrap">
                    {items.map((item, index) => (
                        <li key={index} className="flex items-center">
                            {index > 0 && (
                                <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 mx-1 sm:mx-2 flex-shrink-0" />
                            )}
                            {index < items.length - 1 && item.path ? (
                                <button
                                    onClick={() => onNavigate(item.path!)}
                                    className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                >
                                    {item.label}
                                </button>
                            ) : (
                                <span className="font-semibold text-gray-700 dark:text-gray-200 truncate max-w-[150px] sm:max-w-none" aria-current="page">
                                    {item.label}
                                </span>
                            )}
                        </li>
                    ))}
                </ol>
            </div>
        </nav>
    );
};

export default Breadcrumbs;