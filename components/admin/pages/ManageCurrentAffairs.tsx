import React, { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, deleteDoc, doc, where, getDocs, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { CurrentAffairsSection, Test, Question, BilingualText, BilingualOptions } from '../../../types';
import { showMessage, getCategoryStyle } from '../../../utils/helpers';
import { Newspaper, FolderPlus, Trash2, Pencil, X, ListChecks, Upload, PlusCircle, Bot, FileUp, Clock, Wand2, Loader2, Save, Check, ArrowLeft, Eye } from 'lucide-react';
import ConfirmModal from '../../modals/ConfirmModal';
import Modal from '../../modals/Modal';
import SkeletonList from '../../skeletons/SkeletonList';
import DynamicIcon from '../../layout/DynamicIcon';
// FIX: Import GoogleGenAI and Type for Gemini API usage
import { GoogleGenAI, Type } from "@google/genai";
import TestPreviewModal from '../../modals/TestPreviewModal';

type CATab = 'sections' | 'upload' | 'view';

const ManageCurrentAffairs: React.FC = () => {
    const [activeTab, setActiveTab] = useState<CATab>('sections');
    const [editingTestId, setEditingTestId] = useState<string | null>(null);

    const handleEditTest = (testId: string) => {
        setEditingTestId(testId);
        setActiveTab('upload');
    };

    const handleSaveComplete = () => {
        setEditingTestId(null);
        setActiveTab('view');
    };
    
    const handleSwitchToUpload = () => {
        setEditingTestId(null);
        setActiveTab('upload');
    }

    const renderContent = () => {
        switch(activeTab) {
            case 'sections': return <ManageSections />;
            case 'upload': return <UploadCATest testIdToEdit={editingTestId} onSaveComplete={handleSaveComplete} />;
            case 'view': return <ViewCATests onEditTest={handleEditTest} onAddNew={handleSwitchToUpload} />;
            default: return null;
        }
    };

    return (
        <div className="space-y-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border-t-4 border-indigo-500">
                 <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                    <Newspaper size={32} /> Manage Current Affairs
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-2">Create sections, upload tests, and manage all current affairs content from here.</p>
            </div>
            <div className="flex border-b border-gray-200 dark:border-gray-700">
                <TabButton label="Manage Sections" isActive={activeTab==='sections'} onClick={() => setActiveTab('sections')} icon={FolderPlus} />
                <TabButton label="Upload Test" isActive={activeTab==='upload'} onClick={() => { setEditingTestId(null); setActiveTab('upload');}} icon={Upload} />
                <TabButton label="View All Tests" isActive={activeTab==='view'} onClick={() => setActiveTab('view')} icon={ListChecks} />
            </div>
            <div>
                {renderContent()}
            </div>
        </div>
    );
};

const TabButton: React.FC<{label: string, isActive: boolean, onClick: () => void, icon: React.ElementType}> = ({ label, isActive, onClick, icon: Icon }) => (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold -mb-px border-b-2 transition-colors ${isActive ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500'}`}>
        <Icon size={16} /> {label}
    </button>
);


// --- Sub-component for Managing Sections ---
const ManageSections: React.FC = () => {
    const [sections, setSections] = useState<CurrentAffairsSection[]>([]);
    const [testCounts, setTestCounts] = useState<{ [key: string]: number }>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sectionToDelete, setSectionToDelete] = useState<CurrentAffairsSection | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSection, setEditingSection] = useState<CurrentAffairsSection | null>(null);
    const [formName, setFormName] = useState('');
    const [formParentId, setFormParentId] = useState('');
    const [formIcon, setFormIcon] = useState('');

    useEffect(() => {
        const q = query(collection(db, 'currentAffairsSections'), orderBy('name'));
        const unsubscribeSections = onSnapshot(q, snapshot => {
            setSections(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CurrentAffairsSection)));
            setLoading(false);
        });

        const testsQuery = query(collection(db, 'tests'), where('currentAffairsSectionId', '!=', null));
        const unsubscribeTests = onSnapshot(testsQuery, snapshot => {
            const counts: { [key: string]: number } = {};
            snapshot.docs.forEach(doc => {
                const test = doc.data();
                if (test.currentAffairsSectionId) {
                    counts[test.currentAffairsSectionId] = (counts[test.currentAffairsSectionId] || 0) + 1;
                }
            });
            setTestCounts(counts);
        });

        return () => { unsubscribeSections(); unsubscribeTests(); };
    }, []);
    
    const handleOpenModal = (section: CurrentAffairsSection | null) => {
        if (section) {
            setEditingSection(section);
            setFormName(section.name);
            setFormParentId(section.parentId || '');
            setFormIcon(section.icon || '');
        } else {
            setEditingSection(null);
            setFormName('');
            setFormParentId('');
            setFormIcon('');
        }
        setIsModalOpen(true);
    };
    const handleCloseModal = () => setIsModalOpen(false);

    const handleSaveSection = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const data = { name: formName, parentId: formParentId || null, icon: formIcon };
        try {
            if (editingSection) {
                await updateDoc(doc(db, 'currentAffairsSections', editingSection.id), data);
                showMessage('Section updated!');
            } else {
                await addDoc(collection(db, 'currentAffairsSections'), { ...data, createdAt: serverTimestamp() });
                showMessage('Section added!');
            }
            handleCloseModal();
        } catch (error) { showMessage('Failed to save section.', true);
        } finally { setIsSubmitting(false); }
    };
    
    const handleDeleteClick = (section: CurrentAffairsSection) => setSectionToDelete(section);
    const confirmDelete = async () => {
        if (!sectionToDelete) return;
        setIsSubmitting(true);
        try {
            const hasChildren = sections.some(s => s.parentId === sectionToDelete.id);
            if (hasChildren) {
                showMessage("Cannot delete section with sub-sections.", true); return;
            }
            if ((testCounts[sectionToDelete.id] || 0) > 0) {
                 showMessage("Cannot delete section with tests in it.", true); return;
            }
            await deleteDoc(doc(db, 'currentAffairsSections', sectionToDelete.id));
            showMessage('Section deleted!');
        } catch (error) { showMessage('Failed to delete section.', true);
        } finally { setIsSubmitting(false); setSectionToDelete(null); }
    };

    return (
         <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Manage Sections</h2>
                <button onClick={() => handleOpenModal(null)} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                    <FolderPlus size={18} /> Add New Section
                </button>
            </div>
            {loading ? <SkeletonList /> : (
                <ul className="space-y-3">
                    {sections.filter(s => !s.parentId).map(parent => {
                         const style = getCategoryStyle(parent.name);
                         return (
                        <li key={parent.id} className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border dark:border-gray-600">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-md flex items-center justify-center ${style.bg} ${style.text}`}><DynamicIcon name={parent.icon || parent.name} /></div>
                                    <span className="font-semibold text-gray-800 dark:text-gray-100">{parent.name}</span>
                                    <span className="text-xs font-mono bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{testCounts[parent.id] || 0} tests</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleOpenModal(parent)} className="p-1.5 text-blue-500 hover:bg-blue-100 rounded-full dark:hover:bg-gray-600"><Pencil size={16} /></button>
                                    <button onClick={() => handleDeleteClick(parent)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-full dark:hover:bg-gray-600"><Trash2 size={16} /></button>
                                </div>
                            </div>
                            <ul className="pl-6 mt-2 space-y-2 border-l-2 ml-3 border-gray-200 dark:border-gray-600">
                                 {sections.filter(s => s.parentId === parent.id).map(child => (
                                     <li key={child.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-white dark:hover:bg-gray-600/50">
                                         <span className="text-gray-700 dark:text-gray-300">- {child.name}</span>
                                         <div className="flex items-center gap-2">
                                            <button onClick={() => handleOpenModal(child)} className="p-1.5 text-blue-500 hover:bg-blue-100 rounded-full dark:hover:bg-gray-500"><Pencil size={16} /></button>
                                            <button onClick={() => handleDeleteClick(child)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-full dark:hover:bg-gray-500"><Trash2 size={16} /></button>
                                         </div>
                                     </li>
                                 ))}
                            </ul>
                        </li>
                    )})}
                </ul>
            )}
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingSection ? 'Edit Section' : 'Add Section'}>
                 <form onSubmit={handleSaveSection} className="space-y-4">
                    <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Section Name" className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700" required />
                    <input type="text" value={formIcon} onChange={e => setFormIcon(e.target.value)} placeholder="Icon Name (e.g., Globe, Landmark)" className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700" />
                    <select value={formParentId} onChange={e => setFormParentId(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                        <option value="">None (Top-level)</option>
                        {sections.filter(s => !s.parentId && s.id !== editingSection?.id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <div className="flex justify-end gap-2"><button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400">{isSubmitting ? 'Saving...' : 'Save'}</button></div>
                 </form>
            </Modal>
             {sectionToDelete && <ConfirmModal isOpen={!!sectionToDelete} onClose={() => setSectionToDelete(null)} onConfirm={confirmDelete} title="Delete Section" message={`Are you sure you want to delete "${sectionToDelete.name}"?`} />}
        </div>
    );
};

const emptyQuestion: Question = {
    question: { english: '', hindi: '' },
    options: { english: ['', '', '', ''], hindi: ['', '', '', ''] },
    correctAnswer: 'A',
    explanation: { english: '', hindi: '' }
};

type QuestionInputMode = 'manual' | 'ai_topic' | 'ai_time' | 'csv' | 'document';

const UploadCATest: React.FC<{ testIdToEdit: string | null; onSaveComplete: () => void }> = ({ testIdToEdit, onSaveComplete }) => {
    const [title, setTitle] = useState('');
    const [sectionId, setSectionId] = useState('');
    const [questions, setQuestions] = useState<Question[]>([JSON.parse(JSON.stringify(emptyQuestion))]);
    const [sections, setSections] = useState<CurrentAffairsSection[]>([]);
    
    const [activeInputMode, setActiveInputMode] = useState<QuestionInputMode>('manual');
    const [manualInputLang, setManualInputLang] = useState<'english' | 'hindi'>('english');
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingTestData, setIsLoadingTestData] = useState(false);
    
    // AI State
    const [aiTopic, setAiTopic] = useState('');
    const [aiTimePeriod, setAiTimePeriod] = useState('Daily (Yesterday)');
    const [aiNumQuestions, setAiNumQuestions] = useState(5);
    const [aiDifficulty, setAiDifficulty] = useState('Medium');
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<Question[]>([]);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [reviewModalLang, setReviewModalLang] = useState<'english' | 'hindi'>('english');

    // Document Upload State
    const [docNumQuestions, setDocNumQuestions] = useState(10);
    const [docDifficulty, setDocDifficulty] = useState('Medium');

    useEffect(() => {
        const q = query(collection(db, 'currentAffairsSections'), orderBy('name'));
        const unsubscribe = onSnapshot(q, snapshot => setSections(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CurrentAffairsSection))));
        return unsubscribe;
    }, []);

    useEffect(() => {
        const fetchTest = async () => {
            if (testIdToEdit) {
                setIsLoadingTestData(true);
                const docRef = doc(db, 'tests', testIdToEdit);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data() as Test;
                    setTitle(data.title);
                    setSectionId(data.currentAffairsSectionId || '');
                    setQuestions(data.questions);
                }
                setIsLoadingTestData(false);
            } else {
                 setTitle('');
                 setSectionId('');
                 setQuestions([JSON.parse(JSON.stringify(emptyQuestion))]);
            }
        };
        fetchTest();
    }, [testIdToEdit]);

    const handleGenerateAI = async (mode: 'topic' | 'time') => {
        const promptTopic = mode === 'topic' ? aiTopic : `Current Affairs from ${aiTimePeriod}`;
        if (!promptTopic.trim() && mode === 'topic') {
            showMessage('Please enter a topic.', true); return;
        }
        setIsGenerating(true);
        try {
            // FIX: Updated to use the new GoogleGenAI SDK format
             const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
             const prompt = `Generate ${aiNumQuestions} multiple-choice questions about important current affairs from: "${promptTopic}". Difficulty: ${aiDifficulty}. Provide content in both English and Hindi.
Return a JSON array of objects with keys: "question" (object with "english", "hindi"), "options" (object with "english" array, "hindi" array), "correctAnswer" ('A'-'D'), and "explanation" (object with "english", "hindi").`;
            
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                question: { type: Type.OBJECT, properties: { english: { type: Type.STRING }, hindi: { type: Type.STRING }}, required: ['english', 'hindi'] },
                                options: { type: Type.OBJECT, properties: { english: { type: Type.ARRAY, items: { type: Type.STRING } }, hindi: { type: Type.ARRAY, items: { type: Type.STRING } }}, required: ['english', 'hindi'] },
                                correctAnswer: { type: Type.STRING },
                                explanation: { type: Type.OBJECT, properties: { english: { type: Type.STRING }, hindi: { type: Type.STRING }}, required: ['english', 'hindi'] }
                            },
                            required: ['question', 'options', 'correctAnswer', 'explanation']
                        }
                    }
                }
            });
            const generatedQs = JSON.parse(response.text) as Question[];
            
            setAiGeneratedQuestions(generatedQs);
            setIsReviewModalOpen(true);
        } catch (error) {
            console.error("AI Generation Error:", error);
            showMessage('Failed to generate questions. Please check the topic and try again.', true);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUpdateGeneratedQuestion = (index: number, field: keyof Question, lang: 'english' | 'hindi', value: string | string[], optIndex?: number) => {
        const newQuestions = [...aiGeneratedQuestions];
        const question = newQuestions[index];
        if (field === 'question' || field === 'explanation') {
            if (field === 'explanation' && !question.explanation) {
                question.explanation = { english: '', hindi: '' };
            }
            (question[field] as BilingualText)[lang] = value as string;
        } else if (field === 'options' && typeof optIndex === 'number') {
            (question[field] as BilingualOptions)[lang][optIndex] = value as string;
        } else if (field === 'correctAnswer') {
            question.correctAnswer = value as string;
        }
        setAiGeneratedQuestions(newQuestions);
    };
    
    const handleAcceptAllAndClose = () => {
        setQuestions(prev => [...prev.filter(q => q.question.english.trim()), ...aiGeneratedQuestions]);
        setIsReviewModalOpen(false);
        setActiveInputMode('manual');
    };
    
    const addQuestion = () => setQuestions(prev => [...prev, JSON.parse(JSON.stringify(emptyQuestion))]);
    const removeQuestion = (index: number) => setQuestions(prev => prev.filter((_, i) => i !== index));
    const handleQuestionChange = (index: number, field: 'question' | 'explanation', value: string) => {
        const newQuestions = [...questions];
        const currentQuestion = newQuestions[index];
        if (field === 'question') {
            currentQuestion.question[manualInputLang] = value;
        } else if (field === 'explanation') {
            if (!currentQuestion.explanation) {
                currentQuestion.explanation = { english: '', hindi: '' };
            }
            currentQuestion.explanation[manualInputLang] = value;
        }
        setQuestions(newQuestions);
    };
    const handleOptionChange = (qIndex: number, oIndex: number, value: string) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options[manualInputLang][oIndex] = value;
        setQuestions(newQuestions);
    };
    const handleCorrectAnswerChange = (index: number, value: string) => {
        const newQuestions = [...questions];
        newQuestions[index].correctAnswer = value;
        setQuestions(newQuestions);
    };
    
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            try {
                const rows = text.split('\n').slice(1);
                const parsedQuestions: Question[] = rows.map((row): Question | null => {
                    const columns = row.split(',').map(c => c.trim().replace(/"/g, ''));
                    if (columns.length < 13) return null;
                    return {
                        question: { english: columns[0], hindi: columns[6] },
                        options: { 
                            english: [columns[1], columns[2], columns[3], columns[4]],
                            hindi: [columns[7], columns[8], columns[9], columns[10]]
                        },
                        correctAnswer: columns[12].toUpperCase(),
                        explanation: { english: columns[5] || '', hindi: columns[11] || '' },
                    };
                }).filter((q): q is Question => q !== null);
                
                setQuestions(prev => [...prev.filter(q => q.question.english.trim() !== ''), ...parsedQuestions]);
                showMessage(`${parsedQuestions.length} questions imported from CSV.`);
                setActiveInputMode('manual');
            } catch (error) {
                 showMessage('Failed to parse CSV file. Please check the format.', true);
            }
        };
        reader.readAsText(file);
    };

    const fileToGenerativePart = async (file: File) => {
        const base64EncodedDataPromise = new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => typeof reader.result === 'string' ? resolve(reader.result.split(',')[1]) : reject("File read error");
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
        });
        return { inlineData: { data: await base64EncodedDataPromise, mimeType: file.type } };
    };

    const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
            showMessage('Please upload a PDF or Word document.', true); return;
        }
        
        setIsGenerating(true);
        try {
            // FIX: Updated to use the new GoogleGenAI SDK format for document processing
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const documentPart = await fileToGenerativePart(file);
            const prompt = `You are an expert test creator. Analyze the provided document and generate ${docNumQuestions} multiple-choice questions based on its content. The difficulty level should be ${docDifficulty}. For each question, you must:
1.  Provide the question text, four options, the correct answer key ('A', 'B', 'C', or 'D'), and a detailed explanation.
2.  Translate all content (question, options, explanation) into both English and Hindi. If the source is already in one of these languages, translate it to the other.
3.  Format the output as a JSON array of objects. Each object must strictly follow this structure:
    - "question": { "english": "...", "hindi": "..." }
    - "options": { "english": ["...", "...", "...", "..."], "hindi": ["...", "...", "...", "..."] }
    - "correctAnswer": "A" (or "B", "C", "D")
    - "explanation": { "english": "...", "hindi": "..." }
4.  If you cannot generate questions from the content, return an empty array. Do not include any text outside of the JSON array.`;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-pro",
                contents: { parts: [documentPart, { text: prompt }] },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                question: { type: Type.OBJECT, properties: { english: { type: Type.STRING }, hindi: { type: Type.STRING }}, required: ['english', 'hindi'] },
                                options: { type: Type.OBJECT, properties: { english: { type: Type.ARRAY, items: { type: Type.STRING } }, hindi: { type: Type.ARRAY, items: { type: Type.STRING } }}, required: ['english', 'hindi'] },
                                correctAnswer: { type: Type.STRING },
                                explanation: { type: Type.OBJECT, properties: { english: { type: Type.STRING }, hindi: { type: Type.STRING }}, required: ['english', 'hindi'] }
                            },
                            required: ['question', 'options', 'correctAnswer', 'explanation']
                        }
                    }
                }
            });
            const parsedQuestions = JSON.parse(response.text) as Question[];

            if (parsedQuestions && parsedQuestions.length > 0) {
                setQuestions(prev => [...prev.filter(q => q.question.english.trim() !== ''), ...parsedQuestions]);
                showMessage(`${parsedQuestions.length} questions imported from the document.`);
                setActiveInputMode('manual');
            } else {
                showMessage('No questions could be extracted from the document.', true);
            }
        } catch (error) {
            console.error("Document Processing Error:", error);
            showMessage('Failed to process document. Please ensure it contains clear multiple-choice questions.', true);
        } finally {
            setIsGenerating(false);
            if (event.target) event.target.value = '';
        }
    };

    const handleSaveTest = async () => {
        if (!title.trim() || !sectionId) { showMessage('Title and Section are required.', true); return; }
        if (questions.some(q => !q.question.english.trim())) { showMessage('Please fill all question fields.', true); return; }
        
        setIsSubmitting(true);
        try {
            const sectionName = sections.find(s => s.id === sectionId)?.name || '';
            const testData = {
                title,
                currentAffairsSectionId: sectionId,
                currentAffairsSectionName: sectionName,
                questions,
                questionCount: questions.length,
                durationMinutes: questions.length,
                marksPerQuestion: 1,
                negativeMarking: 0,
                status: 'draft',
            };
            if (testIdToEdit) {
                await updateDoc(doc(db, 'tests', testIdToEdit), { ...testData, updatedAt: serverTimestamp() });
                showMessage('Test updated!');
            } else {
                await addDoc(collection(db, 'tests'), { ...testData, createdAt: serverTimestamp() });
                showMessage('Test saved as draft!');
            }
            onSaveComplete();
        } catch(e) { showMessage('Failed to save test.', true); } finally { setIsSubmitting(false); }
    };
    
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg space-y-6">
             <div className="flex justify-between items-start">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{testIdToEdit ? 'Edit Current Affairs Test' : 'New Current Affairs Test'}</h2>
                <button onClick={onSaveComplete} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200">
                    <ArrowLeft size={16} /> Back
                </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Test Title" className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"/>
                 <select value={sectionId} onChange={e => setSectionId(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                    <option value="">Select a Section...</option>
                    {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                 </select>
             </div>
             
            <div className="border-t dark:border-gray-700 pt-4">
                 <div className="flex border-b border-gray-200 dark:border-gray-700 -mx-6 px-2">
                    <TabButton label="Manual Entry" isActive={activeInputMode === 'manual'} onClick={() => setActiveInputMode('manual')} icon={Pencil} />
                    <TabButton label="AI by Topic" isActive={activeInputMode === 'ai_topic'} onClick={() => setActiveInputMode('ai_topic')} icon={Bot} />
                    <TabButton label="AI by Time" isActive={activeInputMode === 'ai_time'} onClick={() => setActiveInputMode('ai_time')} icon={Clock} />
                    <TabButton label="CSV Upload" isActive={activeInputMode === 'csv'} onClick={() => setActiveInputMode('csv')} icon={Upload} />
                    <TabButton label="Document Upload" isActive={activeInputMode === 'document'} onClick={() => setActiveInputMode('document')} icon={FileUp} />
                </div>
                <div className="pt-4 px-1">
                    {activeInputMode === 'manual' && (
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                             {questions.map((q, index) => (
                                <div key={index} className="border-b dark:border-gray-700 pb-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-semibold text-gray-800 dark:text-gray-200">Question {index + 1}</h4>
                                        <div className="flex items-center gap-2">
                                            <div className="inline-flex rounded-md shadow-sm">
                                                <button type="button" onClick={() => setManualInputLang('english')} className={`px-2 py-1 text-xs rounded-l-lg border ${manualInputLang === 'english' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800'}`}>EN</button>
                                                <button type="button" onClick={() => setManualInputLang('hindi')} className={`px-2 py-1 text-xs rounded-r-lg border ${manualInputLang === 'hindi' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800'}`}>HI</button>
                                            </div>
                                            <button onClick={() => removeQuestion(index)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                    <textarea value={q.question[manualInputLang]} onChange={e => handleQuestionChange(index, 'question', e.target.value)} placeholder={`Question (${manualInputLang})`} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"></textarea>
                                    {['A', 'B', 'C', 'D'].map((opt, optIndex) => (
                                        <input key={opt} type="text" value={q.options[manualInputLang][optIndex]} onChange={e => handleOptionChange(index, optIndex, e.target.value)} placeholder={`Option ${opt} (${manualInputLang})`} className="w-full p-2 border rounded-lg mt-1 dark:bg-gray-700 dark:border-gray-600" />
                                    ))}
                                    <select value={q.correctAnswer} onChange={e => handleCorrectAnswerChange(index, e.target.value)} className="p-2 border rounded-lg bg-white mt-2 dark:bg-gray-700 dark:border-gray-600">
                                        <option>A</option><option>B</option><option>C</option><option>D</option>
                                    </select>
                                    <textarea value={q.explanation?.[manualInputLang] || ''} onChange={e => handleQuestionChange(index, 'explanation', e.target.value)} placeholder={`Explanation (${manualInputLang})`} className="w-full p-2 border rounded-lg mt-1 dark:bg-gray-700 dark:border-gray-600" />
                                </div>
                            ))}
                            <button onClick={addQuestion} className="flex items-center gap-2 text-indigo-600 font-semibold"><PlusCircle size={18} /> Add Question</button>
                        </div>
                    )}
                    {(activeInputMode === 'ai_topic' || activeInputMode === 'ai_time') && (
                         <div className="space-y-4">
                             {activeInputMode === 'ai_topic' ? (
                                <input type="text" value={aiTopic} onChange={e => setAiTopic(e.target.value)} placeholder="Enter topic..." className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"/>
                             ) : (
                                <select value={aiTimePeriod} onChange={e => setAiTimePeriod(e.target.value)} className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600">
                                    <option>Daily (Yesterday)</option><option>Weekly (Last 7 days)</option><option>Monthly (Last 30 days)</option>
                                </select>
                             )}
                            <div className="grid grid-cols-2 gap-4">
                                <input type="number" value={aiNumQuestions} onChange={e => setAiNumQuestions(Number(e.target.value))} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                                <select value={aiDifficulty} onChange={e => setAiDifficulty(e.target.value)} className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600">
                                    <option>Easy</option><option>Medium</option><option>Hard</option>
                                </select>
                            </div>
                             <button onClick={() => handleGenerateAI(activeInputMode === 'ai_topic' ? 'topic' : 'time')} disabled={isGenerating} className="px-4 py-2 bg-purple-600 text-white rounded-lg flex items-center gap-2">{isGenerating ? <Loader2 className="animate-spin"/> : <Wand2/>} Generate & Review</button>
                        </div>
                    )}
                    {activeInputMode === 'csv' && (
                        <div className="p-4 space-y-4">
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Upload Questions from CSV</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Upload a CSV file with the headers: <code>question_english,optionA_english,optionB_english,optionC_english,optionD_english,explanation_english,question_hindi,optionA_hindi,optionB_hindi,optionC_hindi,optionD_hindi,explanation_hindi,correctAnswer</code>.
                            </p>
                            <input type="file" accept=".csv" onChange={handleFileUpload} className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900/50 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900"/>
                        </div>
                    )}
                    {activeInputMode === 'document' && (
                        <div className="p-4 space-y-4">
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Upload Test from Document</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Upload a PDF or Word document (.pdf, .doc, .docx). The AI will generate questions based on its content.
                            </p>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Number of Questions</label>
                                    <input type="number" value={docNumQuestions} onChange={e => setDocNumQuestions(Number(e.target.value))} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Difficulty</label>
                                    <select value={docDifficulty} onChange={e => setDocDifficulty(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                                        <option>Easy</option>
                                        <option>Medium</option>
                                        <option>Hard</option>
                                    </select>
                                </div>
                            </div>
                            {isGenerating ? (
                                <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
                                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-300">Processing document... this may take a moment.</p>
                                </div>
                            ) : (
                                <input 
                                    type="file" 
                                    accept=".pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                                    onChange={handleDocumentUpload} 
                                    className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900/50 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900"
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>

             <button onClick={handleSaveTest} disabled={isSubmitting} className="w-full mt-4 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 flex items-center justify-center gap-2">
                {isSubmitting ? <><Loader2 className="animate-spin" />Saving...</> : <><Save /> {testIdToEdit ? 'Save Changes' : 'Save as Draft'}</>}
             </button>

             {isReviewModalOpen && <Modal isOpen={isReviewModalOpen} onClose={() => setIsReviewModalOpen(false)} title="Review & Edit AI Questions" size="lg">
                <div className="flex justify-end mb-2">
                    <div className="inline-flex rounded-md shadow-sm">
                        <button type="button" onClick={() => setReviewModalLang('english')} className={`px-2 py-1 text-xs rounded-l-lg border ${reviewModalLang === 'english' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800'}`}>EN</button>
                        <button type="button" onClick={() => setReviewModalLang('hindi')} className={`px-2 py-1 text-xs rounded-r-lg border ${reviewModalLang === 'hindi' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800'}`}>HI</button>
                    </div>
                </div>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1 pr-4">
                    {aiGeneratedQuestions.map((q, index) => (
                        <div key={index} className="border p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 space-y-2">
                             <label className="text-xs font-bold">Q{index+1} ({reviewModalLang})</label>
                             <textarea value={q.question[reviewModalLang]} onChange={e => handleUpdateGeneratedQuestion(index, 'question', reviewModalLang, e.target.value)} className="w-full p-1 border rounded-md dark:bg-gray-800" />
                             {q.options[reviewModalLang].map((opt, i) => (
                                <input key={i} value={opt} onChange={e => handleUpdateGeneratedQuestion(index, 'options', reviewModalLang, e.target.value, i)} className="w-full p-1 border rounded-md dark:bg-gray-800" />
                             ))}
                             <select value={q.correctAnswer} onChange={e => handleUpdateGeneratedQuestion(index, 'correctAnswer', 'english', e.target.value)} className="p-1 border rounded-md bg-white dark:bg-gray-800">
                                <option>A</option><option>B</option><option>C</option><option>D</option>
                             </select>
                             <textarea value={q.explanation?.[reviewModalLang] || ''} onChange={e => handleUpdateGeneratedQuestion(index, 'explanation', reviewModalLang, e.target.value)} placeholder="Explanation" className="w-full p-1 border rounded-md dark:bg-gray-800" />
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t dark:border-gray-600">
                    <button onClick={() => setIsReviewModalOpen(false)} className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-lg font-semibold">Cancel</button>
                    <button onClick={handleAcceptAllAndClose} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold flex items-center gap-2"><Check/> Accept All & Close</button>
                </div>
             </Modal>}
        </div>
    );
};

const ViewCATests: React.FC<{onEditTest: (testId: string) => void, onAddNew: () => void}> = ({onEditTest, onAddNew}) => {
    const [tests, setTests] = useState<Test[]>([]);
    const [loading, setLoading] = useState(true);
    const [testToDelete, setTestToDelete] = useState<Test | null>(null);
    const [testToPreview, setTestToPreview] = useState<Test | null>(null);
    
    useEffect(() => {
        const q = query(collection(db, 'tests'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, snapshot => {
            const allTests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Test));
            setTests(allTests.filter(test => !!test.currentAffairsSectionId));
            setLoading(false);
        }, (error) => {
             console.error("Error fetching CA tests:", error);
             setLoading(false);
        });
        return unsubscribe;
    }, []);

    const confirmDelete = async () => {
        if (!testToDelete) return;
        await deleteDoc(doc(db, 'tests', testToDelete.id));
        showMessage('Test deleted!');
        setTestToDelete(null);
    };
    
    const togglePublishStatus = async (test: Test) => {
        const newStatus = test.status === 'published' ? 'draft' : 'published';
        await updateDoc(doc(db, 'tests', test.id), { status: newStatus });
        showMessage(`Status updated to ${newStatus}.`);
    };

    if (loading) return <SkeletonList />;
    
    return (
         <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
             <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">All Current Affairs Tests</h2>
            {tests.length === 0 ? (
                <div className="text-center py-10">
                    <p className="text-gray-500 dark:text-gray-400">No Current Affairs tests found.</p>
                    <button onClick={onAddNew} className="mt-4 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700">Add a new test</button>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr className="border-b dark:border-gray-700">
                                <th className="py-2 px-4 text-left text-xs font-medium uppercase text-gray-500">Title</th>
                                <th className="py-2 px-4 text-left text-xs font-medium uppercase text-gray-500">Section</th>
                                <th className="py-2 px-4 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                                <th className="py-2 px-4 text-left text-xs font-medium uppercase text-gray-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {tests.map(test => (
                                <tr key={test.id}>
                                    <td className="py-3 px-4 font-semibold text-gray-800 dark:text-gray-200">{test.title}</td>
                                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{test.currentAffairsSectionName}</td>
                                    <td className="py-3 px-4"><span className={`px-2 py-0.5 text-xs rounded-full ${test.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{test.status}</span></td>
                                    <td className="py-3 px-4 flex items-center gap-3 text-sm">
                                        <button onClick={() => togglePublishStatus(test)} className={`font-semibold ${test.status === 'published' ? 'text-yellow-600' : 'text-green-600'}`}>{test.status === 'published' ? 'Unpublish' : 'Publish'}</button>
                                        <button onClick={() => setTestToPreview(test)} className="text-blue-500" title="Preview Test"><Eye size={16}/></button>
                                        <button onClick={() => onEditTest(test.id)} className="text-indigo-500"><Pencil size={16}/></button>
                                        <button onClick={() => setTestToDelete(test)} className="text-red-500"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {testToDelete && <ConfirmModal isOpen={!!testToDelete} onClose={() => setTestToDelete(null)} onConfirm={confirmDelete} title="Delete Test" message={`Delete "${testToDelete.title}"?`} />}
            <TestPreviewModal isOpen={!!testToPreview} onClose={() => setTestToPreview(null)} test={testToPreview} />
        </div>
    );
};

export default ManageCurrentAffairs;