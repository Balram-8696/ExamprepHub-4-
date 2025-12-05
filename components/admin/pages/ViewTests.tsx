
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { Test } from '../../../types';
import { showMessage, formatFirebaseError } from '../../../utils/helpers';
import { Trash2, Pencil, ListChecks, Eye } from 'lucide-react';
import ConfirmModal from '../../modals/ConfirmModal';
import SkeletonTable from '../../skeletons/SkeletonTable';
import TestPreviewModal from '../../modals/TestPreviewModal';

interface ViewTestsProps {
    onEditTest: (testId: string) => void;
}

export const ViewTests: React.FC<ViewTestsProps> = ({ onEditTest }) => {
    const [tests, setTests] = useState<Test[]>([]);
    const [loading, setLoading] = useState(true);
    const [testToDelete, setTestToDelete] = useState<Test | null>(null);
    const [testToPreview, setTestToPreview] = useState<Test | null>(null);

    useEffect(() => {
        const q = query(collection(db, 'tests'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const testsData = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Test))
                .filter(test => !test.currentAffairsSectionId); // Filter out current affairs tests
            setTests(testsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching tests:", error);
            showMessage(formatFirebaseError(error, "Failed to load tests."), true);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleDeleteClick = (test: Test) => {
        setTestToDelete(test);
    };

    const confirmDelete = async () => {
        if (!testToDelete) return;
        try {
            await deleteDoc(doc(db, 'tests', testToDelete.id));
            showMessage('Test deleted successfully!');
        } catch (error) {
            showMessage(formatFirebaseError(error, 'Failed to delete test.'), true);
        } finally {
            setTestToDelete(null);
        }
    };
    
    const togglePublishStatus = async (test: Test) => {
        const newStatus = test.status === 'published' ? 'draft' : 'published';
        try {
            const testDocRef = doc(db, 'tests', test.id);
            await updateDoc(testDocRef, {
                status: newStatus
            });
            showMessage(`Test status updated to ${newStatus}.`);
        } catch (error) {
            showMessage(formatFirebaseError(error, 'Failed to update test status.'), true);
        }
    };

    if (loading) {
        return (
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border-t-4 border-indigo-500">
                 <div className="h-8 w-1/3 bg-gray-200 rounded mb-6 animate-pulse"></div>
                 <SkeletonTable columns={5} rows={5} />
            </div>
        );
    }
    
    return (
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border-t-4 border-indigo-500">
            <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3 mb-6">
                <ListChecks size={32} /> All Tests
            </h1>
            
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Questions</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {tests.length === 0 && (
                            <tr><td colSpan={5} className="text-center py-10 text-gray-500">No tests found.</td></tr>
                        )}
                        {tests.map(test => (
                            <tr key={test.id}>
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{test.title}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{test.category}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{test.questionCount}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {test.status === 'published' ? (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Published</span>
                                    ) : (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Draft</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex items-center space-x-4">
                                        <button onClick={() => togglePublishStatus(test)} className={`font-semibold ${test.status === 'published' ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}`}>
                                            {test.status === 'published' ? 'Unpublish' : 'Publish'}
                                        </button>
                                        <button onClick={() => setTestToPreview(test)} className="text-blue-600 hover:text-blue-900" title="Preview"><Eye size={18} /></button>
                                        <button onClick={() => onEditTest(test.id)} className="text-indigo-600 hover:text-indigo-900" title="Edit"><Pencil size={18} /></button>
                                        <button onClick={() => handleDeleteClick(test)} className="text-red-600 hover:text-red-900" title="Delete"><Trash2 size={18} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {testToDelete && (
                <ConfirmModal
                    isOpen={!!testToDelete}
                    onClose={() => setTestToDelete(null)}
                    onConfirm={confirmDelete}
                    title="Delete Test"
                    message={`Are you sure you want to permanently delete the test "${testToDelete.title}"? This cannot be undone.`}
                    confirmText="Delete"
                />
            )}
            {testToPreview && (
                <TestPreviewModal 
                    isOpen={!!testToPreview}
                    onClose={() => setTestToPreview(null)}
                    test={testToPreview}
                />
            )}
        </div>
    );
};
