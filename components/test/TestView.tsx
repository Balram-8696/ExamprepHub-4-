import React, { useState, useEffect, useCallback, useContext } from 'react';
import { Test, UserResult, UserAnswer, TestStateLocal } from '../../types';
import TestScreen from './TestScreen';
import ResultsScreen from './ResultsScreen';
import SolutionScreen from './SolutionScreen';
import { AuthContext } from '../../AuthContext';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { showMessage } from '../../utils/helpers';
import { Loader2, XCircle } from 'lucide-react';

interface TestViewProps {
    test: Test;
    action: 'start' | 'resume' | 'result';
    resultData?: UserResult;
    onExitTestView: () => void;
    language: 'english' | 'hindi';
}

const TestView: React.FC<TestViewProps> = ({ test, action, resultData, onExitTestView, language: initialLanguage }) => {
    const { user } = useContext(AuthContext);
    const [currentScreen, setCurrentScreen] = useState<'loading' | 'test' | 'results' | 'solution'>('loading');
    
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [finalResult, setFinalResult] = useState<UserResult | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [language, setLanguage] = useState(initialLanguage);
    const [solutionFilter, setSolutionFilter] = useState<'all' | 'correct' | 'incorrect' | 'unattempted'>('all');

    const clearTestStateLocal = useCallback(() => {
        if (!user) return;
        localStorage.removeItem(`inProgressTest_${user.uid}`);
    }, [user]);

    const saveTestStateLocal = useCallback(() => {
        if (!user || currentScreen !== 'test') return;
        const state: TestStateLocal = {
            testId: test.id,
            currentQuestionIndex,
            userAnswers,
            timeRemaining,
            language,
        };
        localStorage.setItem(`inProgressTest_${user.uid}`, JSON.stringify(state));
    }, [user, test.id, currentQuestionIndex, userAnswers, timeRemaining, language, currentScreen]);

    useEffect(() => {
        const interval = setInterval(() => {
            saveTestStateLocal();
        }, 10000); // Save every 10 seconds
        return () => clearInterval(interval);
    }, [saveTestStateLocal]);

    const calculateAndSubmitResults = useCallback(async () => {
        if (!user) {
            showMessage("You must be logged in to submit your test. Please log in and try again.", true);
            return;
        }

        setIsSubmitting(true);

        // Simulate a delay for a better user experience
        await new Promise(resolve => setTimeout(resolve, 2500));

        let correctCount = 0, incorrectCount = 0;
        test.questions.forEach((q, index) => {
            const userAnswer = userAnswers[index].answer;
            if (userAnswer !== null) {
                if (userAnswer === q.correctAnswer) correctCount++;
                else incorrectCount++;
            }
        });

        const marksPerQ = test.marksPerQuestion || 1;
        const negMarks = test.negativeMarking || 0;
        const totalMarks = test.questionCount * marksPerQ;
        const achievedMarks = (correctCount * marksPerQ) - (incorrectCount * negMarks);
        const timeTakenSeconds = (test.durationMinutes || 60) * 60 - timeRemaining;

        const result: Omit<UserResult, 'id'> = {
            score: achievedMarks,
            total: totalMarks,
            correctCount,
            incorrectCount,
            userId: user.uid,
            userEmail: user.email!,
            testId: test.id,
            testTitle: test.title,
            categoryId: test.categoryId,
            categoryName: test.category,
            percentage: totalMarks > 0 ? (achievedMarks / totalMarks) * 100 : 0,
            submittedAt: serverTimestamp() as any,
            userAnswers: userAnswers,
            timeTakenSeconds: timeTakenSeconds,
        };

        try {
            const docRef = await addDoc(collection(db, 'results'), result);
            setFinalResult({ ...result, id: docRef.id, submittedAt: new Date() as any });
            clearTestStateLocal();
            setCurrentScreen('results');
        } catch (error) {
            console.error("Error submitting results:", error);
            showMessage("Failed to submit results. Please check your connection.", true);
        } finally {
            setIsSubmitting(false);
        }
    }, [userAnswers, test, user, clearTestStateLocal, timeRemaining]);

    const handleTimeUp = useCallback(() => {
        showMessage("Time's up! Submitting your test.", true);
        calculateAndSubmitResults();
    }, [calculateAndSubmitResults]);
    
    const handleViewSolutions = (resultForSolution: UserResult, filter?: 'correct' | 'incorrect' | 'unattempted') => {
        if (resultForSolution.userAnswers && resultForSolution.userAnswers.length === test.questions.length) {
            setUserAnswers(resultForSolution.userAnswers);
        } else {
            // Fallback for older results that didn't save answers
            setUserAnswers(new Array(test.questions.length).fill(null).map(() => ({ answer: null, status: 'unattempted' })));
            showMessage("Detailed answer data is not available for this older attempt.", true);
        }
        setFinalResult(resultForSolution);
        setSolutionFilter(filter || 'all');
        setCurrentScreen('solution');
    };

    const initializeTest = useCallback(() => {
        if (action === 'start') {
            setCurrentQuestionIndex(0);
            setUserAnswers(new Array(test.questions.length).fill(null).map(() => ({ answer: null, status: 'unattempted' })));
            setTimeRemaining((test.durationMinutes || 60) * 60);
            setCurrentScreen('test');
        } else if (action === 'resume' && user) {
            const stateJSON = localStorage.getItem(`inProgressTest_${user.uid}`);
            const state: TestStateLocal | null = stateJSON ? JSON.parse(stateJSON) : null;
            if (state && state.testId === test.id) {
                setCurrentQuestionIndex(state.currentQuestionIndex);
                setUserAnswers(state.userAnswers);
                setTimeRemaining(state.timeRemaining);
                setLanguage(state.language);
                setCurrentScreen('test');
            } else {
                // Fallback to starting a new test if resume data is invalid
                setCurrentQuestionIndex(0);
                setUserAnswers(new Array(test.questions.length).fill(null).map(() => ({ answer: null, status: 'unattempted' })));
                setTimeRemaining((test.durationMinutes || 60) * 60);
                setCurrentScreen('test');
            }
        } else if (action === 'result' && resultData) {
            setFinalResult(resultData);
            if (resultData.userAnswers) {
                setUserAnswers(resultData.userAnswers);
            } else {
                 // Provide dummy answers for solution view if needed for older attempts
                setUserAnswers(new Array(test.questions.length).fill(null).map(() => ({ answer: null, status: 'unattempted' })));
            }
            setCurrentScreen('results');
        }
    }, [action, test, user, resultData]);
    
    useEffect(() => {
        if (currentScreen !== 'loading') return;

        const timer = setTimeout(() => {
            if (test && test.questions && test.questions.length > 0) {
                initializeTest();
            }
        }, 50);
        return () => clearTimeout(timer);
    }, [currentScreen, initializeTest, test]);

    const handleExit = () => {
        if (currentScreen === 'test') {
            saveTestStateLocal();
        }
        onExitTestView();
    };

    if (!test || !test.questions || test.questions.length === 0) {
        return (
            <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-xl max-w-lg mx-auto my-10 animate-fade-in">
                <XCircle className="w-16 h-16 text-red-500 mx-auto" />
                <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">Test Data Error</h2>
                <p className="mt-2 text-gray-600 dark:text-gray-300">This test is currently unavailable because it has no questions. Please contact an administrator.</p>
                <div className="mt-6">
                    <button onClick={onExitTestView} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700">
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    if (currentScreen === 'loading') {
        return <div className="flex items-center justify-center h-full"><Loader2 className="w-12 h-12 animate-spin text-indigo-600" /></div>;
    }

    return (
        <div className="w-full h-full relative">
             {isSubmitting && (
                <div className="absolute inset-0 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-xl animate-fade-in">
                    <svg className="w-24 h-24 text-indigo-500" viewBox="0 0 100 100" fill="currentColor">
                        <rect className="bar1" x="10" y="90" width="20" height="10" rx="4" />
                        <rect className="bar2" x="40" y="90" width="20" height="10" rx="4" />
                        <rect className="bar3" x="70" y="90" width="20" height="10" rx="4" />
                    </svg>
                    <p className="mt-6 text-2xl font-bold text-gray-700 dark:text-gray-200">Analyzing your performance...</p>
                    <p className="text-md text-gray-500 dark:text-gray-400 mt-2">Just a moment while we calculate your score.</p>
                </div>
            )}
            {currentScreen === 'test' && (
                <TestScreen
                    test={test}
                    userAnswers={userAnswers}
                    setUserAnswers={setUserAnswers}
                    currentQuestionIndex={currentQuestionIndex}
                    setCurrentQuestionIndex={setCurrentQuestionIndex}
                    timeRemaining={timeRemaining}
                    setTimeRemaining={setTimeRemaining}
                    onTimeUp={handleTimeUp}
                    onSubmitTest={calculateAndSubmitResults}
                    language={language}
                    setLanguage={setLanguage}
                    onExitTest={handleExit}
                />
            )}
            {currentScreen === 'results' && finalResult && (
                <ResultsScreen
                    result={finalResult}
                    test={test}
                    onViewSolutions={handleViewSolutions}
                    onBackToTests={onExitTestView}
                    language={language}
                    setLanguage={setLanguage}
                />
            )}
            {currentScreen === 'solution' && (
                <SolutionScreen
                    test={test}
                    userAnswers={userAnswers}
                    onBackToResults={() => {
                        setSolutionFilter('all');
                        setCurrentScreen('results');
                    }}
                    onBackToHome={onExitTestView}
                    language={language}
                    setLanguage={setLanguage}
                    filter={solutionFilter}
                    setFilter={setSolutionFilter}
                />
            )}
        </div>
    );
};

export default TestView;