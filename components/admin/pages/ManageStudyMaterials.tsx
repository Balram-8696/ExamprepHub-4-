
import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../../services/firebase';
import { Category, StudyMaterial } from '../../../types';
import { showMessage } from '../../../utils/helpers';
import { BookCopy, PlusCircle, Trash2, Loader2, File as FileIcon, Youtube } from 'lucide-react';

const ManageStudyMaterials: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [materials, setMaterials] = useState<StudyMaterial[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'pdf' | 'video'>('pdf');
    const [file, setFile] = useState<globalThis.File | null>(null);
    const [videoUrl, setVideoUrl] = useState('');

    useEffect(() => {
        // Fetch only top-level categories
        const q = query(collection(db, 'testCategories'), where('parentId', '==', null), orderBy('name'));
        const unsubscribe = onSnapshot(q, snapshot => {
            setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        if (!selectedCategory) {
            setMaterials([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        const q = query(collection(db, 'studyMaterials'), where('categoryId', '==', selectedCategory), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, snapshot => {
            setMaterials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudyMaterial)));
            setLoading(false);
        });
        return unsubscribe;
    }, [selectedCategory]);

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setType('pdf');
        setFile(null);
        setVideoUrl('');
    };
    
    const getYouTubeEmbedUrl = (url: string) => {
        let videoId = '';
        try {
            const urlObj = new URL(url);
            if (urlObj.hostname === 'youtu.be') {
                videoId = urlObj.pathname.slice(1);
            } else if (urlObj.hostname.includes('youtube.com')) {
                videoId = urlObj.searchParams.get('v') || '';
            }
        } catch(e) {
            // It might be just the ID
            const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
            if(match && match[2].length === 11) {
                 videoId = match[2];
            } else {
                 videoId = url;
            }
        }

        if (videoId) {
            return `https://www.youtube.com/embed/${videoId}`;
        }
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCategory || !title.trim() || (type === 'pdf' && !file) || (type === 'video' && !videoUrl.trim())) {
            showMessage('Please fill all required fields.', true);
            return;
        }
        setIsSubmitting(true);
        
        try {
            const categoryName = categories.find(c => c.id === selectedCategory)?.name || '';
            let materialUrl = '';
            let fileName = '';

            if (type === 'pdf' && file) {
                const storageRef = ref(storage, `study_materials/${selectedCategory}/${Date.now()}_${file.name}`);
                const snapshot = await uploadBytes(storageRef, file);
                materialUrl = await getDownloadURL(snapshot.ref);
                fileName = snapshot.ref.name;
            } else if (type === 'video') {
                const embedUrl = getYouTubeEmbedUrl(videoUrl);
                if (!embedUrl) {
                    showMessage('Invalid YouTube URL or ID provided.', true);
                    setIsSubmitting(false);
                    return;
                }
                materialUrl = embedUrl;
            }

            await addDoc(collection(db, 'studyMaterials'), {
                categoryId: selectedCategory,
                categoryName,
                title,
                description,
                type,
                url: materialUrl,
                fileName: fileName || null,
                createdAt: serverTimestamp(),
            });

            showMessage('Study material added successfully!');
            resetForm();

        } catch (error) {
            console.error(error);
            showMessage('Failed to add study material.', true);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (material: StudyMaterial) => {
        if (!window.confirm(`Are you sure you want to delete "${material.title}"?`)) return;

        try {
            await deleteDoc(doc(db, 'studyMaterials', material.id));
            if (material.type === 'pdf' && material.fileName) {
                const fileRef = ref(storage, `study_materials/${material.categoryId}/${material.fileName}`);
                await deleteObject(fileRef);
            }
            showMessage('Material deleted successfully.');
        } catch (error) {
            console.error(error);
            showMessage('Failed to delete material.', true);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2"><BookCopy/>Add Study Material</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Category</label>
                        <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" required>
                            <option value="">-- Select a Category --</option>
                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Title</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Description</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Type</label>
                        <select value={type} onChange={e => setType(e.target.value as any)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                            <option value="pdf">PDF Document</option>
                            <option value="video">YouTube Video</option>
                        </select>
                    </div>
                    {type === 'pdf' ? (
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Upload PDF</label>
                            <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} accept="application/pdf" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" required />
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">YouTube Video URL or ID</label>
                            <input type="text" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700" required />
                        </div>
                    )}
                    <button type="submit" disabled={isSubmitting || !selectedCategory} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 flex items-center gap-2">
                        {isSubmitting ? <Loader2 className="animate-spin"/> : <PlusCircle size={18}/>}
                        Add Material
                    </button>
                </form>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Existing Materials for "{categories.find(c => c.id === selectedCategory)?.name || '...'}"</h2>
                {loading ? <p>Loading...</p> : materials.length === 0 ? <p className="text-gray-500 dark:text-gray-400">No materials found for this category.</p> : (
                    <div className="space-y-3">
                        {materials.map(mat => (
                            <div key={mat.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-700">
                                <div className="flex items-center gap-3">
                                    {mat.type === 'pdf' ? <FileIcon className="text-red-500"/> : <Youtube className="text-blue-500"/>}
                                    <div>
                                        <p className="font-semibold text-gray-800 dark:text-gray-100">{mat.title}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-300">{mat.description}</p>
                                    </div>
                                </div>
                                <button onClick={() => handleDelete(mat)} className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full"><Trash2 size={16}/></button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManageStudyMaterials;
