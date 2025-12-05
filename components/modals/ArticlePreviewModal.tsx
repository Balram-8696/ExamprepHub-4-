
import React from 'react';
import Modal from './Modal';
import UpdateArticleView from '../pages/UpdateArticleView';
import { UpdateArticle, Test, UserResult } from '../../types';
import { showMessage } from '../../utils/helpers';

interface ArticlePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    article: UpdateArticle | null;
}

const ArticlePreviewModal: React.FC<ArticlePreviewModalProps> = ({ isOpen, onClose, article }) => {
    if (!isOpen || !article) {
        return null;
    }

    // Dummy functions for preview mode to disable interactive elements
    const dummyOnNavigate = (view: string) => showMessage(`Navigation to ${view} is disabled in preview.`, true);
    const dummyOnPageLoad = (title: string) => console.log(`Previewing article: ${title}`);
    const dummyOnInitiateTestView = (details: { test: Test; action: 'resume' | 'result'; resultData?: UserResult, language: 'english' | 'hindi' }) => showMessage(`Test actions are disabled in preview.`, true);
    const dummyOnShowInstructions = (test: Test) => showMessage(`Instructions for test '${test.title}' are disabled in preview.`, true);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Preview: ${article.title}`} size="lg">
            <div className="max-h-[80vh] overflow-y-auto pretty-scrollbar -mr-4 pr-4">
                <UpdateArticleView
                    slug={article.slug} // Still provide slug for UpdateArticleView's own logic, though 'article' prop will take precedence
                    article={article} // Pass the full article object directly
                    onNavigate={dummyOnNavigate}
                    onPageLoad={dummyOnPageLoad}
                    onInitiateTestView={dummyOnInitiateTestView}
                    onShowInstructions={dummyOnShowInstructions}
                />
            </div>
        </Modal>
    );
};

export default ArticlePreviewModal;