import React, { useState, useEffect, useContext } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { AuthContext } from '../../AuthContext';
import { Test, UserResult } from '../../types';
import { showMessage, formatFirebaseError } from '../../utils/helpers';
import { Inbox, BarChart3, ChevronRight, ChevronDown } from 'lucide-react';

const getTimeValue = (ts: Timestamp | Date): number => {
    if (ts instanceof Timestamp) {
        return ts.toDate().getTime();
    }
    return ts.getTime();
};

// New Component for displaying history for a single test
const AttemptHistoryItem: React.FC<{
    testTitle: string;
    attempts: UserResult[];
    onViewSolutions: (result: UserResult) => void;
}> = ({ testTitle, attempts, onViewSolutions }) => {
    const [isOpen, setIsOpen] = useState(false);

    if (attempts.length === 0) return null;

    const bestAttempt = attempts.reduce((best, current) => (current.percentage > best.percentage ? current : best), attempts[0]);

    const formatDate = (timestamp: Timestamp | Date) => {
        if (!timestamp) return 'N/A';
        const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
        if (isNaN(date.getTime())) {
           return 'Invalid Date';
       }
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-lg">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <div className="flex justify-between items-center">
                    <div className="flex-1 mr-4">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 truncate">{testTitle}</h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400 mt-1">
                            <span>Attempts: <span className="font-semibold text-gray-700 dark:text-gray-300">{attempts.length}</span></span>
                            <span>Best Score: <span className="font-semibold text-green-600 dark:text-green-500">{bestAttempt.percentage.toFixed(2)}%</span></span>
                        </div>
                    </div>
                    <ChevronDown className={`w-6 h-6 text-gray-500 dark:text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>
            {isOpen && (
                <div className="border-t border-gray-200 dark:border-gray-700 animate-fade-in">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Attempt</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Score</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Percentage</th>
                                    <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {attempts.map((attempt, index) => (
                                    <tr key={attempt.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">#{attempts.length - index}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(attempt.submittedAt)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 font-semibold">{`${attempt.score.toFixed(2)} / ${attempt.total}`}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${attempt.percentage >= 70 ? 'bg-green-100 text-green-800' : attempt.percentage >= 40 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                                {attempt.percentage.toFixed(2)}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => onViewSolutions(attempt)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 font-semibold flex items-center gap-1">
                                                View Solutions <ChevronRight size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};


interface HistoryPageProps {
    onInitiateTestView: (details: { test: Test; action: 'result'; resultData?: UserResult }) => void;
}

interface GroupedResults {
    [testId: string]: {
        testTitle: string;
        attempts: UserResult[];
    };
}

const HistoryPage: React.FC<HistoryPageProps> = ({ onInitiateTestView }) => {
    const { user } = useContext(AuthContext);
    const [groupedResults, setGroupedResults] = useState<GroupedResults>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            setLoading(true);
            const q = query(
                collection(db, 'results'),
                where("userId", "==", user.uid)
            );
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const resultsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserResult));
                
                const grouped = resultsData.reduce((acc, result) => {
                    const { testId, testTitle } = result;
                    if (!acc[testId]) {
                        acc[testId] = { testTitle: testTitle || 'Untitled Test', attempts: [] };
                    }
                    acc[testId].attempts.push(result);
                    return acc;
                }, {} as GroupedResults);
        
                // Sort attempts within each group by date
                Object.keys(grouped).forEach(testId => {
                    const group = grouped[testId];
                    group.attempts.sort((a, b) => {
                        const timeA = a.submittedAt ? getTimeValue(a.submittedAt) : 0;
                        const timeB = b.submittedAt ? getTimeValue(b.submittedAt) : 0;
                        return timeB - timeA;
                    });
                });

                setGroupedResults(grouped);
                setLoading(false);
            }, (error) => {
                console.error("Error fetching results:", error);
                showMessage(formatFirebaseError(error, "Failed to load your test history."), true);
                setLoading(false);
            });
            return () => unsubscribe();
        } else {
            setGroupedResults({});
            setLoading(false);
        }
    }, [user]);

    const handleViewSolutions = async (result: UserResult) => {
        try {
            const testDocRef = doc(db, 'tests', result.testId);
            const testDoc = await getDoc(testDocRef);
            if (testDoc.exists()) {
                const fullTest = { id: testDoc.id, ...testDoc.data()} as Test;
                onInitiateTestView({ test: fullTest, action: 'result', resultData: result });
            } else {
                showMessage('The original test could not be found.', true);
            }
        } catch (error) {
            showMessage(formatFirebaseError(error, 'Error loading test details.'), true);
            console.error(error);
        }
    };
    
    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-lg mb-8 border-t-4 border-indigo-500 animate-pulse">
                    <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded mt-3"></div>
                </div>
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md h-24 p-4 animate-pulse"></div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md h-24 p-4 animate-pulse"></div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md h-24 p-4 animate-pulse"></div>
                </div>
            </div>
        );
    }
    
    if (!user) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center">
                 <div className="bg-white dark:bg-gray-800 p-10 rounded-xl shadow-md">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Please Log In</h2>
                    <p className="text-gray-600 dark:text-gray-300 mt-2">Log in to see your test history.</p>
                </div>
            </div>
        );
    }

    const sortedTestIds = Object.keys(groupedResults).sort((a, b) => {
        const lastAttemptA = groupedResults[a].attempts[0]?.submittedAt;
        const lastAttemptB = groupedResults[b].attempts[0]?.submittedAt;
        const timeA = lastAttemptA ? getTimeValue(lastAttemptA) : 0;
        const timeB = lastAttemptB ? getTimeValue(lastAttemptB) : 0;
        return timeB - timeA;
    });

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-lg mb-8 border-t-4 border-indigo-500">
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                    <BarChart3 size={32} /> My Test History
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-2">Review your past performance and analyze your solutions for each test.</p>
            </div>
            
            {sortedTestIds.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl shadow-md">
                    <Inbox className="w-16 h-16 text-gray-400 mx-auto" />
                    <h3 className="text-xl font-semibold mt-4 text-gray-800 dark:text-gray-100">No History Found</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">You haven't completed any tests yet. Go ahead and take one!</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {sortedTestIds.map(testId => (
                        <AttemptHistoryItem
                            key={testId}
                            testTitle={groupedResults[testId].testTitle}
                            attempts={groupedResults[testId].attempts}
                            onViewSolutions={handleViewSolutions}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default HistoryPage;