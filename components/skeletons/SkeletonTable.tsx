import React from 'react';

const SkeletonRow: React.FC<{ columns: number }> = ({ columns }) => (
    <tr className="animate-pulse">
        {Array.from({ length: columns }).map((_, i) => (
            <td className="px-6 py-4 whitespace-nowrap" key={i}>
                <div className={`h-4 bg-gray-200 dark:bg-gray-700 rounded ${i === 0 ? 'w-3/4' : 'w-1/2'}`}></div>
            </td>
        ))}
    </tr>
);

const SkeletonTable: React.FC<{ rows?: number, columns: number, showHeader?: boolean }> = ({ rows = 5, columns, showHeader = true }) => (
    <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            {showHeader && (
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                        {Array.from({ length: columns }).map((_, i) => (
                            <th key={i} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-2/3"></div>
                            </th>
                        ))}
                    </tr>
                </thead>
            )}
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {Array.from({ length: rows }).map((_, index) => <SkeletonRow key={index} columns={columns} />)}
            </tbody>
        </table>
    </div>
);
export default SkeletonTable;