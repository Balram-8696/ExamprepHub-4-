
import React, { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Bold, Italic, Link, Unlink } from 'lucide-react';
import Modal from '../../components/modals/Modal';
import { showMessage } from '../../utils/helpers';

interface RichTextEditorProps {
    value: string;
    onChange: (newValue: string) => void;
    placeholder?: string;
    className?: string;
    allowedFormats?: ('bold' | 'italic' | 'link')[]; // Removed heading formats as they are block types
    minHeight?: string;
}

export interface RichTextEditorRef {
    insertHTML: (html: string) => void;
}

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(({
    value,
    onChange,
    placeholder = 'Start typing...',
    className,
    allowedFormats = ['bold', 'italic', 'link'], // Default for generic text
    minHeight = '100px',
}, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [selection, setSelection] = useState<Selection | null>(null);

    // Sync external value with contentEditable div
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value;
        }
    }, [value]);

    const handleInput = useCallback(() => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    }, [onChange]);

    const applyFormat = useCallback((command: string, value: string | null = null) => {
        // Save current selection before execCommand
        const currentSelection = window.getSelection();
        const currentRange = currentSelection?.rangeCount ? currentSelection.getRangeAt(0) : null;

        document.execCommand(command, false, value);

        // Restore selection after execCommand to keep focus and cursor position
        if (currentSelection && currentRange) {
            currentSelection.removeAllRanges();
            currentSelection.addRange(currentRange);
        }
        
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    }, [onChange]);

    const handleBold = () => applyFormat('bold');
    const handleItalic = () => applyFormat('italic');

    const handleLinkClick = () => {
        const currentSelection = window.getSelection();
        if (currentSelection && !currentSelection.isCollapsed) {
            setSelection(currentSelection);
            const anchorNode = currentSelection.anchorNode?.parentElement;
            if (anchorNode?.tagName === 'A') {
                setLinkUrl(anchorNode.getAttribute('href') || '');
            } else {
                setLinkUrl('');
            }
            setIsLinkModalOpen(true);
        } else {
            showMessage('Please select text to add a link.', true);
        }
    };

    const handleInsertLink = () => {
        if (selection && editorRef.current) {
            // Restore selection
            const tempRange = document.createRange();
            tempRange.setStart(selection.anchorNode!, selection.anchorOffset);
            tempRange.setEnd(selection.focusNode!, selection.focusOffset);
            
            const currentSelection = window.getSelection();
            if (currentSelection) {
                currentSelection.removeAllRanges();
                currentSelection.addRange(tempRange);
            }
            
            applyFormat('createLink', linkUrl);
        }
        setIsLinkModalOpen(false);
        setLinkUrl('');
    };

    const handleUnlink = () => applyFormat('unlink');
    
    // Imperative handle to allow parent to insert HTML
    useImperativeHandle(ref, () => ({
        insertHTML: (html: string) => {
            if (editorRef.current) {
                editorRef.current.focus();
                const sel = window.getSelection();
                if (sel && sel.rangeCount > 0) {
                    const range = sel.getRangeAt(0);
                    range.deleteContents();
                    const el = document.createElement('div');
                    el.innerHTML = html;
                    const frag = document.createDocumentFragment();
                    let node;
                    while ((node = el.firstChild)) {
                        frag.appendChild(node);
                    }
                    range.insertNode(frag);
                    range.setStartAfter(frag);
                    sel.removeAllRanges();
                    sel.addRange(range);
                } else {
                    editorRef.current.innerHTML += html;
                }
                onChange(editorRef.current.innerHTML);
            }
        }
    }));


    const ToolbarButton: React.FC<{ command: 'bold' | 'italic' | 'link' | 'unlink'; icon: React.ElementType; label: string; onClick: () => void; isActive?: boolean }> = ({ command, icon: Icon, label, onClick, isActive }) => (
        <button
            type="button"
            onClick={onClick}
            title={label}
            className={`p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 ${isActive ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
            aria-label={label}
        >
            <Icon size={18} />
        </button>
    );

    return (
        <div className={`border dark:border-gray-600 rounded-lg shadow-sm ${className || ''}`}>
            <div className="flex items-center gap-1 p-2 bg-gray-100 dark:bg-gray-700 border-b dark:border-gray-600 rounded-t-lg">
                {allowedFormats.includes('bold') && <ToolbarButton command="bold" icon={Bold} label="Bold" onClick={handleBold} />}
                {allowedFormats.includes('italic') && <ToolbarButton command="italic" icon={Italic} label="Italic" onClick={handleItalic} />}
                {allowedFormats.includes('link') && (
                    <>
                        <ToolbarButton command="link" icon={Link} label="Add Link" onClick={handleLinkClick} />
                        <ToolbarButton command="unlink" icon={Unlink} label="Remove Link" onClick={handleUnlink} />
                    </>
                )}
            </div>
            <div
                ref={editorRef}
                contentEditable="true"
                suppressContentEditableWarning
                onInput={handleInput}
                onBlur={handleInput} // Ensure value is updated on blur too
                className="prose prose-sm dark:prose-invert max-w-none p-3 focus:outline-none dark:text-gray-100 text-gray-800 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none empty:before:block"
                style={{ minHeight }}
                data-placeholder={placeholder}
                role="textbox"
                aria-multiline="true"
                aria-placeholder={placeholder}
            />

            {isLinkModalOpen && (
                <Modal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} title="Insert Link">
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="link-url" className="block text-sm font-medium mb-1 dark:text-gray-300">URL</label>
                            <input
                                type="url"
                                id="link-url"
                                value={linkUrl}
                                onChange={e => setLinkUrl(e.target.value)}
                                placeholder="https://example.com"
                                className="w-full p-2 border dark:border-gray-600 rounded-md dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                required
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setIsLinkModalOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-lg">Cancel</button>
                            <button type="button" onClick={handleInsertLink} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg">Insert</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
});

export default RichTextEditor;