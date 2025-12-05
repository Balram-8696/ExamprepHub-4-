import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase';
// FIX: Import GoogleGenAI and Type for Gemini API usage
import { GoogleGenAI, Type } from "@google/genai";
import { showMessage } from '../../../utils/helpers';
import { Wand2, Loader2, Eye, Save, Trash2 } from 'lucide-react';

// A static, simplified component to preview the generated styles on.
// This mimics the basic structure of the homepage.
const PreviewComponent = () => (
    <div className="bg-slate-100 p-4 font-sans">
        <header className="bg-white shadow-md mb-4 p-4 rounded-lg">
            <h1 className="text-2xl font-extrabold text-indigo-700">Exam<span className="text-gray-900">Hub</span></h1>
        </header>
        <div className="bg-white p-6 rounded-xl shadow-lg text-center border-t-4 border-indigo-500">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Master Your Exams</h1>
            <p className="text-lg text-gray-600">Prepare effectively with high-quality online mock tests.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex flex-col">
                <h3 className="text-xl font-semibold mb-2">Sample Test</h3>
                <p className="text-gray-500 text-sm mb-4">10 questions | 15 mins</p>
                <button className="w-full mt-auto py-2.5 px-4 bg-indigo-600 text-white font-semibold rounded-lg shadow-md">Attempt Now</button>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex flex-col">
                <h3 className="text-xl font-semibold mb-2">Another Test</h3>
                <p className="text-gray-500 text-sm mb-4">20 questions | 30 mins</p>
                <button className="w-full mt-auto py-2.5 px-4 bg-indigo-600 text-white font-semibold rounded-lg shadow-md">Attempt Now</button>
            </div>
        </div>
    </div>
);


