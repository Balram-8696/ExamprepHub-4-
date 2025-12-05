
import React, { useMemo } from 'react';
import { Question, UserAnswer, AnswerStatus } from '../../types';
import { X, CheckCircle } from 'lucide-react';

type PaletteMode = 'test' | 'solution';

const getStatusClass = (status: AnswerStatus, mode: PaletteMode) => {
    if (mode === 'solution') {
         switch (status) {
            case 'answered': return 'bg-emerald-500 text-white'; // Correct
            case 'incorrect': return 'bg-red-500 text-white';
            case 'unattempted':
            default: return 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200';
         }
    }
    // mode === 'test'
    switch (status) {
        case 'answered': return 'bg-blue-500 text-white';
        case 'marked': return 'bg-purple-500 text-white';
        case 'answered_marked': return 'bg-yellow-500 text-white';
        case 'unattempted':
        default: return 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200';
    }
};

const PaletteButton = React.memo(({ index, status, isCurrent, onQuestionSelect, mode }: { index: number; status: AnswerStatus; isCurrent: boolean; onQuestionSelect: (index: number) => void; mode: PaletteMode; }) => (
    <button
        onClick={() => onQuestionSelect(index)}
        className={`font-semibold text-sm w-9 h-9 rounded-full transition-all duration-200 hover:brightness-110 focus:outline-none flex items-center justify-center ${getStatusClass(status, mode)} ${isCurrent ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 ring-indigo-500' : ''}`}
        aria-label={`Go to question ${index + 1}, status: ${status}`}
    >
        {index + 1}
    </button>
));

const LegendItem: React.FC<{ color: string, label: string, count: number }> = ({ color, label, count }) => (
    <div className="flex items-center gap-2 text-sm">
        <span className={`w-3.5 h-3.5 rounded-sm ${color} shrink-0`}></span>
        <span className="text-gray-600 dark:text-gray-400 flex-grow">{label}</span>
        <span className="font-bold text-gray-800 dark:text-gray-200">{count}</span>
    </div>
);

const testLegend: { status: AnswerStatus, label: string, color: string }[] = [
    { status: 'answered', label: 'Answered', color: 'bg-blue-500' },
    { status: 'unattempted', label: 'Not Answered', color: 'bg-gray-200 dark:bg-gray-600' },
    { status: 'marked', label: 'Marked', color: 'bg-purple-500' },
    { status: 'answered_marked', label: 'Answered & Marked', color: 'bg-yellow-500' },
];

const solutionLegend: { status: AnswerStatus, label: string, color: string }[] = [
    { status: 'answered', label: 'Correct', color: 'bg-emerald-500' },
    { status: 'incorrect', label: 'Incorrect', color: 'bg-red-500' },
    { status: 'unattempted', label: 'Not Answered', color: 'bg-gray-200 dark:bg-gray-600' },
];


interface QuestionPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    questions: Question[];
    userAnswers: UserAnswer[];
    currentQuestionIndex: number;
    onQuestionSelect: (index: number) => void;
    isModal?: boolean;
    mode: PaletteMode;
    onSubmitTest?: () => void;
    visibleIndices?: number[];
}

const QuestionPalette: React.FC<QuestionPaletteProps> = ({ 
    isOpen, 
    onClose, 
    questions, 
    userAnswers, 
    currentQuestionIndex,
    onQuestionSelect,
    isModal = true,
    mode,
    onSubmitTest,
    visibleIndices
}) => {

    const summary = useMemo(() => {
        const counts: { [K in AnswerStatus]?: number } = {};
        userAnswers.forEach(ua => {
            counts[ua.status] = (counts[ua.status] || 0) + 1;
        });
        return counts;
    }, [userAnswers]);
    
    const legendItems = mode === 'test' ? testLegend : solutionLegend;
    
    const PaletteContent = () => (
        <div className="flex flex-col max-h-[85vh] bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center border-b dark:border-gray-700 pb-3 mb-3">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Question Palette</h3>
                {isModal && <button onClick={onClose} className="p-2 -mr-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"><X/></button>}
            </div>
            
            <div className="grid grid-cols-5 sm:grid-cols-6 gap-2.5 overflow-y-auto flex-grow pr-2 -mr-2 pretty-scrollbar content-start">
                {questions.map((_, index) => {
                    if (visibleIndices && !visibleIndices.includes(index)) {
                        return null;
                    }
                    return (
                        <PaletteButton
                            key={index}
                            index={index}
                            status={userAnswers[index]?.status || 'unattempted'}
                            isCurrent={index === currentQuestionIndex}
                            onQuestionSelect={onQuestionSelect}
                            mode={mode}
                        />
                    );
                })}
                 {visibleIndices && visibleIndices.length === 0 && (
                    <p className="col-span-full text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                        No questions match this filter.
                    </p>
                )}
            </div>
             <div className="mt-4 border-t dark:border-gray-700 pt-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {legendItems.map(item => (
                        <LegendItem
                            key={item.status}
                            color={item.color}
                            label={item.label}
                            count={summary[item.status] || 0}
                        />
                    ))}
                </div>
            </div>
            {mode === 'test' && onSubmitTest && (
                <div className="mt-4 border-t dark:border-gray-700 pt-4">
                    <button
                        onClick={onSubmitTest}
                        className="w-full py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all shadow-md flex items-center justify-center gap-2"
                    >
                        <CheckCircle size={18} /> Submit Test
                    </button>
                </div>
            )}
        </div>
    );

    if (!isModal) {
        return <PaletteContent />;
    }

    if (!isOpen) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="palette-title"
        >
            <div
                className="w-full max-w-sm animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                <PaletteContent />
            </div>
        </div>
    );
};

export default QuestionPalette;
