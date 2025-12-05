
import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { Test, UserAnswer, AnswerStatus, BilingualText } from '../../types';
import { Clock, LayoutGrid, BookmarkPlus, BookmarkMinus, ArrowLeft, ArrowRight, CheckCircle, Flag, Languages } from 'lucide-react';
import QuestionPalette from './QuestionPalette';
import ConfirmModal from '../modals/ConfirmModal';
import ReportQuestionModal from '../modals/ReportQuestionModal';
import { formatTime } from '../../utils/helpers';
import { AuthContext } from '../../AuthContext';

interface TestScreenProps {
    test: Test;
    userAnswers: UserAnswer[];
    setUserAnswers: React.Dispatch<React.SetStateAction<UserAnswer[]>>;
    currentQuestionIndex: number;
    setCurrentQuestionIndex: React.Dispatch<React.SetStateAction<number>>;
    timeRemaining: number;
    setTimeRemaining: React.Dispatch<React.SetStateAction<number>>;
    onTimeUp: () => void;
    onSubmitTest: () => void;
    language: 'english' | 'hindi';
    setLanguage: (lang: 'english' | 'hindi') => void;
    onExitTest: () => void;
}

const TestScreen: React.FC<TestScreenProps> = ({
    test,
    userAnswers,
    setUserAnswers,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    timeRemaining,
    setTimeRemaining,
    onTimeUp,
    onSubmitTest,
    language,
    setLanguage,
    onExitTest,
}) => {
    const { user } = useContext(AuthContext);
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [submitModalOpen, setSubmitModalOpen] = useState(false);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [exitModalOpen, setExitModalOpen] = useState(false);

    useEffect(() => {
        if (timeRemaining <= 0) {
            onTimeUp();
            return;
        }
        const timer = setInterval(() => {
            setTimeRemaining(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [timeRemaining, onTimeUp, setTimeRemaining]);

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (event.target !== document.body) {
            return;
        }

        if (event.key === 'ArrowRight') {
            if (currentQuestionIndex < test.questions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
            }
        } else if (event.key === 'ArrowLeft') {
            if (currentQuestionIndex > 0) {
                setCurrentQuestionIndex(prev => prev - 1);
            }
        }
    }, [currentQuestionIndex, test.questions.length, setCurrentQuestionIndex]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);
    
    const currentQuestion = test.questions[currentQuestionIndex];
    const currentAnswerState = userAnswers[currentQuestionIndex];

    const isBilingual = typeof currentQuestion.question === 'object' && 'english' in currentQuestion.question;
    const questionText = isBilingual ? (currentQuestion.question as BilingualText)[language] : currentQuestion.question as unknown as string;
    const questionOptions = isBilingual ? currentQuestion.options[language] : currentQuestion.options as unknown as string[];

    const handleOptionSelect = (optionKey: string) => {
        const newAnswers = [...userAnswers];
        const currentAnswerState = newAnswers[currentQuestionIndex];

        // If clicking the same answer again, clear it.
        if (currentAnswerState.answer === optionKey) {
            currentAnswerState.answer = null;
            if (currentAnswerState.status === 'answered_marked') {
                currentAnswerState.status = 'marked';
            } else {
                currentAnswerState.status = 'unattempted';
            }
        } else { // If selecting a new answer
            currentAnswerState.answer = optionKey;
            if (currentAnswerState.status === 'marked' || currentAnswerState.status === 'answered_marked') {
                currentAnswerState.status = 'answered_marked';
            } else {
                currentAnswerState.status = 'answered';
            }
        }
        setUserAnswers(newAnswers);
    };

    const handleToggleMark = () => {
        const newAnswers = [...userAnswers];
        const currentStatus = newAnswers[currentQuestionIndex].status;
        let newStatus: AnswerStatus = 'unattempted';
        if (currentStatus === 'answered') newStatus = 'answered_marked';
        else if (currentStatus === 'unattempted') newStatus = 'marked';
        else if (currentStatus === 'answered_marked') newStatus = 'answered';
        else if (currentStatus === 'marked') newStatus = 'unattempted';
        newAnswers[currentQuestionIndex].status = newStatus;
        setUserAnswers(newAnswers);
    };

    // Memoized handlers for question palette to prevent re-renders of all buttons
    const handlePaletteQuestionSelect = useCallback((index: number) => {
        setCurrentQuestionIndex(index);
    }, [setCurrentQuestionIndex]);

    const handleMobilePaletteQuestionSelect = useCallback((index: number) => {
        setCurrentQuestionIndex(index);
        setPaletteOpen(false);
    }, [setCurrentQuestionIndex, setPaletteOpen]);

    const isMarked = currentAnswerState?.status === 'marked' || currentAnswerState?.status === 'answered_marked';

    const summary = useMemo(() => {
        const attempted = userAnswers.filter(a => a.answer !== null).length;
        const total = test.questions.length;
        const unattempted = total - attempted;
        return { total, attempted, unattempted };
    }, [userAnswers, test.questions.length]);

    const submissionSummaryMessage = (
        <div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">You are about to submit the test. Please review your attempt summary below. This action cannot be undone.</p>
            <div className="space-y-3 text-left bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border dark:border-gray-600">
                <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Total Questions:</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{summary.total}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Attempted:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{summary.attempted}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Unattempted:</span>
                    <span className="font-bold text-orange-500 dark:text-orange-400">{summary.unattempted}</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-3 border-t border-gray-200 dark:border-gray-600 mt-2">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Time Remaining:</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatTime(timeRemaining)}</span>
                </div>
            </div>
        </div>
    );
    
    const handleSubmitClick = () => setSubmitModalOpen(true);
    const handleExitClick = () => setExitModalOpen(true);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900 sm:p-4">
            <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-3 shadow-md border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between gap-x-2 sm:gap-x-4">
                    {/* Left Side: Exit & Title */}
                    <div className="flex items-center gap-3 flex-shrink min-w-0">
                        <button
                            onClick={handleExitClick}
                            className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 flex-shrink-0"
                            title="Exit Test"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 capitalize truncate">{test.title}</h2>
                    </div>
                    
                    {/* Right Side: Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            onClick={() => setLanguage(language === 'english' ? 'hindi' : 'english')}
                            className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 flex items-center gap-1.5"
                            title="Switch Language"
                        >
                            <Languages size={18} />
                            <span className="text-sm font-semibold hidden sm:inline">{language === 'english' ? 'हिन्दी' : 'English'}</span>
                        </button>
                        {user && (
                            <button
                                onClick={() => setReportModalOpen(true)}
                                className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                                title="Report issue with this question"
                            >
                                <Flag size={18} />
                            </button>
                        )}
                        <button
                            onClick={handleToggleMark}
                            className={`p-2 rounded-lg transition-colors ${isMarked ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
                            title={isMarked ? "Unmark for Review" : "Mark for Review"}
                        >
                            {isMarked ? <BookmarkMinus size={18} /> : <BookmarkPlus size={18} />}
                        </button>

                        <div className={`text-sm font-bold px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1.5 whitespace-nowrap ${timeRemaining < 300 ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300'}`}>
                            <Clock className="w-4 h-4" />
                            <span>{formatTime(timeRemaining)}</span>
                        </div>
                        
                        <button onClick={handleSubmitClick} className="bg-red-600 text-white font-semibold py-2 px-3 rounded-lg hover:bg-red-700 transition-all shadow-md text-sm">Submit</button>

                        <button onClick={() => setPaletteOpen(true)} className="p-2 rounded-lg text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 lg:hidden" title="Show Question Palette"><LayoutGrid size={18}/></button>
                    </div>
                </div>
                
                {/* Progress bar moved below */}
                <div className="w-full flex items-center gap-2 pt-3">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentQuestionIndex + 1) / test.questions.length) * 100}%` }}></div>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">{currentQuestionIndex + 1} / {test.questions.length}</span>
                </div>
            </header>
            
            <main className="flex-grow flex flex-col lg:flex-row gap-6 px-4 pb-4 pt-6">
                <div className="flex-grow">
                    <p 
                        className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-6 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: `<span class="text-indigo-600 dark:text-indigo-400">${currentQuestionIndex + 1}.</span> ${questionText.replace(/(\w+)\^([\w.-]+)/g, '$1<sup>$2</sup>')}`}}
                    />
                    <div className="space-y-4">
                        {(questionOptions || []).map((option, index) => {
                            const key = ['A', 'B', 'C', 'D'][index];
                            const isSelected = currentAnswerState?.answer === key;
                            return (
                                <button 
                                    key={key} 
                                    onClick={() => handleOptionSelect(key)} 
                                    className={`w-full text-left p-4 flex items-start gap-4 border-2 rounded-lg transition-all duration-200 group ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 shadow-sm' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-gray-600/50'}`}
                                >
                                    <span className={`font-bold text-sm mt-1 flex-shrink-0 flex items-center justify-center h-8 w-8 ${isSelected ? 'bg-indigo-600 dark:bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 group-hover:text-indigo-700 dark:group-hover:text-indigo-400'} rounded-md transition-colors`}>{key}</span>
                                    <span 
                                        className={`text-gray-800 dark:text-gray-100 text-left ${isSelected ? 'font-semibold' : ''}`}
                                        dangerouslySetInnerHTML={{ __html: option.replace(/(\w+)\^([\w.-]+)/g, '$1<sup>$2</sup>') }}
                                    />
                                </button>
                            )
                        })}
                    </div>
                </div>
                <div className="w-full lg:w-80 lg:flex-shrink-0">
                    <div className="hidden lg:block lg:sticky lg:top-24">
                         <QuestionPalette 
                            isOpen={true} 
                            isModal={false}
                            onClose={() => {}}
                            questions={test.questions} 
                            userAnswers={userAnswers}
                            currentQuestionIndex={currentQuestionIndex}
                            onQuestionSelect={handlePaletteQuestionSelect}
                            mode="test"
                            onSubmitTest={handleSubmitClick}
                        />
                    </div>
                </div>
            </main>

            <footer className="flex justify-between items-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm sm:dark:bg-transparent border-t-2 border-gray-200 dark:border-gray-700 sticky bottom-0 z-10 sm:relative sm:p-0 sm:bg-transparent sm:border-t-0 sm:mt-auto sm:shadow-none">
                <button onClick={() => setCurrentQuestionIndex(p => p - 1)} disabled={currentQuestionIndex === 0} className="flex-1 sm:flex-none sm:w-auto bg-white dark:bg-gray-800 sm:dark:bg-gray-700 border-r sm:border border-gray-200 dark:border-gray-700 sm:dark:border-gray-600 text-gray-800 dark:text-gray-200 font-bold py-4 sm:py-3 sm:px-6 rounded-none sm:rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 transition-all sm:shadow-sm flex items-center justify-center gap-2">
                    <ArrowLeft size={20} /> Previous
                </button>
                {currentQuestionIndex === test.questions.length - 1 ? (
                    <button onClick={handleSubmitClick} className="flex-1 sm:flex-none sm:w-auto bg-green-600 text-white font-bold py-4 sm:py-3 sm:px-6 rounded-none sm:rounded-lg hover:bg-green-700 transition-all sm:shadow-md flex items-center justify-center gap-2">
                        Submit Test <CheckCircle size={20} />
                    </button>
                ) : (
                    <button onClick={() => setCurrentQuestionIndex(p => p + 1)} className="flex-1 sm:flex-none sm:w-auto bg-indigo-600 text-white font-bold py-4 sm:py-3 sm:px-6 rounded-none sm:rounded-lg hover:bg-indigo-700 transition-all sm:shadow-md flex items-center justify-center gap-2">
                        Next <ArrowRight size={20} />
                    </button>
                )}
            </footer>
            
            <QuestionPalette 
                isOpen={paletteOpen}
                isModal={true}
                onClose={() => setPaletteOpen(false)}
                questions={test.questions} 
                userAnswers={userAnswers}
                currentQuestionIndex={currentQuestionIndex}
                onQuestionSelect={handleMobilePaletteQuestionSelect}
                mode="test"
                onSubmitTest={handleSubmitClick}
            />
             <ConfirmModal
                isOpen={submitModalOpen}
                onClose={() => setSubmitModalOpen(false)}
                onConfirm={onSubmitTest}
                title="Confirm Submission"
                message={submissionSummaryMessage}
                confirmText="Submit Test"
            />
             <ConfirmModal
                isOpen={exitModalOpen}
                onClose={() => setExitModalOpen(false)}
                onConfirm={onExitTest}
                title="Exit Test"
                message="Are you sure you want to exit? Your progress is saved automatically and you can resume later from the homepage."
                confirmText="Exit"
            />
             {currentQuestion && (
                <ReportQuestionModal 
                    isOpen={reportModalOpen}
                    onClose={() => setReportModalOpen(false)}
                    test={test}
                    question={currentQuestion}
                    questionIndex={currentQuestionIndex}
                />
             )}
        </div>
    );
};

export default TestScreen;
