
import React, { useState, useMemo, useCallback, useContext } from 'react';
import { Test, UserAnswer, AnswerStatus, BilingualText } from '../../types';
import { Check, X, Info, ArrowLeft, ArrowRight, XCircle, CheckCircle, SkipForward, Target, Eye, LayoutGrid, Flag } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import QuestionPalette from './QuestionPalette';
import ReportQuestionModal from '../modals/ReportQuestionModal';
import { AuthContext } from '../../AuthContext';

interface PracticeScreenProps {
    test: Test;
    onExit: () => void;
}

const PracticeScreen: React.FC<PracticeScreenProps> = ({ test, onExit }) => {
    const { user } = useContext(AuthContext);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<(string | null)[]>(Array(test.questions.length).fill(null));
    const [screen, setScreen] = useState<'practice' | 'summary'>('practice');
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [language] = useState<'english' | 'hindi'>('english'); // Practice mode defaults to English for now

    const currentQuestion = test.questions[currentIndex];
    const selectedAnswer = answers[currentIndex];
    const isAnswered = selectedAnswer !== null;

    const isBilingual = typeof currentQuestion.question === 'object' && 'english' in currentQuestion.question;
    const questionText = isBilingual ? (currentQuestion.question as BilingualText)[language] : currentQuestion.question as unknown as string;
    const questionOptions = isBilingual ? currentQuestion.options[language] : currentQuestion.options as unknown as string[];
    const questionExplanation = isBilingual && currentQuestion.explanation ? currentQuestion.explanation[language] : currentQuestion.explanation as unknown as string | undefined;

    const handleOptionSelect = (optionKey: string) => {
        if (isAnswered) return; // Don't allow changing answer
        const newAnswers = [...answers];
        newAnswers[currentIndex] = optionKey;
        setAnswers(newAnswers);
    };

    const stats = useMemo(() => {
        const correct = answers.filter((ans, i) => ans !== null && ans === test.questions[i].correctAnswer).length;
        const incorrect = answers.filter((ans, i) => ans !== null && ans !== test.questions[i].correctAnswer).length;
        const attempted = correct + incorrect;
        const unattempted = test.questions.length - attempted;
        return { correct, incorrect, attempted, unattempted };
    }, [answers, test.questions]);

    const paletteAnswers: UserAnswer[] = useMemo(() => {
        return test.questions.map((q, i) => {
            const userAnswer = answers[i];
            let status: AnswerStatus = 'unattempted';
            if (userAnswer !== null) {
                status = userAnswer === q.correctAnswer ? 'answered' : 'incorrect';
            }
            return { answer: userAnswer, status };
        });
    }, [answers, test.questions]);

    const handlePaletteSelect = useCallback((index: number) => {
        setCurrentIndex(index);
        setPaletteOpen(false);
    }, []);

    if (screen === 'summary') {
        const chartData = [
            { name: 'Correct', value: stats.correct },
            { name: 'Incorrect', value: stats.incorrect },
            { name: 'Unattempted', value: stats.unattempted },
        ];
        const COLORS = ['#10B981', '#EF4444', '#6B7280'];

        return (
             <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="text-center">
                        <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
                        <h1 className="text-4xl font-extrabold text-gray-800 dark:text-gray-100">Practice Session Complete!</h1>
                        <p className="text-lg text-gray-600 dark:text-gray-300 mt-2">Here's how you did.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 items-center">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                    <p className="font-medium text-gray-700 dark:text-gray-300">Total Questions</p>
                                </div>
                                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{test.questions.length}</p>
                            </div>
                             <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                    <p className="font-medium text-gray-700 dark:text-gray-300">Correct</p>
                                </div>
                                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.correct}</p>
                            </div>
                             <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                                    <p className="font-medium text-gray-700 dark:text-gray-300">Incorrect</p>
                                </div>
                                <p className="text-xl font-bold text-red-600 dark:text-red-400">{stats.incorrect}</p>
                            </div>
                             <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <SkipForward className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                                    <p className="font-medium text-gray-700 dark:text-gray-300">Unattempted</p>
                                </div>
                                <p className="text-xl font-bold text-gray-600 dark:text-gray-400">{stats.unattempted}</p>
                            </div>
                        </div>
                         <div className="w-full h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8">
                                        {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--tooltip-bg, #fff)', border: '1px solid var(--tooltip-border, #ccc)' }} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    
                    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button onClick={onExit} className="w-full flex items-center justify-center gap-2 bg-white dark:bg-transparent text-red-600 dark:text-red-400 font-bold py-3 px-6 rounded-lg border-2 border-red-300 dark:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all shadow-sm">
                            <XCircle size={18} /> Exit Practice
                        </button>
                        <button onClick={() => setScreen('practice')} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 transition-all shadow-md">
                            <Eye size={18} /> Review Answers
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900 sm:p-4">
            <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 sm:rounded-xl shadow-md border-b sm:border border-gray-200 dark:border-gray-700 sm:my-4">
                <div className="flex justify-between items-center flex-wrap gap-y-3">
                    <div className="order-1">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">{test.title}</h2>
                        <p className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold">Practice Mode</p>
                    </div>
                    <div className="flex items-center gap-2 order-2">
                        {user && (
                        <button
                            onClick={() => setReportModalOpen(true)}
                            className="p-2.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                            title="Report issue with this question"
                        >
                            <Flag size={20} />
                        </button>
                        )}
                         <button onClick={() => setPaletteOpen(true)} className="p-2.5 rounded-lg text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 lg:hidden" title="Show Question Palette"><LayoutGrid size={20}/></button>
                        <button onClick={onExit} className="bg-red-600 text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-red-700 transition-all shadow-md text-sm sm:text-base flex items-center gap-2">
                            <XCircle size={18} /> Exit
                        </button>
                    </div>
                     <div className="w-full order-3 mt-4">
                        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-1">
                            <span>Progress</span>
                            <span>{currentIndex + 1} / {test.questions.length}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                            <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${((currentIndex + 1) / test.questions.length) * 100}%` }}></div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-grow flex flex-col lg:flex-row gap-6 px-4 pb-4">
                <div className="flex-grow">
                    <p 
                        className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-6 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: `<span class="text-gray-500 dark:text-gray-400">${currentIndex + 1}. </span>${questionText.replace(/(\w+)\^([\w.-]+)/g, '$1<sup>$2</sup>')}`}}
                    />
                    <div className="space-y-4 mb-6">
                        {questionOptions.map((option, index) => {
                            const key = ['A', 'B', 'C', 'D'][index];
                            const isCorrect = key === currentQuestion.correctAnswer;
                            const isSelected = key === selectedAnswer;
                            
                            let optionClass = 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-gray-600/50';
                            let icon = null;

                            if (isAnswered) {
                                if (isCorrect) {
                                    optionClass = 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 dark:border-emerald-500/50';
                                    icon = <Check className="w-6 h-6 text-emerald-600" />;
                                } else if (isSelected) {
                                    optionClass = 'bg-red-50 dark:bg-red-900/30 border-red-500 dark:border-red-500/50';
                                    icon = <X className="w-6 h-6 text-red-600" />;
                                } else {
                                    optionClass = 'bg-gray-50 dark:bg-gray-700/40 border-gray-200 dark:border-gray-600 opacity-80';
                                }
                            }

                            return (
                                <button
                                    key={key}
                                    onClick={() => handleOptionSelect(key)}
                                    disabled={isAnswered}
                                    className={`w-full text-left p-4 flex items-center justify-between border-2 rounded-lg transition-all duration-200 group ${optionClass} ${!isAnswered ? 'cursor-pointer' : 'cursor-default'}`}
                                >
                                    <div className="flex items-start gap-4">
                                        <span className={`font-bold text-sm mt-1 flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-md ${isAnswered ? (isCorrect ? 'bg-emerald-600 text-white' : isSelected ? 'bg-red-600 text-white' : 'bg-gray-200 dark:bg-gray-600') : 'bg-gray-100 dark:bg-gray-600 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50'}`}>{key}</span>
                                        <span 
                                            className={`text-gray-800 dark:text-gray-100 ${isSelected ? 'font-semibold' : ''}`}
                                            dangerouslySetInnerHTML={{ __html: option.replace(/(\w+)\^([\w.-]+)/g, '$1<sup>$2</sup>')}}
                                        />
                                    </div>
                                    {isAnswered && icon}
                                </button>
                            );
                        })}
                    </div>

                    {isAnswered && questionExplanation && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-5 animate-fade-in">
                            <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-3 text-lg flex items-center"><Info className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />Explanation</h4>
                            <div 
                                className="text-gray-800 dark