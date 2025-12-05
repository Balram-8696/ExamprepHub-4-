import React from 'react';

const SkeletonListItem: React.FC = () => (
    <li>
        <div className="flex items-center p-3">
            <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded-md animate-shimmer"></div>
            <div className="ml-3 h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer"></div>
        </div>
    </li>
);

export default SkeletonListItem;