import React from 'react';
import Modal from './Modal';
import { Notification } from '../../types';

interface NotificationDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    notification: Notification | null;
}

const NotificationDetailModal: React.FC<NotificationDetailModalProps> = ({ isOpen, onClose, notification }) => {
    if (!isOpen || !notification || notification.type !== 'admin_reply' || !notification.reportDetails) {
        return null;
    }
    
    const { testTitle, questionText, adminReply } = notification.reportDetails;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Admin Reply to Your Report">
            <div className="space-y-4 text-sm">
                <div>
                    <p className="font-semibold text-gray-700 dark:text-gray-300">Test:</p>
                    <p className="text-gray-600 dark:text-gray-400">{testTitle}</p>
                </div>
                <div>
                    <p className="font-semibold text-gray-700 dark:text-gray-300">Reported Question:</p>
                    <p className="p-2 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-800 dark:text-gray-200 mt-1">{questionText}</p>
                </div>
                <div>
                    <p className="font-semibold text-gray-700 dark:text-gray-300">Admin's Reply:</p>
                    <p className="p-3 bg-indigo-50 dark:bg-indigo-900/40 border-l-4 border-indigo-500 rounded-r-lg mt-1 text-gray-800 dark:text-gray-200">
                        {adminReply}
                    </p>
                </div>
                <div className="text-right pt-4">
                    <button onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700">
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default NotificationDetailModal;
