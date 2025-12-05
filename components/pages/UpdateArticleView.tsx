import React, { useState, useEffect, useContext } from 'react';
import { collection, query, where, onSnapshot, limit, doc, getDoc, updateDoc, increment, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { UpdateArticle, Test, Category, UserResult, TestStateLocal, ArticleBlock } from '../../types';
import { FileWarning, Loader2, Link } from 'lucide-react';
import SkeletonPage from '../skeletons/SkeletonPage';
import TestCard from '../home/TestCard';
import { AuthContext } from '../../AuthContext';
import DynamicIcon from '../layout/DynamicIcon';

interface EmbeddedTestProps {
    testId: string;
    onInitiateTestView: (details: { test: Test; action: 'resume' | 'result'; resultData?: UserResult, language: 'english' | 'hindi' }) => void;
    onShowInstructions: (test: Test) => void;
}

const EmbeddedTest: React.FC<EmbeddedTestProps> = ({ testId, onInitiateTestView, onShowInstructions }) => {
    const { user } = useContext(AuthContext);
    const [test, setTest] = useState<Test | null>(null);
    const [userResult, setUserResult] = useState<UserResult | undefined>(undefined);
    const [inProgress, setInProgress] = useState<TestStateLocal | null>(null);

    useEffect(() => {
        const testRef = doc(db, 'tests', testId);
        const unsubscribeTest = onSnapshot(testRef, docSnap => {
            if (docSnap.exists()) {
                setTest({ id: docSnap.id, ...docSnap.data() } as Test);
            } else {
                setTest(null);
            }
        });

        let unsubscribeResult: (() => void) | undefined;
        if (user) {
            const resultsQuery = query(collection(db, 'results'), where('userId', '==', user.uid), where('testId', '==', testId), orderBy('submittedAt', 'desc'), limit(1));
            unsubscribeResult = onSnapshot(resultsQuery, snap => {
                if (!snap.empty) {
                    setUserResult(snap.docs[0].data() as UserResult);
                } else {
                    setUserResult(undefined);
                }
            });
            const local = localStorage.getItem(`inProgressTest_${user.uid}`);
            if (local) {
                const inProgressTest = JSON.parse(local);
                if (inProgressTest.testId === testId) {
                    setInProgress(inProgressTest);
                } else {
                    setInProgress(null);
                }
            } else {
                setInProgress(null);
            }
        } else {
            setUserResult(undefined);
            setInProgress(null);
        }

        return () => {
            unsubscribeTest();
            if (unsubscribeResult) unsubscribeResult();
        };
    }, [testId, user]);

    const handleAction = async (id: string, action: 'start' | 'resume' | 'result') => {
        if (!test) return;
        if (action === 'start') onShowInstructions(test);
        else if (action === 'resume') onInitiateTestView({ test, action: 'resume', language: 'english' });
        else if (action === 'result') onInitiateTestView({ test, action: 'result', resultData: userResult, language: 'english' });
    };

    if (!test) return <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-center text-gray-500 dark:text-gray-400">Test Not Found</div>;

    return <TestCard test={test} userResult={userResult} inProgressTest={inProgress} onAction={handleAction} />;
};

const EmbeddedCategory: React.FC<{ categoryId: string; onNavigate: (path: string) => void; }> = ({ categoryId, onNavigate }) => {
    const [category, setCategory] = useState<Category | null>(null);
    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, 'testCategories', categoryId), docSnap => {
            if (docSnap.exists()) setCategory({ id: docSnap.id, ...docSnap.data() } as Category);
            else setCategory(null);
        });
        return unsubscribe;
    }, [categoryId]);

    if (!category) return <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-center text-gray-500 dark:text-gray-400">Category Not Found</div>;

    return (
        <button onClick={() => onNavigate(`category:${categoryId}`)} className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/40 border-l-4 border-indigo-500 rounded-r-lg w-full text-left hover:bg-indigo-100 dark:hover:bg-indigo-900/60">
            <DynamicIcon name={category.icon || category.name} className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <div>
                <p className="text-xs text-indigo-500 dark:text-indigo-300 font-semibold">Featured Category</p>
                <p className="font-bold text-gray-800 dark:text-gray-100">{category.name}</p>
            </div>
        </button>
    );
};


interface UpdateArticleViewProps {
    slug: string;
    onNavigate: (view: string) => void;
    onPageLoad: (title: string) => void;
    onInitiateTestView: (details: { test: Test; action: 'resume' | 'result'; resultData?: UserResult, language: 'english' | 'hindi' }) => void;
    onShowInstructions: (test: Test) => void;
    article?: UpdateArticle; // New optional prop for direct article data
}

