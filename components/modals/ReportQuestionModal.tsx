import React, { useState, useContext } from 'react';
import Modal from './Modal';
import { Test, Question, BilingualText } from '../../types';
import { AuthContext } from '../../AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { showMessage } from '../../utils/helpers';
import { Loader2 } from 'lucide-react';

interface ReportQuestionModalProps {
    isOpen: boolean;
    onClose: () => void;
    test: Test;
    question: Question;
    questionIndex: number;
}

const reportReasons = [
    "Incorrect Answer/Explanation",
    "Typo in Question/Options",
    "Question is Ambiguous or Unclear",
    "Technical Issue with the Question",
    "Other",
];

const ReportQuestionModal: React.FC<ReportQuestionModalProps> = ({ isOpen, onClose, test, question, questionIndex }) => {
    const { user, userProfile } = useContext(AuthContext);
    const [reason, setReason] = useState('');
    const [comments, setComments] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const questionText = (question.question as BilingualText)?.english || (question.question as unknown as string);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason) {
            showMessage('Please select a reason for the report.', true);
            return;
        }
        if (!user || !userProfile) {
            showMessage('You must be logged in to report a question.', true);
            return;
        }
        
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'reports'), {
                testId: test.id,
                testTitle: test.title,
                questionIndex: questionIndex,
                questionText: questionText,
                reason: reason,
                comments: comments,
                userId: user.uid,
                userEmail: user.email,
                userName: userProfile.name,
                reportedAt: serverTimestamp(),
                status: 'pending',
                adminReply: ''
            });
            showMessage('Report submitted successfully. Thank you for your feedback!');
            onClose();
            setReason('');
            setComments('');
        } catch (error) {
            console.error("Error submitting report:", error);
            showMessage('Failed to submit report. Please try again.', true);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Report an Issue">
            <div className="mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Question:</p>
                <p className="font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 p-2 rounded-md">{questionText}</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Reason for reporting</label>
                    <select
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-400"
                        required
                    >
                        <option value="" disabled>Select a reason...</option>
                        {reportReasons.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="comments" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        Additional Comments (Optional)
                    </label>
                    <textarea
                        id="comments"
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        rows={4}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-400"
                        placeholder="Please provide any extra details here."
                    />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                     <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">
                        Cancel
                    </button>
                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg flex justify-center items-center shadow-md hover:bg-indigo-700 transition-all disabled:bg-indigo-400">
                        {isSubmitting ? <Loader2 className="animate-spin w-5 h-5"/> : 'Submit Report'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default ReportQuestionModal;