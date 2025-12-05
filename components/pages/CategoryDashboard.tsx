import React, { useState, useEffect, useMemo, useContext } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { AuthContext } from '../../AuthContext';
import { Category, Test, UserResult } from '../../types';
import { showMessage, formatFirebaseError, getCategoryStyle } from '../../utils/helpers';
import { 
    ArrowLeft, TrendingUp, Target, CheckCircle, Clock, 
    BarChart2, Calendar, Award, PieChart, Trophy, Users,
    LayoutDashboard
} from 'lucide-react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, BarChart, Bar, Cell, Legend, RadarChart, 
    PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';
import SkeletonProfile from '../skeletons/SkeletonProfile';
import DynamicIcon from '../layout/DynamicIcon';

interface CategoryDashboardProps {
    categoryId: string;
    onNavigate: (view: string) => void;
    onBack: () => void;
}

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

interface LeaderboardEntry {
    userId: string;
    name: string;
    averageScore: number;
    testsTaken: number;
    rank: number;
}

type TabType = 'performance' | 'leaderboard' | 'comparison';

const CategoryDashboard: React.FC<CategoryDashboardProps> = ({ categoryId, onNavigate, onBack }) => {
    const { user } = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState<TabType>('performance');
    
    const [category, setCategory] = useState<Category | null>(null);
    const [tests, setTests] = useState<Test[]>([]);
    const [results, setResults] = useState<UserResult[]>([]); // Current user results
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]); // Top performers
    const [loading, setLoading] = useState(true);
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

    useEffect(() => {
        if (!user || !categoryId) return;

        setLoading(true);

        const fetchData = async () => {
            try {
                // 1. Fetch Category Details
                const catDoc = await getDoc(doc(db, 'testCategories', categoryId));
                if (catDoc.exists()) {
                    setCategory({ id: catDoc.id, ...catDoc.data() } as Category);
                }

                // 2. Fetch Tests in this Category (to know total available)
                const testsQuery = query(collection(db, 'tests'), where("categoryId", "==", categoryId));
                const unsubscribeTests = onSnapshot(testsQuery, (snapshot) => {
                     const testsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Test));
                     setTests(testsData);
                });

                // 3. Fetch User Results for this Category
                const resultsQuery = query(
                    collection(db, 'results'), 
                    where("userId", "==", user.uid),
                    where("categoryId", "==", categoryId)
                );
                const unsubscribeResults = onSnapshot(resultsQuery, (snapshot) => {
                    const resultsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserResult));
                    
                    // Sort by submittedAt ascending (oldest to newest) manually
                    resultsData.sort((a, b) => {
                        const dateA = a.submittedAt instanceof Timestamp ? a.submittedAt.toMillis() : 0;
                        const dateB = b.submittedAt instanceof Timestamp ? b.submittedAt.toMillis() : 0;
                        return dateA - dateB;
                    });

                    setResults(resultsData);
                    setLoading(false);
                });

                return () => {
                    unsubscribeTests();
                    unsubscribeResults();
                };

            } catch (error) {
                console.error("Error loading dashboard data:", error);
                showMessage(formatFirebaseError(error, "Failed to load dashboard."), true);
                setLoading(false);
                return () => {};
            }
        };

        const cleanupPromise = fetchData();
        return () => { cleanupPromise.then(cleanup => cleanup && cleanup()); };

    }, [user, categoryId]);

    // Separate effect for leaderboard data
    useEffect(() => {
        if (!categoryId) return;

        setLoadingLeaderboard(true);
        const fetchLeaderboard = async () => {
            try {
                // Fetch ALL results for this category
                const allResultsQuery = query(collection(db, 'results'), where("categoryId", "==", categoryId));
                const snapshot = await getDocs(allResultsQuery);
                
                if (snapshot.empty) {
                    setLeaderboard([]);
                    setLoadingLeaderboard(false);
                    return;
                }

                const allResults = snapshot.docs.map(doc => doc.data() as UserResult);

                // Group by user
                const userMap = new Map<string, { totalScore: number, count: number }>();
                allResults.forEach(r => {
                    const current = userMap.get(r.userId) || { totalScore: 0, count: 0 };
                    current.totalScore += r.percentage;
                    current.count += 1;
                    userMap.set(r.userId, current);
                });

                // Calculate averages
                let aggregated: { userId: string, averageScore: number, testsTaken: number }[] = [];
                userMap.forEach((value, key) => {
                    aggregated.push({
                        userId: key,
                        averageScore: value.totalScore / value.count,
                        testsTaken: value.count
                    });
                });

                // Sort by average score descending
                aggregated.sort((a, b) => b.averageScore - a.averageScore);

                // Take top 10 for display
                const topUsers = aggregated.slice(0, 10);

                // Fetch user names for top users
                const userPromises = topUsers.map(u => getDoc(doc(db, 'users', u.userId)));
                const userDocs = await Promise.all(userPromises);
                
                const finalLeaderboard = topUsers.map((u, index) => {
                    const userDoc = userDocs.find(d => d.id === u.userId);
                    return {
                        ...u,
                        rank: index + 1,
                        name: userDoc?.exists() ? (userDoc.data().name || 'Anonymous') : 'Anonymous'
                    };
                });

                setLeaderboard(finalLeaderboard);
            } catch (error) {
                console.error("Error fetching category leaderboard:", error);
            } finally {
                setLoadingLeaderboard(false);
            }
        };

        fetchLeaderboard();
    }, [categoryId]);

    const stats = useMemo(() => {
        if (!results.length) return null;

        const totalAttempts = results.length;
        const uniqueTestsTaken = new Set(results.map(r => r.testId)).size;
        const totalTestsAvailable = tests.length;
        const completionRate = totalTestsAvailable > 0 ? (uniqueTestsTaken / totalTestsAvailable) * 100 : 0;

        const avgScore = results.reduce((acc, r) => acc + r.percentage, 0) / totalAttempts;
        const highestScore = Math.max(...results.map(r => r.percentage));
        
        const totalCorrect = results.reduce((acc, r) => acc + r.correctCount, 0);
        const totalQuestions = results.reduce((acc, r) => acc + (r.correctCount + r.incorrectCount), 0); // Attempted questions
        const accuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

        const totalTimeSeconds = results.reduce((acc, r) => acc + (r.timeTakenSeconds || 0), 0);
        const totalTimeHours = (totalTimeSeconds / 3600).toFixed(1);

        return {
            totalAttempts,
            uniqueTestsTaken,
            totalTestsAvailable,
            completionRate,
            avgScore,
            highestScore,
            accuracy,
            totalTimeHours
        };
    }, [results, tests]);

    const progressData = useMemo(() => {
        // Show last 10 attempts trend
        return results.slice(-10).map((r, i) => ({
            name: `Attempt ${i + 1}`,
            score: r.percentage,
            date: r.submittedAt instanceof Timestamp ? r.submittedAt.toDate().toLocaleDateString() : ''
        }));
    }, [results]);

    const sectionPerformance = useMemo(() => {
        // Group by test section
        const sectionMap: Record<string, { total: number, count: number, correct: number, attempted: number }> = {};
        
        results.forEach(r => {
            // Find test to get section
            const test = tests.find(t => t.id === r.testId);
            const sectionName = test?.section || 'General';
            
            if (!sectionMap[sectionName]) {
                sectionMap[sectionName] = { total: 0, count: 0, correct: 0, attempted: 0 };
            }
            
            sectionMap[sectionName].total += r.percentage;
            sectionMap[sectionName].count += 1;
            sectionMap[sectionName].correct += r.correctCount;
            sectionMap[sectionName].attempted += (r.correctCount + r.incorrectCount);
        });

        return Object.keys(sectionMap).map(key => {
            const data = sectionMap[key];
            return {
                section: key,
                avgScore: Math.round(data.total / data.count),
                accuracy: data.attempted > 0 ? Math.round((data.correct / data.attempted) * 100) : 0
            };
        });

    }, [results, tests]);

    // Comparison Data
    const topperVsYouData = useMemo(() => {
        if (!stats || leaderboard.length === 0) return null;
        
        const topper = leaderboard[0];
        const yourAvg = stats.avgScore;
        
        return [
            { name: 'You', score: yourAvg, fill: '#4F46E5' },
            { name: 'Topper', score: topper.averageScore, fill: '#F59E0B' }
        ];
    }, [stats, leaderboard]);

    if (loading) return <SkeletonProfile />;

    if (!category) return <div className="p-8 text-center">Category not found.</div>;

    const catStyle = getCategoryStyle(category.name);

    const TabButton: React.FC<{ id: TabType, label: string, icon: React.ElementType }> = ({ id, label, icon: Icon }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 sm:py-3 text-sm font-bold transition-all duration-300 rounded-full whitespace-nowrap ${
                activeTab === id 
                ? `bg-indigo-600 text-white shadow-lg scale-105` 
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
        >
            <Icon size={18} />
            {label}
        </button>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm transition-all duration-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between py-4 gap-4">
                        <div className="flex items-center gap-4 w-full lg:w-auto">
                            <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors flex-shrink-0">
                                <ArrowLeft size={22} />
                            </button>
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 ${catStyle.bg} ${catStyle.text}`}>
                                    <DynamicIcon name={category.icon || category.name} className="w-6 h-6 sm:w-7 sm:h-7" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-gray-100 leading-tight truncate">{category.name}</h1>
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate">Dashboard</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto items-center">
                             {/* Tabs */}
                            <div className="flex p-1 bg-gray-100 dark:bg-gray-700/50 rounded-full overflow-x-auto max-w-full pretty-scrollbar w-full sm:w-auto">
                                <TabButton id="performance" label="Performance" icon={LayoutDashboard} />
                                <TabButton id="leaderboard" label="Leaderboard" icon={Trophy} />
                                <TabButton id="comparison" label="Comparison" icon={Users} />
                            </div>
                        </div>
                        
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
                
                {!stats || results.length === 0 ? (
                     <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 animate-fade-in">
                        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${catStyle.bg} ${catStyle.text}`}>
                            <BarChart2 size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">No Data Yet</h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto px-4">
                            You haven't taken any tests in the <strong>{category.name}</strong> category yet. Start a test to see your analytics here!
                        </p>
                        <button onClick={onBack} className="mt-6 px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                            Browse Tests
                        </button>
                    </div>
                ) : (
                    <>
                        {/* TAB 1: PERFORMANCE */}
                        {activeTab === 'performance' && (
                            <div className="space-y-8 animate-fade-in">
                                {/* KPI Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <StatCard 
                                        icon={CheckCircle} 
                                        label="Tests Completed" 
                                        value={`${stats.uniqueTestsTaken}/${stats.totalTestsAvailable}`} 
                                        subValue={`${stats.completionRate.toFixed(0)}% Complete`}
                                        color="text-blue-600" 
                                        bg="bg-blue-50 dark:bg-blue-900/20" 
                                    />
                                    <StatCard 
                                        icon={Target} 
                                        label="Average Score" 
                                        value={`${stats.avgScore.toFixed(1)}%`} 
                                        subValue={`Best: ${stats.highestScore.toFixed(1)}%`}
                                        color="text-indigo-600" 
                                        bg="bg-indigo-50 dark:bg-indigo-900/20" 
                                    />
                                    <StatCard 
                                        icon={Award} 
                                        label="Accuracy" 
                                        value={`${stats.accuracy.toFixed(1)}%`} 
                                        subValue="Overall"
                                        color="text-emerald-600" 
                                        bg="bg-emerald-50 dark:bg-emerald-900/20" 
                                    />
                                    <StatCard 
                                        icon={Clock} 
                                        label="Time Spent" 
                                        value={`${stats.totalTimeHours} hrs`} 
                                        subValue={`${stats.totalAttempts} Total Attempts`}
                                        color="text-amber-600" 
                                        bg="bg-amber-50 dark:bg-amber-900/20" 
                                    />
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    {/* Performance Chart */}
                                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
                                            <TrendingUp size={20} className="text-indigo-500"/> Performance Trend
                                        </h3>
                                        <div className="h-64 sm:h-72 w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={progressData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                                    <XAxis dataKey="name" tick={{fontSize: 12}} stroke="#9ca3af" hide />
                                                    <YAxis domain={[0, 100]} tick={{fontSize: 12}} stroke="#9ca3af" />
                                                    <Tooltip 
                                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                                    />
                                                    <Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* Section Breakdown */}
                                    <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
                                            <PieChart size={20} className="text-purple-500"/> Section Analysis
                                        </h3>
                                        {sectionPerformance.length > 0 ? (
                                            <div className="h-64 sm:h-72 w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={sectionPerformance}>
                                                        <PolarGrid />
                                                        <PolarAngleAxis dataKey="section" tick={{ fontSize: 11, fill: '#6B7280' }} />
                                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                                                        <Radar name="Accuracy" dataKey="accuracy" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                                                        <Radar name="Avg Score" dataKey="avgScore" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                                                        <Legend />
                                                        <Tooltip />
                                                    </RadarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        ) : (
                                            <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
                                                Not enough section data available.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Recent Activity List */}
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                    <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                                        <Calendar size={20} className="text-blue-500"/> Recent Activity in {category.name}
                                    </h3>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                            <thead>
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test Name</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                {results.slice(-5).reverse().map(r => (
                                                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 min-w-[150px]">{r.testTitle}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                            {r.submittedAt instanceof Timestamp ? r.submittedAt.toDate().toLocaleDateString() : 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm font-bold text-indigo-600 dark:text-indigo-400">{r.percentage.toFixed(2)}%</td>
                                                        <td className="px-4 py-3 text-sm">
                                                            <span className={`px-2 py-1 text-xs rounded-full ${r.percentage >= 50 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                                {r.percentage >= 50 ? 'Passed' : 'Needs Imp.'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: LEADERBOARD */}
                        {activeTab === 'leaderboard' && (
                            <div className="animate-fade-in">
                                <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 max-w-3xl mx-auto">
                                    <div className="text-center mb-8">
                                        <Trophy size={48} className="text-amber-500 mx-auto mb-2" />
                                        <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Leaderboard</h3>
                                        <p className="text-gray-500 dark:text-gray-400">Top 10 Performers in {category.name}</p>
                                    </div>
                                    
                                    {loadingLeaderboard ? (
                                        <div className="space-y-4 animate-pulse">
                                            {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-xl"></div>)}
                                        </div>
                                    ) : leaderboard.length > 0 ? (
                                        <div className="space-y-3">
                                            {leaderboard.map((entry) => {
                                                const isCurrentUser = entry.userId === user?.uid;
                                                return (
                                                    <div key={entry.userId} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${isCurrentUser ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-900/30 dark:border-indigo-700 shadow-md transform scale-[1.02]' : 'bg-white border-gray-100 dark:bg-gray-700/30 dark:border-gray-700 hover:shadow-sm'}`}>
                                                        <div className={`flex-shrink-0 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full font-extrabold text-lg ${entry.rank === 1 ? 'bg-yellow-100 text-yellow-700 ring-4 ring-yellow-50' : entry.rank === 2 ? 'bg-gray-200 text-gray-700 ring-4 ring-gray-100' : entry.rank === 3 ? 'bg-orange-100 text-orange-700 ring-4 ring-orange-50' : 'bg-transparent text-gray-400'}`}>
                                                            {entry.rank}
                                                        </div>
                                                        
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-base sm:text-lg font-bold truncate ${isCurrentUser ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-800 dark:text-gray-200'}`}>
                                                                {isCurrentUser ? 'You' : entry.name}
                                                            </p>
                                                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{entry.testsTaken} tests completed</p>
                                                        </div>
                                                        
                                                        <div className="text-right flex-shrink-0">
                                                            <p className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-gray-100">{entry.averageScore.toFixed(1)}%</p>
                                                            <p className="text-xs text-gray-500 uppercase font-semibold">Avg Score</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-center text-gray-500 py-8">No leaderboard data available yet.</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB 3: COMPARISON */}
                        {activeTab === 'comparison' && topperVsYouData && (
                            <div className="animate-fade-in">
                                <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 max-w-4xl mx-auto">
                                     <h3 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-3 text-center justify-center flex-wrap">
                                        <Users size={28} className="text-indigo-500"/> Comparison: You vs Top Performer
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                        <div className="h-64 sm:h-80 w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={topperVsYouData}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <XAxis dataKey="name" tick={{fontSize: 14, fontWeight: 'bold'}} stroke="#9ca3af"/>
                                                    <YAxis domain={[0, 100]} hide/>
                                                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                                                    <Bar dataKey="score" radius={[8, 8, 0, 0]} barSize={60}>
                                                        {topperVsYouData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                        
                                        <div className="space-y-6">
                                            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl border border-indigo-100 dark:border-indigo-800">
                                                <p className="text-sm text-indigo-600 dark:text-indigo-300 font-bold uppercase mb-1">Your Average</p>
                                                <p className="text-3xl sm:text-4xl font-extrabold text-indigo-700 dark:text-indigo-200">{stats.avgScore.toFixed(1)}%</p>
                                            </div>
                                            <div className="p-4 bg-amber-50 dark:bg-amber-900/30 rounded-xl border border-amber-100 dark:border-amber-800">
                                                <p className="text-sm text-amber-600 dark:text-amber-300 font-bold uppercase mb-1">Topper Average</p>
                                                <p className="text-3xl sm:text-4xl font-extrabold text-amber-700 dark:text-amber-200">{topperVsYouData[1].score.toFixed(1)}%</p>
                                            </div>
                                            
                                            <div className="text-sm text-gray-600 dark:text-gray-300 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                                                {stats.avgScore < topperVsYouData[1].score ? (
                                                    <p>You are <strong>{(topperVsYouData[1].score - stats.avgScore).toFixed(1)}%</strong> behind the top performer. Keep practicing to close the gap!</p>
                                                ) : (
                                                    <p>Fantastic! You are performing at the top level for this category.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

const StatCard: React.FC<{ icon: React.ElementType; label: string; value: string | number; subValue?: string; color: string; bg: string }> = ({ icon: Icon, label, value, subValue, color, bg }) => (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4 hover:shadow-md transition-all">
        <div className={`p-3 rounded-lg ${bg} ${color} flex-shrink-0`}>
            <Icon size={24} />
        </div>
        <div className="min-w-0">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate">{label}</p>
            <p className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-gray-100 truncate">{value}</p>
            {subValue && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{subValue}</p>}
        </div>
    </div>
);

export default CategoryDashboard;