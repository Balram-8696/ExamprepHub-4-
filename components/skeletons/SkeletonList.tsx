import React from 'react';
import SkeletonListItem from './SkeletonListItem';

const SkeletonList: React.FC<{ items?: number }> = ({ items = 3 }) => (
    <ul className="space-y-1">
        {Array.from({ length: items }).map((_, index) => (
            <SkeletonListItem key={index} />
        ))}
    </ul>
);

export default SkeletonList;
