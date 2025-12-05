import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { CustomPage } from '../../../types';
import { showMessage } from '../../../utils/helpers';
import { BookText, PlusCircle, Trash2, Pencil } from 'lucide-react';
import ConfirmModal from '../../modals/ConfirmModal';
import Modal from '../../modals/Modal';
import SkeletonTable from '../../skeletons/SkeletonTable';

const ManagePages: React.FC = () => {
    const [pages, setPages] = useState<CustomPage[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPage, setEditingPage] = useState<CustomPage | null>(null);

    // Form state
    const [title, setTitle] = useState('');
    const [slug, setSlug] = useState('');
    const [content, setContent] = useState('');
    const [status, setStatus] = useState<'draft' | 'published'>('draft');

    const [pageToDelete, setPageToDelete] = useState<CustomPage | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'customPages'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const pagesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomPage));
            setPages(pagesData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching pages:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);
    
    const resetForm = () => {
        setTitle('');
        setSlug('');
        setContent('');
        setStatus('draft');
        setEditingPage(null);
    };

    const handleOpenModal = (page: CustomPage | null = null) => {
        if (page) {
            setEditingPage(page);
            setTitle(page.title);
            setSlug(page.slug);
            setContent(page.content);
            setStatus(page.status);
        } else {
            resetForm();
        }
        setIsModalOpen(true);
    };
    
    const handleCloseModal = () => {
        setIsModalOpen(false);
        resetForm();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !slug.trim() || !content.trim()) {
            showMessage('Title, slug, and content are required.', true);
            return;
        }
        setIsSubmitting(true);
        try {
            if (editingPage) {
                const pageRef = doc(db, 'customPages', editingPage.id);
                await updateDoc(pageRef, {
                    title,
                    slug,
                    content,
                    status,
                    updatedAt: serverTimestamp()
                });
                showMessage('Page updated successfully!');
            } else {
                await addDoc(collection(db, 'customPages'), {
                    title,
                    slug,
                    content,
                    status,
                    createdAt: serverTimestamp(),
                });
                showMessage('Page created successfully!');
            }
            handleCloseModal();
        } catch (error) {
            showMessage(`Error: ${error instanceof Error ? error.message : 'An unknown error occurred'}.`, true);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClick = (page: CustomPage) => {
        setPageToDelete(page);
    };

    const confirmDelete = async () => {
        if (!pageToDelete) return;
        try {
            await deleteDoc(doc(db, 'customPages', pageToDelete.id));
            showMessage('Page deleted successfully!');
        } catch (error) {
            showMessage('Failed to delete page.', true);
        } finally {
            setPageToDelete(null);
        }
    };
    
    const toggleStatus = async (page: CustomPage) => {
        const newStatus = page.status === 'published' ? 'draft' : 'published';
        try {
            const pageRef = doc(db, 'customPages', page.id);
            await updateDoc(pageRef, { status: newStatus });
            showMessage(`Page status updated to ${newStatus}.`);
        } catch (error) {
            showMessage('Failed to update page status.', true);
        }
    };

    return (
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border-t-4 border-indigo-500">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                    <BookText size={32} /> Manage Custom Pages
                </h1>
                <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                    <PlusCircle size={18} /> Add New Page
                </button>
            </div>
            
            {loading ? (
                <SkeletonTable columns={4} rows={5} />
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {pages.length === 0 && (
                                <tr><td colSpan={4} className="text-center py-10 text-gray-500">No custom pages found.</td></tr>
                            )}
                            {pages.map(page => (
                                <tr key={page.id}>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{page.title}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">/{page.slug}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {page.status === 'published' ? (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Published</span>
                                        ) : (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Draft</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center space-x-4">
                                            <button onClick={() => toggleStatus(page)} className={`font-semibold ${page.status === 'published' ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}`}>
                                                {page.status === 'published' ? 'Unpublish' : 'Publish'}
                                            </button>
                                            <button onClick={() => handleOpenModal(page)} className="text-indigo-600 hover:text-indigo-900"><Pencil size={18} /></button>
                                            <button onClick={() => handleDeleteClick(page)} className="text-red-600 hover:text-red-900"><Trash2 size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingPage ? 'Edit Page' : 'Create New Page'} size="lg">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="page-title" className="block text-sm font-medium mb-1">Title</label>
                        <input id="page-title" type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" required />
                    </div>
                    <div>
                        <label htmlFor="page-slug" className="block text-sm font-medium mb-1">Slug</label>
                        <input id="page-slug" type="text" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))} className="w-full p-2 border border-gray-300 rounded-lg" required />
                        <p className="text-xs text-gray-500 mt-1">URL-friendly identifier (e.g., about-our-company). No spaces or special characters.</p>
                    </div>
                    <div>
                        <label htmlFor="page-content" className="block text-sm font-medium mb-1">Content</label>
                        <textarea id="page-content" value={content} onChange={e => setContent(e.target.value)} rows={8} className="w-full p-2 border border-gray-300 rounded-lg" required></textarea>
                    </div>
                     <div>
                        <label className="block text-sm font-medium mb-1">Status</label>
                        <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full p-2 border border-gray-300 rounded-lg bg-white">
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={handleCloseModal} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400">
                            {isSubmitting ? 'Saving...' : 'Save Page'}
                        </button>
                    </div>
                </form>
            </Modal>

            {pageToDelete && (
                <ConfirmModal
                    isOpen={!!pageToDelete}
                    onClose={() => setPageToDelete(null)}
                    onConfirm={confirmDelete}
                    title="Delete Page"
                    message={`Are you sure you want to permanently delete the page "${pageToDelete.title}"? This action cannot be undone.`}
                    confirmText="Delete"
                />
            )}
        </div>
    );
};

export default ManagePages;