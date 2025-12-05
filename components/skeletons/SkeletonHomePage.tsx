import React from 'react';

const SkeletonHomePage: React.FC = () => {
    return (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar Skeleton */}
                <aside className="w-48 bg-white dark:bg-gray-800 shadow-lg rounded-xl p-4 hidden lg:block self-start sticky top-24">
                    <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-6 animate-shimmer"></div>
                    <ul className="space-y-3">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <li key={index} className="flex items-center p-2">
                                <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded-md animate-shimmer"></div>
                                <div className="ml-3 h-5 w-full bg-gray-200 dark:bg-gray-700 rounded animate-shimmer"></div>
                            </li>
                        ))}
                    </ul>
                </aside>
                {/* Main Content Skeleton */}
                <div className="flex-1 space-y-12">
                    {/* Banner Skeleton */}
                    <div className="p-6 sm:p-12 rounded-xl shadow-lg bg-white dark:bg-gray-800">
                        <div className="h-8 w-3/5 bg-gray-200 dark:bg-gray-700 rounded mx-auto mb-4 animate-shimmer"></div>
                        <div className="h-5 w-4/5 bg-gray-200 dark:bg-gray-700 rounded mx-auto animate-shimmer"></div>
                    </div>

                    {/* Section Skeleton */}
                    <div>
                        <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-700 rounded mb-6 animate-shimmer"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                                    <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-md mb-3 animate-shimmer"></div>
                                    <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-shimmer"></div>
                                    <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded mb-4 animate-shimmer"></div>
                                    <div className="h-11 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-shimmer"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SkeletonHomePage;