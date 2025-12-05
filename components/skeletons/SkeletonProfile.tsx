import React from 'react';

const SkeletonProfile: React.FC = () => (
    <div className="bg-slate-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
            <div className="mb-8">
                <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Left Column Skeleton */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                        <div className="text-center mb-6">
                            <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4"></div>
                            <div className="h-7 w-40 bg-gray-200 dark:bg-gray-700 rounded mx-auto mb-2"></div>
                            <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded mx-auto"></div>
                        </div>
                        <div className="space-y-6">
                            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                            <div className="flex gap-3">
                                <div className="h-10 w-full bg-gray-300 dark:bg-gray-600 rounded-md"></div>
                                <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column Skeleton */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Stats Grid Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md flex items-center gap-4 border border-gray-100 dark:border-gray-700">
                                <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                    <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Recent Activity Skeleton */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                        <div className="h-7 w-1/2 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                        <div className="space-y-4">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="flex justify-between items-center py-2">
                                    <div className="space-y-2">
                                        <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                    </div>
                                    <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

export default SkeletonProfile;