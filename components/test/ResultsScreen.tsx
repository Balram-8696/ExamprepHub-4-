
import React, { useState, useEffect, useContext, useRef } from 'react';
import { UserResult, Test } from '../../types';
import { collection, query, where, onSnapshot, Timestamp, getDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { AuthContext } from '../../AuthContext';
import { showMessage, formatTime } from '../../utils/helpers';
import { CheckCircle, Trophy, Target, HelpCircle, Smile, Frown, SkipForward, Percent, ArrowRight, ArrowLeft, TrendingUp, Users, Clock, ChevronDown, BarChartHorizontal, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, Tooltip } from 'recharts';

const CountUp: React.FC<{ end: number; decimals?: number; duration?: number, prefix?: string, suffix?: string }> = ({ end, decimals = 0, duration = 1, prefix = '', suffix = '' }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime: number | null = null;
        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const percentage = Math.min(progress / (duration * 1000), 1);
            
            // Ease out function
            const easedPercentage = 1 - Math.pow(1 - percentage, 3);

            setCount(easedPercentage * end);

            if (percentage < 1) {
                requestAnimationFrame(animate);
            } else {
                setCount(end); // Ensure it ends on the exact value
            }
        };
        const frameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameId);
    }, [end, duration]);
    
    return <>{prefix}{count.toFixed(decimals)}{suffix}</>;
};

interface ResultsScreenProps {
    result: UserResult;
    test: Test;
    onViewSolutions: (result: UserResult, filter?: 'correct' | 'incorrect' | 'unattempted') => void;
    onBackToTests: () => void;
    language: 'english' | 'hindi';
    setLanguage: (lang: 'english' | 'hindi') => void;
}

