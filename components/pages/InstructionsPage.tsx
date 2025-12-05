import React, { useState } from 'react';
import { Test } from '../../types';
import { ArrowLeft, CheckCircle, Info, Languages, BookOpen, Clock, MinusCircle, BarChart2, Award, Navigation } from 'lucide-react';

interface InstructionsPageProps {
    test: Test;
    onStartTest: (language: 'english' | 'hindi') => void;
    onBack: () => void;
}

const InstructionsPage: React.FC<InstructionsPageProps> = ({ test, onStartTest, onBack }) => {
    const [agreed, setAgreed] = useState(false);
    const [selectedLang, setSelectedLang] = useState<'english' | 'hindi'>('english');

    const totalMarks = (test.questionCount || 0) * (test.marksPerQuestion || 1);

    const instructions = {
        english: {
            title: "Test Instructions",
            get_ready: "You are about to start the test:",
            agreement: "I have read and understood all the instructions. I am ready to begin.",
            start_button: "Start Test",
            sections: {
                general: { title: "General", icon: Info, points: [`**${test.questionCount} multiple-choice questions**.`, `**${test.durationMinutes} minutes** to complete.`, "The clock is set on the server and will start as soon as you begin.", "Each question has only one correct answer."] },
                marking: { title: "Marking Scheme", icon: Award, points: [`**${test.marksPerQuestion} mark(s)** for each correct answer.`, test.negativeMarking > 0 ? `**${test.negativeMarking} mark(s)** will be deducted for each incorrect answer.` : 'There is **no negative marking**.', `No marks for unattempted questions.`] },
                navigation: { title: "Navigation", icon: Navigation, points: ["Use the **'Next'** & **'Previous'** buttons.", "Click on a question number in the palette to jump to it.", "**'Mark for Review'** to revisit questions later.", "Test submits automatically when time ends."] }
            },
            palette_legend: {
                title: "Question Palette Colors",
                items: [
                    { color: "bg-gray-200 dark:bg-gray-600", label: "Not Answered" },
                    { color: "bg-blue-500", label: "Answered" },
                    { color: "bg-purple-500", label: "Marked for Review" },
                    { color: "bg-yellow-500", label: "Answered & Marked" },
                ]
            }
        },
        hindi: {
            title: "परीक्षा निर्देश",
            get_ready: "आप यह परीक्षा शुरू करने वाले हैं:",
            agreement: "मैंने सभी निर्देशों को पढ़ और समझ लिया है। मैं शुरू करने के लिए तैयार हूँ।",
            start_button: "परीक्षा शुरू करें",
            sections: {
                general: { title: "सामान्य", icon: Info, points: [`**${test.questionCount} बहुविकल्पीय प्रश्न**।`, `पूरा करने के लिए **${test.durationMinutes} मिनट**।`, "घड़ी सर्वर पर सेट है और आपके शुरू करते ही चालू हो जाएगी।", "प्रत्येक प्रश्न का केवल एक ही सही उत्तर है।"] },
                marking: { title: "अंकन योजना", icon: Award, points: [`प्रत्येक सही उत्तर के लिए **${test.marksPerQuestion} अंक**।`, test.negativeMarking > 0 ? `प्रत्येक गलत उत्तर के लिए **${test.negativeMarking} अंक** काटे जाएंगे।` : '**कोई नकारात्मक अंकन नहीं** है।', `अनुत्तरित प्रश्नों के लिए कोई अंक नहीं।`] },
                navigation: { title: "नेविगेशन", icon: Navigation, points: ["**'अगला' (Next)** और **'पिछला' (Previous)** बटन का उपयोग करें।", "प्रश्न पैलेट में प्रश्न संख्या पर क्लिक करके सीधे जाएं।", "प्रश्नों को बाद में देखने के लिए **'समीक्षा के लिए चिह्नित करें'**।", "समय समाप्त होने पर परीक्षा स्वतः जमा हो जाएगी।"] }
            },
            palette_legend: {
                title: "प्रश्न पैलेट के रंग",
                items: [
                    { color: "bg-gray-200 dark:bg-gray-600", label: "उत्तर नहीं दिया" },
                    { color: "bg-blue-500", label: "उत्तर दिया" },
                    { color: "bg-purple-500", label: "समीक्षा के लिए चिह्नित" },
                    { color: "bg-yellow-500", label: "उत्तर दिया और चिह्नित" },
                ]
            }
        }
    };
    
    const currentLangData = instructions[selectedLang];

    const StatCard: React.FC<{ icon: React.ElementType; label: string; value: string | number }> = ({ icon: Icon, label, value }) => (
        <div className="bg-slate-100 dark:bg-gray-700/50 p-3 rounded-lg text-center">
            <Icon className="w-6 h-6 text-indigo-500 dark:text-indigo-400 mx-auto mb-1" />
            <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        </div>
    );

    const InstructionSection: React.FC<{ title: string; icon: React.ElementType; points: string[] }> = ({ title, icon: Icon, points }) => (
        <div>
            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-3">
                <Icon className="w-5 h-5 text-indigo-500 dark:text-indigo-400" /> {title}
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300 pl-2">
                {points.map((point, index) => (
                    <li key={index} className="flex items-start">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2.5 mt-0.5 flex-shrink-0" />
                        <span dangerouslySetInnerHTML={{ __html: point.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-700 dark:text-gray-200">$1</strong>') }} />
                    </li>
                ))}
            </ul>
        </div>
    );

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-2 sm:p-4 font-sans pattern-bg">
            <div className="w-full max-w-5xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col h-full max-h-[95vh]">
                <header className="flex-shrink-0 p-4 sm:p-5 border-b dark:border-gray-700 flex justify-between items-center bg-slate-50 dark:bg-gray-800/50">
                    <button 
                        onClick={onBack}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                    >
                        <ArrowLeft size={16} />
                        <span className="hidden sm:inline">Back</span>
                    </button>
                    <h1 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">
                        {currentLangData.title}
                    </h1>
                    <div className="flex items-center gap-1 p-1 bg-gray-200 dark:bg-gray-700 rounded-lg">
                        <button onClick={() => setSelectedLang('english')} className={`px-3 py-1 text-sm rounded-md font-semibold ${selectedLang === 'english' ? 'bg-white dark:bg-gray-800 shadow text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>English</button>
                        <button onClick={() => setSelectedLang('hindi')} className={`px-3 py-1 text-sm rounded-md font-semibold ${selectedLang === 'hindi' ? 'bg-white dark:bg-gray-800 shadow text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>हिन्दी</button>
                    </div>
                </header>

                <main className="flex-grow overflow-y-auto p-6 sm:p-8 pretty-scrollbar">
                    <div className="text-center mb-6">
                        <p className="text-sm text-gray-500 dark:text-gray-400">{currentLangData.get_ready}</p>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-100 mt-1">{test.title}</h2>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-8">
                        <StatCard icon={BookOpen} label="Questions" value={test.questionCount} />
                        <StatCard icon={Clock} label="Duration" value={`${test.durationMinutes} Mins`} />
                        <StatCard icon={BarChart2} label="Total Marks" value={totalMarks} />
                        <StatCard icon={MinusCircle} label="Negative Marking" value={test.negativeMarking} />
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <InstructionSection {...currentLangData.sections.general} />
                        <InstructionSection {...currentLangData.sections.marking} />
                        <InstructionSection {...currentLangData.sections.navigation} />
                        <div className="md:col-span-2 lg:col-span-3">
                             <div className="lg:grid lg:grid-cols-2 lg:gap-8 items-center">
                                 <div>
                                    <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2"><Languages className="w-5 h-5 text-indigo-500 dark:text-indigo-400"/> Language Choice</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">Questions are available in both English and Hindi. You can switch languages during the test, but this sets your default.</p>
                                 </div>
                                <div className="p-4 bg-slate-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600 mt-4 lg:mt-0">
                                    <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-3">{currentLangData.palette_legend.title}</h3>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                        {currentLangData.palette_legend.items.map(item => (
                                            <div key={item.label} className="flex items-center gap-2">
                                                <span className={`w-4 h-4 rounded-sm ${item.color} flex-shrink-0`}></span>
                                                <span className="text-sm text-gray-600 dark:text-gray-300">{item.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                <footer className="flex-shrink-0 p-6 bg-slate-100 dark:bg-gray-900/50 border-t dark:border-gray-700 space-y-4">
                    <div className="flex items-start">
                        <input
                            id="agree"
                            type="checkbox"
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                            className="h-5 w-5 text-indigo-600 border-gray-300 dark:border-gray-500 rounded focus:ring-indigo-500 mt-0.5"
                        />
                        <label htmlFor="agree" className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-200">
                           {currentLangData.agreement}
                        </label>
                    </div>
                    <button
                        onClick={() => onStartTest(selectedLang)}
                        disabled={!agreed}
                        className={`w-full py-3.5 bg-green-600 text-white text-lg font-bold rounded-lg hover:bg-green-700 transition-all shadow-lg disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${agreed && 'animate-button-glow'}`}
                    >
                        <CheckCircle /> {currentLangData.start_button}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default InstructionsPage;