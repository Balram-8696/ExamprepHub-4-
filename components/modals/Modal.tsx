

import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    size?: 'sm' | 'md' | 'lg';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={onClose}>
            <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full p-6 sm:p-8 ${sizeClasses[size]} animate-scale-in`} onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b dark:border-gray-700 pb-4 mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-300">
                        <X />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
};

export default Modal;