import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, where, doc, updateDoc, Timestamp, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { Report } from '../../../types';
import { showMessage } from '../../../utils/helpers';
import { Flag, Loader2 } from 'lucide-react';
import SkeletonTable from '../../skeletons/SkeletonTable';
import Modal from '../../modals/Modal';

type ReportStatus = 'pending' | 'resolved' | 'discarded';

const ManageReports: React.FC = () => {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<ReportStatus | 'all'>('pending');
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [adminReply, setAdminReply] = useState('');

    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, 'reports'), orderBy('reportedAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let reportsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report));
            if (filter !== 'all') {
                reportsData = reportsData.filter(report => report.status === filter);
            }
            setReports(reportsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching reports:", error);
            showMessage("Failed to load reports.", true);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [filter]);

    const handleViewDetails = (report: Report) => {
        setSelectedReport(report);
        setAdminReply(report.adminReply || '');
    };

    const handleUpdateStatus = async (newStatus: ReportStatus) => {
        if (!selectedReport) return;
        setIsSubmitting(true);
        try {
            const reportRef = doc(db, 'reports', selectedReport.id);
            await updateDoc(reportRef, { 
                status: newStatus,
                adminReply: adminReply
            });

            // Send notification to user if there's a reply and they've opted in
            if (adminReply.trim()) {
                const userDocRef = doc(db, 'users', selectedReport.userId);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists() && userDoc.data().notificationSettings?.adminReplies !== false) {
                    const userNotificationsRef = collection(db, 'users', selectedReport.userId, 'notifications');
                    await addDoc(userNotificationsRef, {
                        type: 'admin_reply',
                        message: `An admin has responded to your report for the test "${selectedReport.testTitle}".`,
                        reportDetails: {
                            testTitle: selectedReport.testTitle,
                            questionText: selectedReport.questionText,
                            adminReply: adminReply,
                        },
                        createdAt: serverTimestamp(),
                        isRead: false,
                    });
                }
            }

            showMessage(`Report status updated to ${newStatus}.`);
            setSelectedReport(null);
        } catch (error) {
            showMessage('Failed to update report.', true);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const FilterButton: React.FC<{ status: ReportStatus | 'all', label: string, color: string }> = ({ status, label, color }) => {
        const isActive = filter === status;
        return (
            <button
                onClick={() => setFilter(status)}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${isActive ? `${color} text-white shadow` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
                {label}
            </button>
        );
    };

    const StatusBadge: React.FC<{ status: ReportStatus }> = ({ status }) => {
        const styles = {
            pending: 'bg-yellow-100 text-yellow-800',
            resolved: 'bg-green-100 text-green-800',
            discarded: 'bg-gray-100 text-gray-800',
        };
        return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status]}`}>{status}</span>;
    };

    return (
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border-t-4 border-indigo-500">
            <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3 mb-6">
                <Flag size={32} /> Reported Questions
            </h1>

            <div className="flex gap-2 mb-6">
                <FilterButton status="all" label="All" color="bg-gray-500" />
                <FilterButton status="pending" label="Pending" color="bg-yellow-500" />
                <FilterButton status="resolved" label="Resolved" color="bg-green-500" />
                <FilterButton status="discarded" label="Discarded" color="bg-red-500" />
            </div>

            {loading ? (
                <SkeletonTable columns={5} rows={5} />
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reported By</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {reports.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-10 text-gray-500">No reports found for this filter.</td></tr>
                            ) : reports.map(report => (
                                <tr key={report.id}>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{report.testTitle} (Q{report.questionIndex + 1})</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.reason}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.userEmail}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.reportedAt && typeof report.reportedAt.toDate === 'function' ? (report.reportedAt as Timestamp).toDate().toLocaleDateString() : 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm"><StatusBadge status={report.status} /></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <button onClick={() => handleViewDetails(report)} className="text-indigo-600 hover:text-indigo-900 font-semibold">View Details</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            {selectedReport && (
                <Modal isOpen={!!selectedReport} onClose={() => setSelectedReport(null)} title="Report Details" size="lg">
                    <div className="space-y-4 text-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><p className="font-semibold text-gray-700">User:</p><p className="text-gray-600">{selectedReport.userName} ({selectedReport.userEmail})</p></div>
                            <div><p className="font-semibold text-gray-700">Test:</p><p className="text-gray-600">{selectedReport.testTitle} (Q{selectedReport.questionIndex + 1})</p></div>
                        </div>
                        <div><p className="font-semibold text-gray-700">Question:</p><p className="p-2 bg-gray-100 rounded-md text-gray-800">{selectedReport.questionText}</p></div>
                        <div><p className="font-semibold text-gray-700">Reason:</p><p className="text-gray-600">{selectedReport.reason}</p></div>
                        {selectedReport.comments && <div><p className="font-semibold text-gray-700">User Comments:</p><p className="p-2 bg-gray-100 rounded-md text-gray-800">{selectedReport.comments}</p></div>}
                        
                        <div className="border-t pt-4">
                            <label className="block text-sm font-medium mb-1">Admin Reply (optional)</label>
                            <textarea
                                value={adminReply}
                                onChange={(e) => setAdminReply(e.target.value)}
                                rows={3}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                                placeholder="Write a reply to be saved with this report..."
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                            <div className="flex gap-2">
                                <p className="font-semibold text-gray-700 self-center">Set status to:</p>
                                <button onClick={() => handleUpdateStatus('resolved')} disabled={isSubmitting} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:bg-green-400">Resolved</button>
                                <button onClick={() => handleUpdateStatus('discarded')} disabled={isSubmitting} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:bg-red-400">Discard</button>
                                {selectedReport.status !== 'pending' && <button onClick={() => handleUpdateStatus('pending')} disabled={isSubmitting} className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-sm hover:bg-yellow-600 disabled:bg-yellow-300">Re-open</button>}
                            </div>
                             {isSubmitting && <Loader2 className="animate-spin text-indigo-500" />}
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default ManageReports;