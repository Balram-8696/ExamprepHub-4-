import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { UpdateArticle, ArticleBlock } from '../../types';
import { showMessage } from '../../utils/helpers';
import { Newspaper, Inbox, ChevronRight } from 'lucide-react';
import SkeletonList from '../skeletons/SkeletonList';

interface UpdatesPageProps {
    onNavigate: (view: string) => void;
}

const UpdatesPage: React.FC<UpdatesPageProps> = ({ onNavigate }) => {
    const [articles, setArticles] = useState<UpdateArticle[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(
            collection(db, 'updateArticles'), 
            where('status', '==', 'published'),
            orderBy('publishAt', 'desc') // Order by publishAt for latest articles
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const articlesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UpdateArticle));
            // No need to sort again if ordered by publishAt in query
            setArticles(articlesData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching articles:", error);
            showMessage("Failed to load updates.", true);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const getSnippet = (blocks: ArticleBlock[]) => {
        if (!blocks) return '';
        const textContent = blocks
            .filter(block => ['paragraph', 'h2', 'h3', 'quote'].includes(block.type))
            .map(block => (block as any).content)
            .join(' ');
        const trimmedText = textContent.replace(/\s+/g, ' ').trim();
        return trimmedText.length > 150 ? trimmedText.substring(0, 150) + '...' : trimmedText;
    };

    const formatDate = (timestamp: Timestamp) => {
        if (!timestamp) return '';
        return timestamp.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-lg mb-8 border-t-4 border-indigo-500">
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                    <Newspaper size={32} /> Latest Updates
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-2">Stay informed with the latest articles, announcements, and content updates.</p>
            </div>

            {loading ? <SkeletonList items={5} /> : (
                <div className="space-y-6">
                    {articles.length === 0 ? (
                        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl shadow-md">
                            <Inbox className="w-16 h-16 text-gray-400 mx-auto" />
                            <h3 className="text-xl font-semibold mt-4 text-gray-800 dark:text-gray-100">No Updates Yet</h3>
                            <p className="text-gray-500 dark:text-gray-400 mt-2">Check back soon for the latest news and articles.</p>
                        </div>
                    ) : (
                        articles.map(article => (
                            <button key={article.id} onClick={() => onNavigate(`update/${article.slug}`)} className="w-full text-left p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-500 flex flex-col md:flex-row items-start gap-6">
                                {article.featuredImageUrl && (
                                    <img src={article.featuredImageUrl} alt={article.title} className="w-full md:w-48 h-40 md:h-auto object-cover rounded-lg flex-shrink-0" />
                                )}
                                <div className="flex-grow flex flex-col">
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        <span>{article.authorName || 'Admin'}</span>
                                        <span className="mx-2">&middot;</span>
                                        <span>{formatDate(article.publishAt)}</span>
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mt-1">{article.title}</h2>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 flex-grow">{getSnippet(article.blocks)}</p>
                                    <div className="flex items-center text-indigo-600 dark:text-indigo-400 font-semibold text-sm mt-4">
                                        Read More <ChevronRight className="w-4 h-4 ml-1" />
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default UpdatesPage;