

import React, { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: ReactNode;
    confirmText?: string;
    cancelText?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    confirmText = 'Confirm', 
    cancelText = 'Cancel' 
}) => {
    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[1000] animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-sm text-center animate-scale-in" onClick={e => e.stopPropagation()}>
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">{title}</h3>
                <div className="text-gray-600 dark:text-gray-300 mb-6">{message}</div>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <button onClick={onClose} className="w-full sm:w-auto bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-3 sm:py-2.5 px-8 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all">
                        {cancelText}
                    </button>
                    <button onClick={handleConfirm} className="w-full sm:w-auto bg-red-600 text-white font-bold py-3 sm:py-2.5 px-8 rounded-lg hover:bg-red-700 transition-all">
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;