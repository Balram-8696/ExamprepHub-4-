

import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { CustomPage } from '../../types';
import { FileWarning, ArrowLeft } from 'lucide-react';
import SkeletonPage from '../skeletons/SkeletonPage';

interface CustomPageViewProps {
    slug: string;
    onNavigate: (view: string) => void;
    onBack: () => void;
    onPageLoad: (title: string) => void;
}

export const CustomPageView: React.FC<CustomPageViewProps> = ({ slug, onNavigate, onBack, onPageLoad }) => {
    const [page, setPage] = useState<CustomPage | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        setError('');
        const q = query(
            collection(db, 'customPages'), 
            where("slug", "==", slug),
            where("status", "==", "published"),
            limit(1)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
                setPage(null);
                setError('Page not found.');
                onPageLoad('Not Found');
            } else {
                const pageData = snapshot.docs[0].data() as CustomPage;
                setPage({ ...pageData, id: snapshot.docs[0].id });
                onPageLoad(pageData.title);
            }
            setLoading(false);
        }, (err) => {
            console.error("Error fetching custom page:", err);
            setError('Failed to load page content.');
            onPageLoad('Error');
            setLoading(false);
        });

        return () => unsubscribe();
    }, [slug, onPageLoad]);

    if (loading) {
        return <SkeletonPage />;
    }

    if (error || !page) {
        return (
             <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center">
                 <div className="bg-white dark:bg-gray-800 p-10 rounded-xl shadow-md">
                    <FileWarning className="w-16 h-16 text-red-400 mx-auto" />
                    <h2 className="text-2xl font-bold mt-4 text-gray-900 dark:text-gray-100">Oops! Page Not Found</h2>
                    <p className="text-gray-600 dark:text-gray-300 mt-2">{error || 'The page you are looking for does not exist or has been moved.'}</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="bg-white dark:bg-gray-900 py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                    >
                        <ArrowLeft size={18} /> Back
                    </button>
                </div>
            </div>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="prose prose-indigo dark:prose-invert text-gray-500 dark:text-gray-400 mx-auto lg:max-w-none">
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">{page.title}</h1>
                    <div dangerouslySetInnerHTML={{ __html: page.content }} />
                </div>
            </div>
        </div>
    );
};
