import React from 'react';
import { X } from 'lucide-react';
import HomePage from '../pages/HomePage';
import { HomepageSettings, Category, CurrentAffairsSection } from '../../types';
import { showMessage } from '../../utils/helpers';

interface LayoutPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    homepageSettings?: HomepageSettings | null;
    categorySettings?: HomepageSettings | null;
    selectedCategory?: { id: string; name: string };
    allCategories: Category[];
    allCurrentAffairsSections: CurrentAffairsSection[];
}

const LayoutPreviewModal: React.FC<LayoutPreviewModalProps> = ({ isOpen, onClose, homepageSettings, categorySettings, selectedCategory, allCategories, allCurrentAffairsSections }) => {
    if (!isOpen) return null;

    const dummyFunc = () => {
        showMessage("Actions are disabled in preview mode.", true);
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-2 sm:p-4 z-[200]" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full h-full flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex-shrink-0 flex justify-between items-center border-b dark:border-gray-700 p-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {selectedCategory ? `Preview: ${selectedCategory.name}` : "Homepage Preview"}
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-300">
                        <X />
                    </button>
                </header>
                <div className="flex-grow overflow-y-auto pretty-scrollbar bg-slate-50 dark:bg-slate-900">
                    <HomePage
                        previewHomepageSettings={homepageSettings}
                        previewCategorySettings={categorySettings}
                        categories={allCategories}
                        loadingCategories={false}
                        selectedCategory={selectedCategory || { id: '', name: 'All Tests' }}
                        currentAffairsSections={allCurrentAffairsSections}
                        selectedCurrentAffairsSection={{ id: '', name: 'All' }}
                        searchQuery=""
                        onInitiateTestView={() => dummyFunc()}
                        onShowInstructions={() => dummyFunc()}
                        onSelectCategory={() => {}}
                        onSelectCurrentAffairsSection={() => {}}
                        onNavigate={() => dummyFunc()}
                        isPreview={true}
                    />
                </div>
            </div>
        </div>
    );
};

export default LayoutPreviewModal;