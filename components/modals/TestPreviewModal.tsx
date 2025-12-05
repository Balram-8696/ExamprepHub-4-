import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Test, Question, BilingualText } from '../../types';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

interface TestPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    test: Test | null;
}

const TestPreviewModal: React.FC<TestPreviewModalProps> = ({ isOpen, onClose, test }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [language, setLanguage] = useState<'english' | 'hindi'>('english');

    useEffect(() => {
        if (isOpen) {
            setCurrentQuestionIndex(0);
            setLanguage('english');
        }
    }, [isOpen]);

    if (!isOpen || !test) {
        return null;
    }

    const currentQuestion = test.questions[currentQuestionIndex];
    if (!currentQuestion) {
        return null; // Should not happen if test has questions
    }

    const isBilingual = typeof currentQuestion.question === 'object' && 'english' in currentQuestion.question;
    const questionText = isBilingual ? (currentQuestion.question as BilingualText)[language] : currentQuestion.question as unknown as string;
    const questionOptions = isBilingual ? currentQuestion.options[language] : (currentQuestion.options as unknown as string[]);
    const questionExplanation = isBilingual && currentQuestion.explanation ? currentQuestion.explanation[language] : (currentQuestion.explanation as unknown as string | undefined);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Preview: ${test.title}`} size="lg">
            <div className="flex justify-between items-center mb-4">
                <p className="font-semibold text-gray-700 dark:text-gray-300">
                    Question {currentQuestionIndex + 1} of {test.questions.length}
                </p>
                <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-700 border dark:border-gray-600 rounded-lg">
                    <button onClick={() => setLanguage('english')} className={`px-3 py-1 text-sm rounded-md ${language === 'english' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}>English</button>
                    <button onClick={() => setLanguage('hindi')} className={`px-3 py-1 text-sm rounded-md ${language === 'hindi' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}>हिन्दी</button>
                </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto pr-4 space-y-6">
                <p 
                    className="text-lg font-semibold text-gray-800 dark:text-gray-100 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: questionText.replace(/(\w+)\^([\w.-]+)/g, '$1<sup>$2</sup>') }}
                />

                <div className="space-y-3">
                    {(questionOptions || []).map((option, index) => {
                        const key = ['A', 'B', 'C', 'D'][index];
                        const isCorrect = key === currentQuestion.correctAnswer;
                        return (
                            <div
                                key={key}
                                className={`p-3 flex items-start gap-3 border-2 rounded-lg ${
                                    isCorrect
                                        ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 dark:border-emerald-700'
                                        : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                                }`}
                            >
                                <span className={`font-bold text-sm mt-1 flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-md ${isCorrect ? 'bg-emerald-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200'}`}>{key}</span>
                                <span 
                                    className={`text-gray-800 dark:text-gray-200 ${isCorrect ? 'font-bold' : ''}`}
                                    dangerouslySetInnerHTML={{ __html: option.replace(/(\w+)\^([\w.-]+)/g, '$1<sup>$2</sup>') }}
                                />
                                {isCorrect && <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-500 ml-auto flex-shrink-0" />}
                            </div>
                        );
                    })}
                </div>

                {questionExplanation && (
                    <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/40 border-l-4 border-indigo-500 rounded-r-lg">
                        <h4 className="font-semibold text-indigo-800 dark:text-indigo-300 mb-1">Explanation</h4>
                        <p 
                            className="text-sm text-gray-700 dark:text-gray-300"
                            dangerouslySetInnerHTML={{ __html: (questionExplanation || '').replace(/(\w+)\^([\w.-]+)/g, '$1<sup>$2</sup>') }}
                        />
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center mt-6 pt-4 border-t dark:border-gray-700">
                <button
                    onClick={() => setCurrentQuestionIndex(p => p - 1)}
                    disabled={currentQuestionIndex === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 transition-all"
                >
                    <ArrowLeft size={18} /> Previous
                </button>
                <button
                    onClick={() => setCurrentQuestionIndex(p => p + 1)}
                    disabled={currentQuestionIndex === test.questions.length - 1}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all"
                >
                    Next <ArrowRight size={18} />
                </button>
            </div>
        </Modal>
    );
};

export default TestPreviewModal;