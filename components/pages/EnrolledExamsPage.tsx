
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { AuthContext } from '../../AuthContext';
import { Category, Test, UserResult } from '../../types';
import { BookmarkCheck, PlayCircle, Inbox, ArrowRight, LayoutDashboard } from 'lucide-react';
import DynamicIcon from '../layout/DynamicIcon';
import SkeletonList from '../skeletons/SkeletonList';

interface EnrolledExamsPageProps {
    onNavigate: (view: string) => void;
}

const EnrolledExamsPage: React.FC<EnrolledExamsPageProps> = ({ onNavigate }) => {
    const { user, userProfile } = useContext(AuthContext);
    const [categories, setCategories] = useState<Category[]>([]);
    const [allTests, setAllTests] = useState<Test[]>([]);
    const [userResults, setUserResults] = useState<UserResult[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !userProfile?.enrolledCategoryIds || userProfile.enrolledCategoryIds.length === 0) {
            setLoading(false);
            return;
        }

        setLoading(true);

        // 1. Fetch All Categories
        const unsubscribeCats = onSnapshot(collection(db, 'testCategories'), (snapshot) => {
            const catsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
            setCategories(catsData);
        });

        // 2. Fetch All Tests
        const qTests = query(collection(db, 'tests'), where("status", "==", "published"));
        const unsubscribeTests = onSnapshot(qTests, (snapshot) => {
            const testsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Test));
            setAllTests(testsData);
        });

        // 3. Fetch User Results
        const qResults = query(collection(db, 'results'), where("userId", "==", user.uid));
        const unsubscribeResults = onSnapshot(qResults, (snapshot) => {
            const resultsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserResult));
            setUserResults(resultsData);
            setLoading(false);
        });

        return () => {
            unsubscribeCats();
            unsubscribeTests();
            unsubscribeResults();
        };
    }, [user, userProfile]);

    const isTestLive = (test: Test) => {
        const now = new Date();
        // Handle potential missing dates safely
        const publishDate = test.publishAt instanceof Timestamp ? test.publishAt.toDate() : (test.publishAt ? new Date(test.publishAt) : undefined);
        const expiryDate = test.expiresAt instanceof Timestamp ? test.expiresAt.toDate() : (test.expiresAt ? new Date(test.expiresAt) : undefined);
        
        return (!publishDate || publishDate <= now) && (!expiryDate || expiryDate >= now);
    };

    // Enrolled Categories Data Calculation
    const enrolledCategoriesData = useMemo(() => {
        if (!userProfile?.enrolledCategoryIds || !categories.length || !allTests.length) return [];

        return userProfile.enrolledCategoryIds.map(catId => {
            const category = categories.find(c => c.id === catId);
            if (!category) return null;

            // Helper to get all category IDs including children
            const getDescendantIds = (id: string, allCats: Category[]): string[] => {
                let ids = [id];
                allCats.filter(c => c.parentId === id).forEach(child => {
                    ids = ids.concat(getDescendantIds(child.id, allCats));
                });
                return ids;
            };
            
            const relevantCategoryIds = getDescendantIds(catId, categories);
            
            const categoryTests = allTests.filter(t => relevantCategoryIds.includes(t.categoryId || '') && isTestLive(t));
            const totalTests = categoryTests.length;

            // Find unique completed tests in this category
            const completedTests = new Set(
                userResults
                    .filter(r => relevantCategoryIds.includes(r.categoryId || ''))
                    .map(r => r.testId)
            ).size;

            return {
                category,
                totalTests,
                completedTests,
                progress: totalTests > 0 ? (completedTests / totalTests) * 100 : 0
            };
        }).filter(Boolean) as { category: Category, totalTests: number, completedTests: number, progress: number }[];
    }, [userProfile?.enrolledCategoryIds, categories, allTests, userResults]);

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg mb-8 border-t-4 border-indigo-500 animate-pulse">
                    <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded mt-3"></div>
                </div>
                <SkeletonList items={3} />
            </div>
        );
    }

    if (!user || !userProfile?.enrolledCategoryIds || userProfile.enrolledCategoryIds.length === 0) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center">
                <div className="bg-white dark:bg-gray-800 p-10 rounded-xl shadow-md">
                    <Inbox className="w-16 h-16 text-gray-400 mx-auto" />
                    <h3 className="text-xl font-semibold mt-4 text-gray-800 dark:text-gray-100">No Enrolled Exams</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">You haven't enrolled in any test series yet. Browse categories to get started!</p>
                    <button onClick={() => onNavigate('home')} className="mt-6 px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
                        Explore Categories
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-lg mb-8 border-t-4 border-indigo-500">
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                    <BookmarkCheck size={32} /> Your Enrolled Exams
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-2">Track your progress and continue your preparation for your enrolled test series.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                {enrolledCategoriesData.map((item) => (
                    <div key={item.category.id} className="relative overflow-hidden rounded-2xl p-6 shadow-xl border group hover:-translate-y-1 transition-all duration-300 bg-white border-gray-200 text-gray-900 dark:bg-gradient-to-br dark:from-indigo-900 dark:via-slate-900 dark:to-slate-900 dark:border-slate-700 dark:text-white">
                        {/* Subtle Background Pattern */}
                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]"></div>
                        
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg bg-indigo-50 text-indigo-600 dark:bg-white/10 dark:backdrop-blur-sm dark:text-white">
                                    <DynamicIcon name={item.category.icon || item.category.name} className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold leading-tight line-clamp-2 text-gray-900 dark:text-white">{item.category.name}</h3>
                                    <p className="text-xs font-medium uppercase tracking-wider mt-1 text-indigo-600 dark:text-indigo-300">Enrolled</p>
                                </div>
                            </div>

                            <div className="mb-6 flex-grow">
                                <div className="flex justify-between text-sm mb-2 font-medium text-indigo-700 dark:text-indigo-200">
                                    <span>Progress</span>
                                    <span className="font-bold text-indigo-900 dark:text-white">{item.progress.toFixed(0)}%</span>
                                </div>
                                <div className="w-full rounded-full h-3 overflow-hidden border bg-gray-100 border-gray-200 dark:bg-slate-800/50 dark:border-slate-700/50">
                                    <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-1000 ease-out relative" style={{ width: `${item.progress}%` }}>
                                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                    </div>
                                </div>
                                <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-slate-400">
                                    <span>{item.completedTests} / {item.totalTests} Tests Completed</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mt-auto">
                                <button 
                                    onClick={() => onNavigate(`dashboard:${item.category.id}`)} 
                                    className="py-2.5 px-3 rounded-xl font-bold text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <LayoutDashboard size={16} /> ScoreBoard
                                </button>
                                <button 
                                    onClick={() => onNavigate(`category:${item.category.id}`)} 
                                    className="py-2.5 px-3 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-white dark:text-indigo-900 dark:hover:bg-indigo-50 transition-all shadow-lg shadow-indigo-500/20 dark:shadow-none flex items-center justify-center gap-2"
                                >
                                    <PlayCircle size={16} /> Practice
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EnrolledExamsPage;
