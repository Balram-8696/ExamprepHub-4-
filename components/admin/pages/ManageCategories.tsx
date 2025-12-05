
import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, deleteDoc, doc, where, getDocs, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { Category } from '../../../types';
import { showMessage, getCategoryStyle, formatFirebaseError } from '../../../utils/helpers';
import { FolderPlus, Trash2, Pencil, X, FolderKanban } from 'lucide-react';
import ConfirmModal from '../../modals/ConfirmModal';
import Modal from '../../modals/Modal';
import SkeletonList from '../../skeletons/SkeletonList';
import DynamicIcon from '../../layout/DynamicIcon';

const ManageCategories: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [testCounts, setTestCounts] = useState<{ [key: string]: number }>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Delete modal state
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

    // Add/Edit Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [formName, setFormName] = useState('');
    const [formParentId, setFormParentId] = useState(''); // Empty string for top-level
    const [formIcon, setFormIcon] = useState('');

    // Refs for drag and drop
    const dragItemIndex = useRef<number | null>(null);
    const dragOverItemIndex = useRef<number | null>(null);

    useEffect(() => {
        const q = query(collection(db, 'testCategories'), orderBy('name'));
        const unsubscribeCategories = onSnapshot(q, (snapshot) => {
            const categoriesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
            setCategories(categoriesData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching categories:", error);
            showMessage(formatFirebaseError(error, "Error: Could not load categories."), true);
            setLoading(false);
        });
        
        const testsQuery = query(collection(db, 'tests'));
        const unsubscribeTests = onSnapshot(testsQuery, (snapshot) => {
            const counts: { [key: string]: number } = {};
            snapshot.docs.forEach(doc => {
                const test = doc.data();
                if (test.categoryId) {
                    counts[test.categoryId] = (counts[test.categoryId] || 0) + 1;
                }
            });
            setTestCounts(counts);
        }, (error) => {
            console.error("Error fetching test counts:", error);
            showMessage(formatFirebaseError(error, "Error: Could not load test counts for categories."), true);
        });

        return () => {
            unsubscribeCategories();
            unsubscribeTests();
        };
    }, []);

    const getDescendantIds = (categoryId: string): string[] => {
        let descendants: string[] = [];
        const children = categories.filter(c => c.parentId === categoryId);
        for (const child of children) {
            descendants.push(child.id);
            descendants = [...descendants, ...getDescendantIds(child.id)];
        }
        return descendants;
    };
    
    const availableParentCategories = editingCategory 
        ? categories.filter(c => c.id !== editingCategory.id && !getDescendantIds(editingCategory.id).includes(c.id))
        : categories;


    const handleOpenModal = (category: Category | null) => {
        if (category) {
            setEditingCategory(category);
            setFormName(category.name);
            setFormParentId(category.parentId || '');
            setFormIcon(category.icon || '');
        } else {
            setEditingCategory(null);
            setFormName('');
            setFormParentId('');
            setFormIcon('');
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCategory(null);
        setFormName('');
        setFormParentId('');
        setFormIcon('');
    };

    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formName.trim()) return;

        setIsSubmitting(true);
        const data = {
            name: formName,
            parentId: formParentId || null,
            icon: formIcon,
        };

        try {
            if (editingCategory) {
                const categoryRef = doc(db, 'testCategories', editingCategory.id);
                await updateDoc(categoryRef, data);
                showMessage('Category updated successfully!');
            } else {
                await addDoc(collection(db, 'testCategories'), {
                    ...data,
                    createdAt: serverTimestamp()
                });
                showMessage('Category added successfully!');
            }
            handleCloseModal();
        } catch (error) {
            showMessage(formatFirebaseError(error, `Failed to save category.`), true);
            console.error("Error saving category:", error);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeleteClick = (category: Category) => {
        setCategoryToDelete(category);
    };

    const confirmDelete = async () => {
        if (!categoryToDelete) return;
        setIsSubmitting(true);
        try {
            const subCategoriesQuery = query(collection(db, 'testCategories'), where("parentId", "==", categoryToDelete.id));
            const subCategoriesSnapshot = await getDocs(subCategoriesQuery);
            if (!subCategoriesSnapshot.empty) {
                showMessage("Cannot delete category. It contains sub-categories. Please delete them first.", true);
                return;
            }

            const testsQuery = query(collection(db, 'tests'), where("categoryId", "==", categoryToDelete.id));
            const testsSnapshot = await getDocs(testsQuery);
            if (!testsSnapshot.empty) {
                showMessage("Cannot delete category. It is associated with one or more tests.", true);
                return;
            }

            await deleteDoc(doc(db, 'testCategories', categoryToDelete.id));
            showMessage('Category deleted successfully!');
        } catch (error) {
            showMessage(formatFirebaseError(error, 'Failed to delete category.'), true);
            console.error("Error deleting category: ", error);
        } finally {
            setIsSubmitting(false);
            setCategoryToDelete(null);
        }
    };
    
    const handleAddSection = async (e: React.FormEvent<HTMLFormElement>, categoryId: string) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);
        const newSectionName = (formData.get('newSection') as string)?.trim();
        
        if (!newSectionName) return;

        const categoryRef = doc(db, 'testCategories', categoryId);
        try {
            await updateDoc(categoryRef, {
                sections: arrayUnion(newSectionName)
            });
            showMessage('Section added!');
            form.reset();
        } catch (err) {
            console.error(err);
            showMessage(formatFirebaseError(err, 'Failed to add section.'), true);
        }
    };

    const handleRemoveSection = async (categoryId: string, section: string) => {
        const categoryRef = doc(db, 'testCategories', categoryId);
        try {
            await updateDoc(categoryRef, {
                sections: arrayRemove(section)
            });
            showMessage('Section removed.');
        } catch (err) {
            showMessage(formatFirebaseError(err, 'Failed to remove section.'), true);
        }
    };

    const handleSectionDrop = async (categoryId: string) => {
        if (dragItemIndex.current === null || dragOverItemIndex.current === null) return;
        
        const category = categories.find(c => c.id === categoryId);
        if (!category || !category.sections) return;

        const newSections = [...category.sections];
        const draggedItem = newSections.splice(dragItemIndex.current, 1)[0];
        newSections.splice(dragOverItemIndex.current, 0, draggedItem);
        
        dragItemIndex.current = null;
        dragOverItemIndex.current = null;
        
        try {
            await updateDoc(doc(db, 'testCategories', categoryId), { sections: newSections });
        } catch (error) {
            showMessage(formatFirebaseError(error, 'Failed to save section order.'), true);
        }
    };

    const renderCategorySections = (cat: Category) => (
        <div className="pl-6 ml-3 mt-3 pt-3 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-600 mb-2">Sections</h4>
            <div 
                className="flex flex-wrap gap-2 mb-3"
                onDrop={() => handleSectionDrop(cat.id)}
                onDragOver={(e) => e.preventDefault()}
            >
                {(cat.sections || []).map((sec, index) => (
                    <div 
                        key={sec} 
                        className="flex items-center bg-gray-200 text-gray-800 text-sm font-medium pl-2.5 pr-1 py-1 rounded-full cursor-move"
                        draggable
                        onDragStart={() => dragItemIndex.current = index}
                        onDragEnter={() => dragOverItemIndex.current = index}
                    >
                        <span>{sec}</span>
                        <button onClick={() => handleRemoveSection(cat.id, sec)} className="ml-1.5 -mr-1 p-0.5 rounded-full hover:bg-gray-300 transition-colors">
                            <X size={14} />
                        </button>
                    </div>
                ))}
                {(cat.sections || []).length === 0 && <p className="text-xs text-gray-400 italic">No sections defined.</p>}
            </div>
            <form onSubmit={(e) => handleAddSection(e, cat.id)} className="flex gap-2 items-center">
                <input 
                    type="text" 
                    name="newSection"
                    placeholder="New section name"
                    className="flex-grow p-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                />
                <button type="submit" className="px-3 py-1.5 bg-indigo-500 text-white text-sm font-semibold rounded-lg hover:bg-indigo-600 disabled:bg-indigo-300">
                    Add
                </button>
            </form>
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3"><FolderKanban /> Manage Categories</h2>
                    <button onClick={() => handleOpenModal(null)} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                        <FolderPlus size={18} /> Add New Category
                    </button>
                </div>
                
                <h3 className="text-xl font-bold text-gray-800 mb-4">Existing Categories</h3>
                {loading ? (
                    <SkeletonList items={3} />
                ) : (
                    <ul className="space-y-3">
                        {categories.filter(c => !c.parentId).map(parent => {
                            const parentStyle = getCategoryStyle(parent.name);
                            return (
                            <li key={parent.id} className="bg-gray-50 p-3 rounded-lg border">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-md flex items-center justify-center ${parentStyle.bg} ${parentStyle.text}`}>
                                            <DynamicIcon name={parent.icon || parent.name} className="w-5 h-5"/>
                                        </div>
                                        <span className="font-semibold text-gray-800">{parent.name}</span>
                                        <span className="text-xs font-mono bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{testCounts[parent.id] || 0} tests</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleOpenModal(parent)} className="text-blue-500 hover:text-blue-700 p-1.5 rounded-full hover:bg-blue-100 disabled:opacity-50" disabled={isSubmitting}><Pencil size={16} /></button>
                                        <button onClick={() => handleDeleteClick(parent)} className="text-red-500 hover:text-red-700 p-1.5 rounded-full hover:bg-red-100 disabled:opacity-50" disabled={isSubmitting}><Trash2 size={16} /></button>
                                    </div>
                                </div>
                                
                                {renderCategorySections(parent)}

                                <ul className="pl-6 mt-2 space-y-2 font-normal text-gray-600 border-l-2 border-indigo-200 ml-3">
                                    {categories.filter(c => c.parentId === parent.id).length > 0 ? categories.filter(c => c.parentId === parent.id).map(child => {
                                        const childStyle = getCategoryStyle(child.name);
                                        return (
                                        <li key={child.id} className="pt-1 bg-white border rounded-lg mt-2 p-2">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${childStyle.bg} ${childStyle.text}`}>
                                                        <DynamicIcon name={child.icon || child.name} className="w-4 h-4"/>
                                                    </div>
                                                    <span>{child.name}</span>
                                                    <span className="text-xs font-mono bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{testCounts[child.id] || 0} tests</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                     <button onClick={() => handleOpenModal(child)} className="text-blue-500 hover:text-blue-700 p-1.5 rounded-full hover:bg-blue-100 disabled:opacity-50" disabled={isSubmitting}><Pencil size={16} /></button>
                                                     <button onClick={() => handleDeleteClick(child)} className="text-red-500 hover:text-red-700 p-1.5 rounded-full hover:bg-red-100 disabled:opacity-50" disabled={isSubmitting}><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                            {/* Allow adding sections to subcategories too */}
                                            {renderCategorySections(child)}
                                        </li>
                                    )}) : <li className="text-sm text-gray-400 italic pl-4 py-2">No sub-categories</li>}
                                </ul>
                            </li>
                        )})}
                    </ul>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingCategory ? 'Edit Category' : 'Add New Category'}
            >
                <form onSubmit={handleSaveCategory} className="space-y-4">
                    <div>
                        <label htmlFor="category-name" className="block text-sm font-medium mb-1">Category Name</label>
                        <input
                            id="category-name"
                            type="text"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg"
                            placeholder="e.g., Engineering"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="category-icon" className="block text-sm font-medium mb-1">Icon Name (Optional)</label>
                        <input
                            id="category-icon"
                            type="text"
                            value={formIcon}
                            onChange={(e) => setFormIcon(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg"
                            placeholder="e.g., law, science, computer"
                        />
                        <p className="text-xs text-gray-500 mt-1">Enter a keyword for a dynamic icon.</p>
                    </div>
                    <div>
                        <label htmlFor="parent-category" className="block text-sm font-medium mb-1">Parent Category</label>
                        <select
                            id="parent-category"
                            value={formParentId}
                            onChange={(e) => setFormParentId(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg bg-white"
                        >
                            <option value="">None (Top-level category)</option>
                            {availableParentCategories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={handleCloseModal} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400">
                            {isSubmitting ? 'Saving...' : 'Save Category'}
                        </button>
                    </div>
                </form>
            </Modal>

            {categoryToDelete && (
                <ConfirmModal
                    isOpen={!!categoryToDelete}
                    onClose={() => setCategoryToDelete(null)}
                    onConfirm={confirmDelete}
                    title="Delete Category"
                    message={`Are you sure you want to delete the category "${categoryToDelete.name}"? This action cannot be undone.`}
                    confirmText={isSubmitting ? "Deleting..." : "Delete"}
                />
            )}
        </div>
    );
};

export default ManageCategories;