const UpdateArticleView: React.FC<UpdateArticleViewProps> = ({ slug, onPageLoad, article: propArticle, ...embedProps }) => {
    const [article, setArticle] = useState<UpdateArticle | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (propArticle) { // If article data is passed directly (e.g., from preview modal)
            setArticle(propArticle);
            onPageLoad(propArticle.title); // Update breadcrumbs/page title if needed
            setLoading(false);
            // Do NOT increment view count in preview mode
            return; 
        }

        // Original logic for fetching article by slug from Firestore
        setLoading(true);
        setError('');
        const q = query(collection(db, 'updateArticles'), where("slug", "==", slug), limit(1));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
                setError('Article not found.');
                onPageLoad('Not Found');
                setArticle(null);
                 setLoading(false);
            } else {
                const articleData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as UpdateArticle;
                if (articleData.status === 'published') {
                    setArticle(articleData);
                    onPageLoad(articleData.title);
                    
                    // Increment view count only for live, non-preview views
                    const viewedKey = `viewed_article_${articleData.id}`;
                    if (!sessionStorage.getItem(viewedKey)) {
                        const articleRef = doc(db, 'updateArticles', articleData.id);
                        updateDoc(articleRef, { viewCount: increment(1) })
                            .then(() => sessionStorage.setItem(viewedKey, 'true'))
                            .catch(err => console.error("Failed to increment view count", err));
                    }
                } else {
                    // Article exists but is not published
                    setError('Article not found.'); // Or 'Article is currently a draft.'
                    onPageLoad('Not Found');
                    setArticle(null);
                }
                setLoading(false);
            }
        }, (err) => {
            console.error("Error fetching article:", err);
            setError('Failed to load article content.');
            onPageLoad('Error');
            setLoading(false);
        });
        return () => unsubscribe();
    }, [slug, onPageLoad, propArticle]);

    const renderBlock = (block: ArticleBlock) => {
        switch (block.type) {
            case 'h2':
                return <h2 key={block.id} className="text-3xl font-bold mt-8 mb-4" dangerouslySetInnerHTML={{ __html: block.content }} />;
            case 'h3':
                return <h3 key={block.id} className="text-2xl font-bold mt-6 mb-3" dangerouslySetInnerHTML={{ __html: block.content }} />;
            case 'paragraph':
                return <p key={block.id} dangerouslySetInnerHTML={{ __html: block.content }} />;
            case 'image':
                return (
                    <figure key={block.id} className="my-6">
                        <img src={block.src} alt={block.caption || article?.title} className="rounded-lg shadow-md w-full" />
                        {block.caption && <figcaption className="text-center text-sm text-gray-500 mt-2">{block.caption}</figcaption>}
                    </figure>
                );
            case 'list':
                const ListTag = block.ordered ? 'ol' : 'ul';
                return (
                    <ListTag key={block.id} className={`list-inside ${block.ordered ? 'list-decimal' : 'list-disc'} space-y-1 my-4`}>
                        {block.items.map((item, index) => <li key={index} dangerouslySetInnerHTML={{ __html: item }} />)}
                    </ListTag>
                );
            case 'quote':
                return (
                    <blockquote key={block.id} className="border-l-4 border-indigo-500 pl-4 italic text-gray-600 dark:text-gray-400 my-6">
                        <p dangerouslySetInnerHTML={{ __html: block.content }} />
                        {block.author && <footer className="mt-2 text-sm not-italic">- {block.author}</footer>}
                    </blockquote>
                );
            case 'code':
                return (
                    <pre key={block.id} className="bg-gray-800 text-white p-4 rounded-lg overflow-x-auto text-sm my-6">
                        <code className={`language-${block.language}`}>{block.code}</code>
                    </pre>
                );
            case 'test_embed':
                return <div className="my-6 not-prose" key={block.id}><EmbeddedTest testId={block.testId} {...embedProps} /></div>;
            case 'category_embed':
                return <div className="my-6 not-prose" key={block.id}><EmbeddedCategory categoryId={block.categoryId} onNavigate={embedProps.onNavigate} /></div>;
            default:
                return null;
        }
    };


    const formatDate = (timestamp: Timestamp) => {
        if (!timestamp) return '';
        return timestamp.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };


    if (loading) return <SkeletonPage />;
    if (error || !article) return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center">
            <div className="bg-white dark:bg-gray-800 p-10 rounded-xl shadow-md">
                <FileWarning className="w-16 h-16 text-red-400 mx-auto" />
                <h2 className="text-2xl font-bold mt-4 text-gray-900 dark:text-gray-100">Article Not Found</h2>
                <p className="text-gray-600 dark:text-gray-300 mt-2">{error}</p>
            </div>
        </div>
    );
    
    return (
        <div className="bg-white dark:bg-slate-900 py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {article.featuredImageUrl && (
                    <img src={article.featuredImageUrl} alt={article.title} className="w-full h-auto max-h-96 object-cover rounded-xl mb-8 shadow-lg" />
                )}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100">{article.title}</h1>
                    <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                        <span>By {article.authorName || 'Admin'}</span>
                        <span className="mx-2">&middot;</span>
                        <span>Published on {formatDate(article.publishAt)}</span>
                    </div>
                </div>
                <div className="prose prose-lg prose-indigo dark:prose-invert text-gray-700 dark:text-gray-300 mx-auto lg:max-w-none">
                     {/* Backward compatibility for old articles */}
                    {(article as any).content && !article.blocks ? (
                        <div dangerouslySetInnerHTML={{ __html: (article as any).content }} />
                    ) : (
                        (article.blocks || []).map(block => renderBlock(block))
                    )}
                </div>
            </div>
        </div>
    );
};

export default UpdateArticleView;