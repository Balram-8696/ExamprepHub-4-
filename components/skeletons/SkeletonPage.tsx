import React from 'react';

const SkeletonPage: React.FC = () => (
     <div className="bg-white dark:bg-gray-900 py-12 animate-pulse">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
           <div className="flex items-center gap-4">
                <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="prose prose-indigo text-gray-700 mx-auto lg:max-w-none space-y-8">
                <div className="h-10 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-4 w-4/6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                 <div className="space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
            </div>
        </div>
    </div>
);

export default SkeletonPage;