
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { Category, Test, Question, BilingualText, BilingualOptions } from '../../../types';
import { showMessage, formatFirebaseError } from '../../../utils/helpers';
// FIX: Import GoogleGenAI and Type for Gemini API usage
import { GoogleGenAI, Type } from "@google/genai";
import Modal from '../../modals/Modal';

import { FilePlus, PlusCircle, Trash2, Bot, Upload, Loader2, Wand2, Check, X, ArrowLeft, FileUp, Code, Copy, BookOpen } from 'lucide-react';

type QuestionInputMode = 'manual' | 'ai' | 'csv' | 'document' | 'ai_json';

interface ManageTestsProps {
    testIdToEdit: string | null;
    onSaveComplete: () => void;
}

const emptyQuestion: Question = {
    question: { english: '', hindi: '' },
    options: { english: ['', '', '', ''], hindi: ['', '', '', ''] },
    correctAnswer: 'A',
    explanation: { english: '', hindi: '' }
};

const ManageTests: React.FC<ManageTestsProps> = ({ testIdToEdit, onSaveComplete }) => {
    // Test Metadata State
    const [title, setTitle] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [durationMinutes, setDurationMinutes] = useState(60);
    const [marksPerQuestion, setMarksPerQuestion] = useState(1);
    const [negativeMarking, setNegativeMarking] = useState(0);
    const [section, setSection] = useState('');
    const [featured, setFeatured] = useState(false);

    // Categories for dropdown
    const [categories, setCategories] = useState<Category[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [availableSections, setAvailableSections] = useState<string[]>([]);

    // Questions State
    const [questions, setQuestions] = useState<Question[]>([JSON.parse(JSON.stringify(emptyQuestion))]);
    const [manualInputLang, setManualInputLang] = useState<'english' | 'hindi'>('english');

    // UI State
    const [activeTab, setActiveTab] = useState<QuestionInputMode>('manual');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingTestData, setIsLoadingTestData] = useState(false);
    
    // AI State
    const [aiTopic, setAiTopic] = useState('');
    const [aiNumQuestions, setAiNumQuestions] = useState(5);
    const [aiDifficulty, setAiDifficulty] = useState('Medium');
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<Question[]>([]);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [reviewModalLang, setReviewModalLang] = useState<'english' | 'hindi'>('english');
    const [geminiJson, setGeminiJson] = useState('');

    // Document Upload State
    const [docNumQuestions, setDocNumQuestions] = useState(10);
    const [docDifficulty, setDocDifficulty] = useState('Medium');

    useEffect(() => {
        const q = query(collection(db, 'testCategories'), orderBy('name'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const categoriesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
            setCategories(categoriesData);
            setLoadingCategories(false);
        }, (error) => {
            console.error("Error fetching categories:", error);
            showMessage(formatFirebaseError(error, "Error: Could not load categories."), true);
            setLoadingCategories(false);
        });
        return () => unsubscribe();
    }, []);
    
    useEffect(() => {
        const fetchTestForEdit = async () => {
            if (!testIdToEdit) {
                 setTitle('');
                 setCategoryId('');
                 setDurationMinutes(60);
                 setMarksPerQuestion(1);
                 setNegativeMarking(0);
                 setSection('');
                 setFeatured(false);
                 setQuestions([JSON.parse(JSON.stringify(emptyQuestion))]);
                return;
            }
            setIsLoadingTestData(true);
            try {
                const testDocRef = doc(db, 'tests', testIdToEdit);
                const testDoc = await getDoc(testDocRef);
                if (testDoc.exists()) {
                    const data = testDoc.data() as any;
                    setTitle(data.title);
                    setCategoryId(data.categoryId);
                    setDurationMinutes(data.durationMinutes);
                    setMarksPerQuestion(data.marksPerQuestion);
                    setNegativeMarking(data.negativeMarking);
                    setSection(data.section || '');
                    setFeatured(data.featured || false);
                    
                    // Backward compatibility for old test format
                    if (data.questions && typeof data.questions[0].question === 'string') {
                        const convertedQuestions: Question[] = data.questions.map((q: any) => ({
                            question: { english: q.question, hindi: '' },
                            options: { english: q.options, hindi: ['', '', '', ''] },
                            correctAnswer: q.correctAnswer,
                            explanation: { english: q.explanation || '', hindi: '' }
                        }));
                        setQuestions(convertedQuestions);
                    } else {
                        setQuestions(data.questions);
                    }
                } else {
                    showMessage('Test not found.', true);
                    onSaveComplete();
                }
            } catch (error) {
                showMessage(formatFirebaseError(error, 'Error loading test data.'), true);
            } finally {
                setIsLoadingTestData(false);
            }
        };
        fetchTestForEdit();
    }, [testIdToEdit, onSaveComplete]);
    
    useEffect(() => {
        setSection(''); // Reset on category change
        if (!categoryId) {
            setAvailableSections([]);
            return;
        }

        const currentCat = categories.find(c => c.id === categoryId);
        
        if (currentCat && currentCat.sections && currentCat.sections.length > 0) {
            setAvailableSections(currentCat.sections);
        } else {
            setAvailableSections([]);
        }

    }, [categoryId, categories]);

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
        const q = newQuestions[qIndex];
        if (!q.options) {
            q.options = { english: ['', '', '', ''], hindi: ['', '', '', ''] };
        }
        if (!q.options[manualInputLang]) {
            q.options[manualInputLang] = ['', '', '', ''];
        }
        newQuestions[qIndex].options[manualInputLang][oIndex] = value;
        setQuestions(newQuestions);
    };
    
    const handleCorrectAnswerChange = (index: number, value: string) => {
        const newQuestions = [...questions];
        newQuestions[index].correctAnswer = value;
        setQuestions(newQuestions);
    };

    const addQuestion = () => {
        setQuestions([...questions, JSON.parse(JSON.stringify(emptyQuestion))]);
    };

    const removeQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const handleGenerateAIQuestions = async () => {
        if (!aiTopic.trim()) {
            showMessage('Please enter a topic for AI generation.', true);
            return;
        }
        setIsGenerating(true);
        try {
            // FIX: Updated to use the new GoogleGenAI SDK format
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const prompt = `Generate ${aiNumQuestions} multiple-choice questions for a test on the topic "${aiTopic}". The difficulty level should be ${aiDifficulty}. For each question, provide the content in both English and Hindi.
The output should be a JSON array of objects, where each object has:
1.  "question": An object with "english" and "hindi" keys.
2.  "options": An object with "english" and "hindi" keys, each being an array of 4 strings.
3.  "correctAnswer": The correct option key ('A', 'B', 'C', or 'D').
4.  "explanation": An object with "english" and "hindi" keys.
Do not include any introductory text, just the JSON output.`;
            
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
            showMessage(`${generatedQs.length} questions generated. Please review them.`);

        } catch (error) {
            console.error("AI Generation Error:", error);
            showMessage(formatFirebaseError(error, 'Failed to generate questions. Please check the topic and try again.'), true);
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleParseFromJson = () => {
        if (!geminiJson.trim()) {
            showMessage('Please paste the JSON content.', true);
            return;
        }

        setIsGenerating(true); // Reuse for loading state
        try {
            const trimmedJson = geminiJson.trim();
            if (trimmedJson.startsWith('http://') || trimmedJson.startsWith('https://')) {
                showMessage('It looks like you pasted a URL. Please follow the steps to copy the JSON content directly.', true);
                setIsGenerating(false);
                return;
            }

            const data = JSON.parse(geminiJson);

            // Basic validation
            if (!Array.isArray(data) || data.length === 0 || !data[0].question || !data[0].options) {
                 throw new Error('Invalid JSON format. Expected an array of questions.');
            }
            
            const parsedQs = data as Question[];
            
            setAiGeneratedQuestions(parsedQs);
            setIsReviewModalOpen(true);
            showMessage(`${parsedQs.length} questions parsed. Please review them.`);

        } catch (error) {
            console.error("Parse from JSON Error:", error);
            let errorMessage = 'Failed to parse JSON. Please ensure you have copied the entire valid JSON array, starting with `[` and ending with `]`.';
            if (error instanceof Error && !error.message.includes('Unexpected token')) { // Don't show generic parse error details
                errorMessage += ` Details: ${error.message}`;
            }
            showMessage(errorMessage, true);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAcceptQuestion = (index: number) => {
        const questionToAccept = aiGeneratedQuestions[index];
        setQuestions([...questions.filter(q => q.question.english.trim() !== ''), questionToAccept]);
        setAiGeneratedQuestions(aiGeneratedQuestions.filter((_, i) => i !== index));
    };

    const handleDiscardQuestion = (index: number) => {
        setAiGeneratedQuestions(aiGeneratedQuestions.filter((_, i) => i !== index));
    };
    
    const handleAcceptAllAndClose = () => {
        setQuestions([...questions.filter(q => q.question.english.trim() !== ''), ...aiGeneratedQuestions]);
        handleCloseReviewModal();
    };

    const handleCloseReviewModal = () => {
        setAiGeneratedQuestions([]);
        setIsReviewModalOpen(false);
        setActiveTab('manual');
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
                
                setQuestions([...questions.filter(q => q.question.english.trim() !== ''), ...parsedQuestions]);

                showMessage(`${parsedQuestions.length} questions imported from CSV.`);
                setActiveTab('manual');
            } catch (error) {
                 showMessage('Failed to parse CSV file. Please check the format.', true);
            }
        };
        reader.readAsText(file);
    };
    
    const fileToGenerativePart = async (file: File) => {
        const base64EncodedDataPromise = new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === 'string') {
              resolve(reader.result.split(',')[1]);
            } else {
              reject(new Error("Failed to read file as data URL."));
            }
          };
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
        });
        const data = await base64EncodedDataPromise;
        return {
          inlineData: { data, mimeType: file.type },
        };
    };

    const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
            showMessage('Please upload a PDF or Word document.', true);
            return;
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
                setQuestions([...questions.filter(q => q.question.english.trim() !== ''), ...parsedQuestions]);
                showMessage(`${parsedQuestions.length} questions imported from the document.`);
                setActiveTab('manual');
            } else {
                showMessage('No questions could be extracted from the document.', true);
            }

        } catch (error) {
            console.error("Document Processing Error:", error);
            showMessage(formatFirebaseError(error, 'Failed to process document. Please ensure it contains clear multiple-choice questions.'), true);
        } finally {
            setIsGenerating(false);
            event.target.value = '';
        }
    };


    const handleSaveTest = async () => {
        if (!title.trim() || !categoryId) {
            showMessage('Please fill in the Test Title and select a Category.', true);
            return;
        }
        if (questions.some(q => !q.question.english.trim() || q.options.english.some(o => !o.trim()) || !q.question.hindi.trim() || q.options.hindi.some(o => !o.trim()) )) {
            showMessage('Please ensure all questions and options are filled out for both languages.', true);
            return;
        }
        setIsSubmitting(true);
        try {
            const categoryName = categories.find(c => c.id === categoryId)?.name || '';

            if (testIdToEdit) {
                 const testDocRef = doc(db, 'tests', testIdToEdit);
                 await updateDoc(testDocRef, {
                    title,
                    categoryId,
                    category: categoryName,
                    questionCount: questions.length,
                    durationMinutes: Number(durationMinutes),
                    marksPerQuestion: Number(marksPerQuestion),
                    negativeMarking: Number(negativeMarking),
                    questions,
                    section: section || '',
                    featured,
                    updatedAt: serverTimestamp()
                 });
                 showMessage('Test updated successfully!');
            } else {
                const testData: Omit<Test, 'id' | 'updatedAt'> = {
                    title,
                    categoryId,
                    category: categoryName,
                    questionCount: questions.length,
                    durationMinutes: Number(durationMinutes),
                    marksPerQuestion: Number(marksPerQuestion),
                    negativeMarking: Number(negativeMarking),
                    questions,
                    status: 'draft',
                    section: section || '',
                    featured,
                    createdAt: serverTimestamp() as any
                };
                await addDoc(collection(db, 'tests'), testData);
                showMessage('Test saved as draft successfully!');
            }
            onSaveComplete();
        } catch (error) {
            console.error("Error saving test:", error);
            showMessage(formatFirebaseError(error, 'Failed to save the test.'), true);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const renderTabContent = () => {
        switch (activeTab) {
            case 'ai':
                return (
                    <div className="p-4 space-y-4 border-t">
                         <h3 className="text-lg font-semibold text-gray-700">Generate Questions with AI</h3>
                         <div>
                            <label className="block text-sm font-medium mb-1">Topic</label>
                            <input type="text" value={aiTopic} onChange={e => setAiTopic(e.target.value)} placeholder="e.g., World History, JavaScript Basics" className="w-full p-2 border border-gray-300 rounded-lg" />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Number of Questions</label>
                                <input type="number" value={aiNumQuestions} onChange={e => setAiNumQuestions(Number(e.target.value))} className="w-full p-2 border border-gray-300 rounded-lg" />
                            </div>
                             <div>
                                <label className="block text-sm font-medium mb-1">Difficulty</label>
                                <select value={aiDifficulty} onChange={e => setAiDifficulty(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg bg-white">
                                    <option>Easy</option>
                                    <option>Medium</option>
                                    <option>Hard</option>
                                </select>
                            </div>
                         </div>
                         <button onClick={handleGenerateAIQuestions} disabled={isGenerating} className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:bg-purple-400">
                            {isGenerating ? <><Loader2 className="animate-spin" size={20}/> Generating...</> : <><Wand2 size={18}/> Generate & Review</>}
                         </button>
                    </div>
                );
            case 'csv':
                 return (
                    <div className="p-4 space-y-4 border-t">
                        <h3 className="text-lg font-semibold text-gray-700">Upload Questions from CSV</h3>
                        <p className="text-sm text-gray-500">
                            Upload a CSV file with the headers: <code>question_english,optionA_english,optionB_english,optionC_english,optionD_english,explanation_english,question_hindi,optionA_hindi,optionB_hindi,optionC_hindi,optionD_hindi,explanation_hindi,correctAnswer</code>.
                            The <code>correctAnswer</code> should be 'A', 'B', 'C', or 'D'.
                        </p>
                        <input type="file" accept=".csv" onChange={handleFileUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                    </div>
                );
            case 'document':
                return (
                    <div className="p-4 space-y-4 border-t">
                        <h3 className="text-lg font-semibold text-gray-700">Upload Test from Document</h3>
                        <p className="text-sm text-gray-500">
                            Upload a PDF or Word document (.pdf, .doc, .docx). The AI will generate questions based on its content.
                        </p>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Number of Questions</label>
                                <input type="number" value={docNumQuestions} onChange={e => setDocNumQuestions(Number(e.target.value))} className="w-full p-2 border border-gray-300 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Difficulty</label>
                                <select value={docDifficulty} onChange={e => setDocDifficulty(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg bg-white">
                                    <option>Easy</option>
                                    <option>Medium</option>
                                    <option>Hard</option>
                                </select>
                            </div>
                        </div>
                        {isGenerating ? (
                             <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg">
                                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                                <p className="mt-2 text-sm text-gray-500">Processing document... this may take some time.</p>
                            </div>
                        ) : (
                            <input 
                                type="file" 
                                accept=".pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                                onChange={handleDocumentUpload} 
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                            />
                        )}
                    </div>
                );
            case 'ai_json':
                return (
                    <div className="p-4 space-y-4 border-t">
                        <h3 className="text-lg font-semibold text-gray-700">Import from Gemini Quiz JSON</h3>
                        <div className="p-4 bg-indigo-50 border-l-4 border-indigo-400 text-indigo-800 rounded-r-lg">
                            <h4 className="font-bold mb-2 flex items-center gap-2"><BookOpen size={18} /> How to get the JSON:</h4>
                            <ol className="list-decimal list-inside text-sm space-y-1">
                                <li>Open your Gemini share link in a new browser tab.</li>
                                <li>Find the code block containing the quiz questions.</li>
                                <li>Click the 'Copy' icon <Copy size={14} className="inline-block -mt-1 mx-1" /> on the code block.</li>
                                <li>Paste the copied content into the text area below.</li>
                            </ol>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Gemini Quiz JSON</label>
                            <textarea 
                                value={geminiJson} 
                                onChange={e => setGeminiJson(e.target.value)} 
                                placeholder='[ { "question": { "english": "...", "hindi": "..." }, ... } ]'
                                className="w-full h-40 p-2 border border-gray-300 rounded-lg font-mono text-xs" 
                            />
                        </div>
                        <button 
                            onClick={handleParseFromJson} 
                            disabled={isGenerating} 
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
                        >
                            {isGenerating ? <><Loader2 className="animate-spin" size={20}/> Parsing...</> : <>Parse & Review</>}
                        </button>
                    </div>
                );
            case 'manual':
            default:
                return (
                     <div className="space-y-4 border-t pt-4">
                        {questions.map((q, index) => (
                            <div key={index} className="border-b pb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold">Question {index + 1}</h4>
                                    <div className="flex items-center gap-4">
                                        <div className="inline-flex rounded-md shadow-sm">
                                            <button type="button" onClick={() => setManualInputLang('english')} className={`px-3 py-1 text-sm font-medium rounded-l-lg border ${manualInputLang === 'english' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>English</button>
                                            <button type="button" onClick={() => setManualInputLang('hindi')} className={`px-3 py-1 text-sm font-medium rounded-r-lg border ${manualInputLang === 'hindi' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>Hindi</button>
                                        </div>
                                        {questions.length > 1 && <button onClick={() => removeQuestion(index)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={18} /></button>}
                                    </div>
                                </div>
                                <textarea value={q.question[manualInputLang]} onChange={e => handleQuestionChange(index, 'question', e.target.value)} placeholder={`Question text (${manualInputLang})...`} className="w-full p-2 border border-gray-300 rounded-lg mb-2"></textarea>
                                {(q.options?.[manualInputLang] || ['', '', '', '']).map((_, optIndex) => (
                                     <div key={optIndex} className="flex items-center gap-2 mb-2">
                                        <span className="font-bold">{String.fromCharCode(65 + optIndex)}</span>
                                        <input type="text" value={q.options?.[manualInputLang]?.[optIndex] || ''} onChange={e => handleOptionChange(index, optIndex, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + optIndex)} (${manualInputLang})`} className="w-full p-2 border border-gray-300 rounded-lg" />
                                     </div>
                                ))}
                                <div className="mt-2">
                                     <label className="block text-sm font-medium mb-1">Correct Answer</label>
                                     <select value={q.correctAnswer} onChange={e => handleCorrectAnswerChange(index, e.target.value)} className="p-2 border border-gray-300 rounded-lg bg-white">
                                         <option>A</option><option>B</option><option>C</option><option>D</option>
                                     </select>
                                </div>
                                <textarea value={q.explanation ? q.explanation[manualInputLang] : ''} onChange={e => handleQuestionChange(index, 'explanation', e.target.value)} placeholder={`Explanation (${manualInputLang}, optional)...`} className="w-full p-2 border border-gray-300 rounded-lg mt-2"></textarea>
                            </div>
                        ))}
                        <button onClick={addQuestion} className="flex items-center gap-2 text-indigo-600 font-semibold">
                            <PlusCircle size={18} /> Add Another Question
                        </button>
                    </div>
                )
        }
    };
    
    const TabButton = ({ mode, label, icon: Icon }: { mode: QuestionInputMode; label: string; icon: React.ElementType }) => (
        <button
            onClick={() => setActiveTab(mode)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 ${activeTab === mode ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
            <Icon size={16} /> {label}
        </button>
    );
    
    if (isLoadingTestData) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="bg-white p-6 rounded-xl shadow-lg h-64">
                    <div className="h-8 w-1/3 bg-gray-200 rounded mb-6"></div>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="h-14 bg-gray-200 rounded-lg"></div>
                            <div className="h-14 bg-gray-200 rounded-lg"></div>
                            <div className="h-14 bg-gray-200 rounded-lg"></div>
                            <div className="h-14 bg-gray-200 rounded-lg"></div>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg h-96"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-start mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3"><FilePlus /> {testIdToEdit ? 'Edit Test' : 'Create a New Test'}</h2>
                    <button onClick={onSaveComplete} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-800 font-semibold rounded-lg hover:bg-gray-200 transition-all">
                        <ArrowLeft size={18} /> Back to All Tests
                    </button>
                </div>
                <fieldset className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Test Title</label>
                            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Category</label>
                            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg bg-white" disabled={loadingCategories}>
                                <option value="">{loadingCategories ? 'Loading...' : 'Select Category...'}</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        {availableSections.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium mb-1">Section (Optional)</label>
                                <select value={section} onChange={e => setSection(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg bg-white">
                                    <option value="">Select Section...</option>
                                    {availableSections.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium mb-1">Duration (Minutes)</label>
                            <input type="number" value={durationMinutes} onChange={e => setDurationMinutes(Number(e.target.value))} className="w-full p-2 border border-gray-300 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Marks per Question</label>
                            <input type="number" step="0.5" value={marksPerQuestion} onChange={e => setMarksPerQuestion(Number(e.target.value))} className="w-full p-2 border border-gray-300 rounded-lg" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium mb-1">Negative Marking (per wrong answer)</label>
                            <input type="number" step="0.25" value={negativeMarking} onChange={e => setNegativeMarking(Number(e.target.value))} className="w-full p-2 border border-gray-300 rounded-lg" />
                        </div>
                    </div>
                </fieldset>
                <div className="mt-4 flex items-center">
                    <input
                        id="featured-test"
                        type="checkbox"
                        checked={featured}
                        onChange={(e) => setFeatured(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="featured-test" className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Mark this test as "Featured" to highlight it on the homepage.
                    </label>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Test Questions</h3>
                <div className="flex border-b mb-4 flex-wrap">
                    <TabButton mode="manual" label="Manual Entry" icon={PlusCircle} />
                    <TabButton mode="ai" label="AI Generation" icon={Bot} />
                    <TabButton mode="csv" label="Upload CSV" icon={Upload} />
                    <TabButton mode="document" label="From Document" icon={FileUp} />
                    <TabButton mode="ai_json" label="From Gemini JSON" icon={Code} />
                </div>
                {renderTabContent()}
            </div>
            
            <button onClick={handleSaveTest} disabled={isSubmitting} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 flex items-center justify-center gap-2">
                {isSubmitting && <Loader2 className="animate-spin" />}
                {isSubmitting ? 'Saving...' : (testIdToEdit ? 'Save Changes' : 'Save as Draft')}
            </button>
            
            <Modal isOpen={isReviewModalOpen} onClose={handleCloseReviewModal} title={`Reviewing ${aiGeneratedQuestions.length} AI-Generated Questions`} size="lg">
                <div className="flex justify-end mb-2">
                    <div className="inline-flex rounded-md shadow-sm">
                        <button type="button" onClick={() => setReviewModalLang('english')} className={`px-3 py-1 text-sm font-medium rounded-l-lg border ${reviewModalLang === 'english' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>English</button>
                        <button type="button" onClick={() => setReviewModalLang('hindi')} className={`px-3 py-1 text-sm font-medium rounded-r-lg border ${reviewModalLang === 'hindi' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>Hindi</button>
                    </div>
                </div>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1 pr-4">
                    {aiGeneratedQuestions.length === 0 && <p className="text-gray-500 text-center py-8">All questions have been reviewed.</p>}
                    {aiGeneratedQuestions.map((q, index) => (
                        <div key={index} className="border p-4 rounded-lg bg-gray-50/50">
                            <p className="font-semibold text-gray-800">{index + 1}. {q.question[reviewModalLang]}</p>
                            <div className="mt-2 space-y-1 pl-4">
                                {(q.options?.[reviewModalLang] || []).map((opt, i) => (
                                    <p key={i} className={`text-sm ${String.fromCharCode(65 + i) === q.correctAnswer ? 'text-green-700 font-bold' : 'text-gray-600'}`}>
                                        {String.fromCharCode(65 + i)}. {opt}
                                    </p>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-2"><b>Explanation:</b> {q.explanation?.[reviewModalLang]}</p>
                            <div className="flex justify-end gap-2 mt-3">
                                <button onClick={() => handleDiscardQuestion(index)} className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-md hover:bg-red-200 flex items-center gap-1">
                                    <X size={14} /> Discard
                                </button>
                                <button onClick={() => handleAcceptQuestion(index)} className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-md hover:bg-green-200 flex items-center gap-1">
                                    <Check size={14} /> Accept
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                    <button type="button" onClick={handleCloseReviewModal} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">Discard All & Close</button>
                    <button type="button" onClick={handleAcceptAllAndClose} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700">
                        Accept All & Close
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default ManageTests;
