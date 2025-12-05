import React from 'react';

const SkeletonCard: React.FC = () => (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex flex-col">
        <div className="flex-grow">
            <div className="h-8 w-8 bg-gray-200 rounded-md mb-3 animate-shimmer"></div>
            <div className="h-5 w-3/4 bg-gray-200 rounded mb-2 animate-shimmer"></div>
            <div className="h-4 w-1/2 bg-gray-200 rounded mb-4 animate-shimmer"></div>
        </div>
        <div className="h-11 w-full bg-gray-200 rounded-lg animate-shimmer"></div>
    </div>
);

export default SkeletonCard;