export default function AIUIEditor() {
    const [prompt, setPrompt] = useState('');
    const [generatedCss, setGeneratedCss] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const PREVIEW_STYLE_ID = 'ai-preview-styles';

    // Effect for cleaning up the preview style tag when the component unmounts.
    useEffect(() => {
        return () => {
            removePreviewStyles();
        };
    }, []);

    const removePreviewStyles = () => {
        const styleTag = document.getElementById(PREVIEW_STYLE_ID);
        if (styleTag) {
            styleTag.remove();
        }
    };

    const applyPreviewStyles = (css: string) => {
        removePreviewStyles(); // Remove old one first
        const styleTag = document.createElement('style');
        styleTag.id = PREVIEW_STYLE_ID;
        styleTag.innerHTML = css;
        document.head.appendChild(styleTag);
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            showMessage('Please enter a description of the UI changes.', true);
            return;
        }
        setIsLoading(true);
        setGeneratedCss(null);
        removePreviewStyles();

        try {
            // FIX: Updated to use the new GoogleGenAI SDK format
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const modelPrompt = `
You are an expert front-end developer specializing in CSS. Your task is to generate CSS code to customize a web application's preview. The user will provide a prompt describing the desired visual changes. You must return only a JSON object with a single key "css", containing a string of the generated CSS code.

IMPORTANT: All CSS selectors you generate MUST be prefixed with the ID '#preview-area' to scope them correctly. For example, if you want to change the primary button color, you would write '#preview-area .bg-indigo-600 { ... }'. To change the main background, target '#preview-area .bg-slate-100 { ... }'. Do NOT target the 'body' or 'html' tags directly.

The preview component's structure is based on Tailwind CSS. Key classes to target are:
- Main background: '.bg-slate-100'
- Headers, cards, etc.: '.bg-white'
- Primary buttons: '.bg-indigo-600'
- Primary text/borders: '.text-indigo-700', '.border-indigo-500'
- General text: '.text-gray-900', '.text-gray-600'

Based on the user's prompt, generate CSS rules that will override these default Tailwind styles to achieve the desired look and feel. Do not include any explanations or markdown formatting. Only provide the JSON object.

User's prompt: "${prompt}"
`;
            
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: modelPrompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            css: { type: Type.STRING }
                        },
                        required: ['css']
                    }
                }
            });

            let css = '';
            try {
                const textResponse = response.text.trim();
                let resultJson;

                try {
                    resultJson = JSON.parse(textResponse);
                } catch (parseError) {
                    const jsonMatch = textResponse.match(/{[\s\S]*}/);
                    if (jsonMatch) {
                        resultJson = JSON.parse(jsonMatch[0]);
                    } else {
                        throw new Error("No JSON object found in response.");
                    }
                }

                if (resultJson && typeof resultJson.css === 'string' && resultJson.css.trim() !== '') {
                    css = resultJson.css;
                }
            } catch (e) {
                console.error("Failed to parse AI response:", e, "Raw response text:", response.text);
            }

            if (css) {
                setGeneratedCss(css);
                applyPreviewStyles(css);
                showMessage('Preview generated successfully!');
            } else {
                throw new Error("AI did not return valid CSS.");
            }

        } catch (error) {
            console.error("AI UI Generation Error:", error);
            showMessage('Failed to generate UI changes. The AI did not return a valid theme. Please try rephrasing your prompt.', true);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApplyChanges = async () => {
        if (!generatedCss) {
            showMessage('No changes to apply. Please generate a preview first.', true);
            return;
        }
        setIsSaving(true);
        try {
            const stylesDocRef = doc(db, 'uiSettings', 'dynamicStyles');
            await setDoc(stylesDocRef, { css: generatedCss, updatedAt: serverTimestamp() });
            showMessage('UI changes applied successfully! The new styles are now live for all users.');
        } catch (error) {
            showMessage('Failed to apply changes.', true);
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDiscardChanges = () => {
        setGeneratedCss(null);
        removePreviewStyles();
        showMessage('Preview changes have been discarded.');
    };

    return (
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-indigo-500">
                <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                    <Wand2 size={32} /> AI UI Editor
                </h1>
                <p className="text-gray-600 mt-2">Describe the look and feel you want, and let AI generate the theme. Changes will be applied site-wide for all users.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Control Panel */}
                <div className="bg-white p-6 rounded-xl shadow-lg space-y-4">
                    <h2 className="text-xl font-bold">1. Describe Your Desired UI</h2>
                    <textarea
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        rows={6}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400"
                        placeholder="e.g., 'Make the theme dark with green accents. Use a modern, rounded style for buttons and cards.'"
                    />
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 flex items-center justify-center gap-2"
                    >
                        {isLoading ? <><Loader2 className="animate-spin" /> Generating...</> : <><Eye /> Generate Preview</>}
                    </button>
                    {generatedCss && (
                         <div className="border-t pt-4 space-y-2">
                             <h2 className="text-xl font-bold">2. Review and Apply</h2>
                             <p className="text-sm text-gray-500">The preview on the right has been updated. If you like it, apply the changes to make them live.</p>
                             <div className="flex gap-4">
                                <button
                                    onClick={handleApplyChanges}
                                    disabled={isSaving}
                                    className="flex-1 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-green-400 flex items-center justify-center gap-2"
                                >
                                    {isSaving ? <><Loader2 className="animate-spin" /> Applying...</> : <><Save /> Apply Changes</>}
                                </button>
                                 <button
                                    onClick={handleDiscardChanges}
                                    className="flex-1 py-3 bg-gray-200 text-gray-800 font-bold rounded-lg hover:bg-gray-300 flex items-center justify-center gap-2"
                                >
                                    <Trash2 /> Discard
                                </button>
                             </div>
                         </div>
                    )}
                </div>

                {/* Preview Panel */}
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h2 className="text-xl font-bold mb-4">Live Preview</h2>
                    <div className="border rounded-lg overflow-hidden bg-gray-200">
                        <div className="p-2 bg-gray-100 border-b text-xs text-gray-500">
                           This is a simplified preview of the homepage with the generated styles applied.
                        </div>
                        <div id="preview-area" className="transform scale-[0.9] origin-top-left" style={{ height: '450px', width: '111%' }}>
                            <PreviewComponent />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};