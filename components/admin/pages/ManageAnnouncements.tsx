import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { showMessage, formatFirebaseError } from '../../../utils/helpers';
import { Megaphone, Pencil } from 'lucide-react';
import { Announcement } from '../../../types';
import SkeletonList from '../../skeletons/SkeletonList';
import Modal from '../../modals/Modal';

const ManageAnnouncements: React.FC = () => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);

    const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');

    useEffect(() => {
        const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const announcementsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
            setAnnouncements(announcementsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching announcements:", error);
            showMessage(formatFirebaseError(error, "Error: Could not load announcements."), true);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            showMessage('Title and content are required.', true);
            return;
        }
        setIsSubmitting(true);
        try {
            // Deactivate all other announcements
            const activeAnnouncements = announcements.filter(a => a.isActive);
            for (const ann of activeAnnouncements) {
                const docRef = doc(db, 'announcements', ann.id);
                await updateDoc(docRef, { isActive: false });
            }

            // Add the new active announcement
            await addDoc(collection(db, 'announcements'), {
                title,
                content,
                createdAt: serverTimestamp(),
                isActive: true
            });
            showMessage('Announcement published successfully!');
            setTitle('');
            setContent('');
        } catch (error) {
            showMessage(formatFirebaseError(error, 'Failed to publish announcement.'), true);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const toggleActive = async (announcement: Announcement) => {
        const docRef = doc(db, 'announcements', announcement.id);
        try {
            // If we are activating this one, deactivate others first
            if(!announcement.isActive) {
                 const activeAnnouncements = announcements.filter(a => a.isActive);
                 for (const ann of activeAnnouncements) {
                    await updateDoc(doc(db, 'announcements', ann.id), { isActive: false });
                }
            }
             await updateDoc(docRef, { isActive: !announcement.isActive });
             showMessage('Announcement status updated!');
        } catch (error) {
             showMessage(formatFirebaseError(error, 'Failed to update status.'), true);
        }
    };

    const handleEditClick = (announcement: Announcement) => {
        setEditingAnnouncement(announcement);
        setEditTitle(announcement.title);
        setEditContent(announcement.content);
    };

    const handleUpdateAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingAnnouncement || !editTitle.trim() || !editContent.trim()) {
            showMessage('Title and content cannot be empty.', true);
            return;
        }
        setIsSubmitting(true);
        try {
            const docRef = doc(db, 'announcements', editingAnnouncement.id);
            await updateDoc(docRef, {
                title: editTitle,
                content: editContent,
                updatedAt: serverTimestamp()
            });
            showMessage('Announcement updated successfully!');
            setEditingAnnouncement(null);
        } catch (error) {
            showMessage(formatFirebaseError(error, 'Failed to update announcement.'), true);
            console.error("Error updating announcement:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCloseEditModal = () => {
        setEditingAnnouncement(null);
        setEditTitle('');
        setEditContent('');
    };

    return (
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-3"><Megaphone /> Publish New Announcement</h2>
                <p className="text-sm text-gray-500 mb-4">Publishing a new announcement will automatically set it as the active one and deactivate any previous announcement.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="ann-title" className="block text-sm font-medium mb-1">Title</label>
                        <input id="ann-title" type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div>
                        <label htmlFor="ann-content" className="block text-sm font-medium mb-1">Content</label>
                        <textarea id="ann-content" value={content} onChange={e => setContent(e.target.value)} rows={3} className="w-full p-2 border border-gray-300 rounded-lg"></textarea>
                    </div>
                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400">
                        {isSubmitting ? 'Publishing...' : 'Publish Announcement'}
                    </button>
                </form>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-lg">
                 <h2 className="text-2xl font-bold text-gray-800 mb-4">Announcement History</h2>
                 {loading ? (
                    <SkeletonList items={3} />
                 ) : (
                    <div className="space-y-4">
                        {announcements.map(ann => (
                            <div key={ann.id} className={`p-4 rounded-lg border ${ann.isActive ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-gray-800">{ann.title}</p>
                                        <p className="text-sm text-gray-600">{ann.content}</p>
                                        <p className="text-xs text-gray-400 mt-2">
                                            {ann.createdAt && typeof ann.createdAt.toDate === 'function' ? (ann.createdAt as Timestamp).toDate().toLocaleString() : 'Date unavailable'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button onClick={() => handleEditClick(ann)} className="p-1.5 rounded-full text-blue-600 hover:bg-blue-100 transition-colors">
                                            <Pencil size={16} />
                                        </button>
                                        <button onClick={() => toggleActive(ann)} className={`px-3 py-1 text-sm font-semibold rounded-full ${ann.isActive ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'}`}>
                                            {ann.isActive ? 'Active' : 'Set Active'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                 )}
            </div>

            <Modal
                isOpen={!!editingAnnouncement}
                onClose={handleCloseEditModal}
                title="Edit Announcement"
            >
                <form onSubmit={handleUpdateAnnouncement} className="space-y-4">
                    <div>
                        <label htmlFor="edit-ann-title" className="block text-sm font-medium mb-1">Title</label>
                        <input id="edit-ann-title" type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div>
                        <label htmlFor="edit-ann-content" className="block text-sm font-medium mb-1">Content</label>
                        <textarea id="edit-ann-content" value={editContent} onChange={e => setEditContent(e.target.value)} rows={3} className="w-full p-2 border border-gray-300 rounded-lg"></textarea>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={handleCloseEditModal} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400">
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ManageAnnouncements;