const ResultsScreen: React.FC<ResultsScreenProps> = ({ result, test, onViewSolutions, onBackToTests, language, setLanguage }) => {
    const { user } = useContext(AuthContext);
    const [lastAttempts, setLastAttempts] = useState<UserResult[]>([]);
    const [loadingAttempts, setLoadingAttempts] = useState(true);
    const [comparisonData, setComparisonData] = useState<{ rank: number; participants: number; averageScore: number; topperScore: number; } | null>(null);
    const [leaderboard, setLeaderboard] = useState<{ rank: number; name: string; score: number; isCurrentUser: boolean }[] | null>(null);
    const [userRank, setUserRank] = useState<number | null>(null);
    const [loadingComparison, setLoadingComparison] = useState(true);
    const [isMounted, setIsMounted] = useState(false);

    const [currentResult, setCurrentResult] = useState<UserResult>(result);
    const [isAttemptsDropdownOpen, setIsAttemptsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

     useEffect(() => {
        const timer = setTimeout(() => setIsMounted(true), 100); 
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsAttemptsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!user || !result) return;
        setLoadingAttempts(true);

        const q = query(collection(db, 'results'), where('userId', '==', user.uid), where('testId', '==', result.testId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const attemptsData = snapshot.docs.map(doc => ({...doc.data(), id: doc.id} as UserResult));
            attemptsData.sort((a, b) => (b.submittedAt as Timestamp).toMillis() - (a.submittedAt as Timestamp).toMillis());
            setLastAttempts(attemptsData.slice(0, 5));
            setLoadingAttempts(false);
        }, (error) => {
            console.error("Error fetching previous attempts: ", error);
            setLoadingAttempts(false);
        });

        return () => unsubscribe();
    }, [user, result]);
    
    useEffect(() => {
        if (!currentResult) return;
        setLoadingComparison(true);
        const q = query(collection(db, 'results'), where('testId', '==', currentResult.testId));

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            if (snapshot.empty) {
                setLoadingComparison(false);
                return;
            }

            const allResultsForTest = snapshot.docs.map(doc => doc.data() as UserResult);
            const participants = allResultsForTest.length;

            const totalPercentage = allResultsForTest.reduce((sum, r) => sum + r.percentage, 0);
            const averageScore = participants > 0 ? totalPercentage / participants : 0;
            const topperScore = participants > 0 ? Math.max(...allResultsForTest.map(r => r.percentage)) : 0;
            const scoresHigher = allResultsForTest.filter(r => r.percentage > currentResult.percentage).length;
            const rank = scoresHigher + 1;

            // --- Leaderboard Logic ---
            const userMaxScores = new Map<string, UserResult>();
            for (const res of allResultsForTest) {
                if (!userMaxScores.has(res.userId) || res.percentage > userMaxScores.get(res.userId)!.percentage) {
                    userMaxScores.set(res.userId, res);
                }
            }
            const uniqueUserIds = Array.from(userMaxScores.keys());
            const userDocs = await Promise.all(uniqueUserIds.map(uid => getDoc(doc(db, 'users', uid))));
            const userNames = new Map(userDocs.map(d => [d.id, d.data()?.name || 'Anonymous']));
            const sortedUsers = Array.from(userMaxScores.values()).sort((a, b) => b.percentage - a.percentage);

            let finalUserRank: number | null = null;
            const finalLeaderboard = sortedUsers.map((res, index) => {
                const rank = index + 1;
                if (res.userId === user?.uid) finalUserRank = rank;
                return { rank, name: userNames.get(res.userId) || 'Anonymous', score: res.percentage, isCurrentUser: res.userId === user?.uid };
            });
            
            setLeaderboard(finalLeaderboard);
            setUserRank(finalUserRank);
            setComparisonData({ rank, participants, averageScore, topperScore });
            setLoadingComparison(false);
        }, (error) => {
            console.error("Error fetching comparison data: ", error);
            setLoadingComparison(false);
        });

        return () => unsubscribe();
    }, [currentResult, user]);

    const unattemptedCount = test.questionCount - (currentResult.correctCount + currentResult.incorrectCount);
    const attemptedCount = currentResult.correctCount + currentResult.incorrectCount;
    const accuracy = attemptedCount > 0 ? (currentResult.correctCount / attemptedCount) * 100 : 0;
    
    const analysisItems = [
        { icon: HelpCircle, label: "Total Questions", value: test.questionCount, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/40', filterKey: 'all' as const },
        { icon: Smile, label: "Correct", value: currentResult.correctCount, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/40', filterKey: 'correct' as const },
        { icon: Frown, label: "Incorrect", value: currentResult.incorrectCount, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/40', filterKey: 'incorrect' as const },
        { icon: SkipForward, label: "Unattempted", value: unattemptedCount, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-700/40', filterKey: 'unattempted' as const },
    ];

    const formatDate = (timestamp: Timestamp | Date) => {
        if (!timestamp) return 'N/A';
        const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
        return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const handleSelectAttempt = (attempt: UserResult) => {
        setCurrentResult(attempt);
        setIsAttemptsDropdownOpen(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-6 lg:p-8 animate-fade-in">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6 flex justify-between items-center">
                    <button onClick={onBackToTests} className="flex items-center justify-center gap-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all shadow-sm">
                        <ArrowLeft size={18} /> Go Back
                    </button>
                    {!loadingAttempts && lastAttempts.length > 1 && (
                         <div className="relative" ref={dropdownRef}>
                            <button onClick={() => setIsAttemptsDropdownOpen(!isAttemptsDropdownOpen)} className="flex items-center gap-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all shadow-sm">
                                <Clock size={18} /><span>View Other Attempts</span><ChevronDown size={18} className={`transition-transform ${isAttemptsDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isAttemptsDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700 animate-scale-in">
                                    {lastAttempts.map((attempt, index) => (
                                        <button key={attempt.id} onClick={() => handleSelectAttempt(attempt)} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${attempt.id === currentResult.id ? 'bg-indigo-50 dark:bg-indigo-900/50' : ''}`}>
                                            <div className="font-semibold text-gray-800 dark:text-gray-200">Attempt #{lastAttempts.length - index} {index === 0 ? "(Latest)" : ''}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{formatDate(attempt.submittedAt)}</div>
                                            <div className="text-xs">Score: <span className="font-bold">{attempt.percentage.toFixed(2)}%</span></div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="text-center mb-8">
                    <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-800 dark:text-gray-100">Test Completed!</h1>
                    <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 mt-2">Here's your detailed performance analysis.</p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
                     {/* Score Card */}
                    <div className="relative flex flex-col items-center p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Target size={60} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="p-2 sm:p-3 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mb-3">
                            <Target size={24} />
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Score</p>
                        <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 my-1 flex items-baseline">
                             <CountUp end={currentResult.score} decimals={2} />
                             <span className="text-sm sm:text-lg text-gray-400 dark:text-gray-500 font-medium ml-1">/ {currentResult.total}</span>
                        </div>
                        <div className="text-xs sm:text-sm font-medium px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 mt-1">
                             <CountUp end={currentResult.percentage} decimals={2} suffix="%" />
                        </div>
                    </div>

                    {/* Accuracy Card */}
                    <div className="relative flex flex-col items-center p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden group">
                         <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <CheckCircle size={60} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="p-2 sm:p-3 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 mb-3">
                            <CheckCircle size={24} />
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Accuracy</p>
                        <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 my-1">
                             <CountUp end={accuracy} decimals={2} suffix="%" />
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">{currentResult.correctCount} / {attemptedCount} Correct</p>
                    </div>

                    {/* Rank Card */}
                    <div className="relative flex flex-col items-center p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden group">
                         <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Trophy size={60} className="text-amber-500 dark:text-amber-400" />
                        </div>
                        <div className="p-2 sm:p-3 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 mb-3">
                            <Trophy size={24} />
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rank</p>
                        <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 my-1">
                             {loadingComparison ? <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div> : <CountUp end={comparisonData?.rank || 0} decimals={0} prefix="#" />}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">of {loadingComparison ? '...' : comparisonData?.participants} students</p>
                    </div>

                    {/* Time Card */}
                    <div className="relative flex flex-col items-center p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden group">
                         <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Clock size={60} className="text-blue-500 dark:text-blue-400" />
                        </div>
                        <div className="p-2 sm:p-3 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-3">
                            <Clock size={24} />
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time Taken</p>
                        <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 my-1">
                             {formatTime(currentResult.timeTakenSeconds || 0)}
                        </div>
                         <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">of {test.durationMinutes} mins</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-3"><BarChartHorizontal /> Performance Breakdown</h2>
                        <div className="space-y-3">
                            {analysisItems.map(({ icon: Icon, label, value, color, bg, filterKey }) => (
                                <button 
                                    key={label} 
                                    onClick={() => onViewSolutions(currentResult, filterKey)} 
                                    className={`w-full flex items-center justify-between p-4 ${bg} rounded-xl text-left transition-all duration-200 hover:shadow-md group border border-transparent hover:border-gray-200 dark:hover:border-gray-700`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2.5 bg-white dark:bg-gray-800 rounded-full shadow-sm`}>
                                            <Icon className={`w-5 h-5 ${color}`} />
                                        </div>
                                        <span className="text-base font-semibold text-gray-800 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                            {label}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xl font-extrabold ${color}`}>
                                            {value}
                                        </span>
                                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-transform duration-300 group-hover:translate-x-1" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-3"><Users /> Comparison with Others</h2>
                        {loadingComparison ? <div className="animate-pulse space-y-4"><div className="h-8 rounded bg-gray-200 dark:bg-gray-700"></div><div className="h-8 rounded bg-gray-200 dark:bg-gray-700"></div><div className="h-8 rounded bg-gray-200 dark:bg-gray-700"></div></div> : comparisonData && (
                            <div className="space-y-4">
                                {[
                                    { label: 'Topper Score', value: comparisonData.topperScore, color: 'bg-amber-400' },
                                    { label: 'Your Score', value: currentResult.percentage, color: 'bg-indigo-500' },
                                    { label: 'Average Score', value: comparisonData.averageScore, color: 'bg-gray-400' },
                                ].map(item => (
                                    <div key={item.label}>
                                        <div className="flex justify-between text-sm font-semibold mb-1 text-gray-700 dark:text-gray-200">
                                            <span>{item.label}</span>
                                            <span>{item.value.toFixed(2)}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                            <div 
                                                className={`${item.color} h-2.5 rounded-full transition-all duration-1000 ease-out`} 
                                                style={{ width: isMounted ? `${item.value}%` : '0%' }}>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                     <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-3"><Trophy /> Top Performers</h2>
                        {loadingComparison ? <div className="animate-pulse space-y-2">{[...Array(5)].map((_,i)=><div key={i} className="h-10 rounded bg-gray-200 dark:bg-gray-700"></div>)}</div> : leaderboard && (
                            <div className="space-y-3">
                                {leaderboard.slice(0, 5).map(player => (
                                    <div key={player.rank} className={`flex items-center gap-4 p-3 rounded-lg ${player.isCurrentUser ? 'bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                                        <span className={`font-bold text-lg w-8 text-center ${player.rank <= 3 ? 'text-amber-500' : 'text-gray-500 dark:text-gray-400'}`}>#{player.rank}</span>
                                        <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-300">{player.name.charAt(0)}</div>
                                        <span className="font-semibold text-gray-800 dark:text-gray-100 flex-1 truncate">{player.name}</span>
                                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{player.score.toFixed(2)}%</span>
                                    </div>
                                ))}
                                {userRank && userRank > 5 && (
                                    <>
                                        <div className="text-center text-gray-400 dark:text-gray-500">...</div>
                                        <div className="flex items-center gap-4 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800">
                                            <span className="font-bold text-lg w-8 text-center text-gray-500 dark:text-gray-400">#{userRank}</span>
                                            <span className="font-semibold text-gray-800 dark:text-gray-100 flex-1 truncate">{user?.displayName || 'You'}</span>
                                            <span className="font-bold text-indigo-600 dark:text-indigo-400">{currentResult.percentage.toFixed(2)}%</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    {!loadingAttempts && lastAttempts.length > 1 && (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-3"><TrendingUp /> Your Recent Attempts</h2>
                            <div className="w-full h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={[...lastAttempts].reverse().map((att, i) => ({ name: `Attempt ${i+1}`, Score: att.percentage }))} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-600" />
                                        <XAxis dataKey="name" />
                                        <YAxis unit="%" domain={[0, 100]} />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="Score" stroke="#4f46e5" strokeWidth={2} activeDot={{ r: 8 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-center">
                    <button onClick={() => onViewSolutions(currentResult)} className="w-full sm:max-w-xs flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 transition-all shadow-md">
                        Review All Solutions <ArrowRight size={18} />
                    </button>
                </div>
             </div>
        </div>
    );
};

export default ResultsScreen;
