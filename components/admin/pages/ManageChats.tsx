import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { ChatSession, ChatMessage } from '../../../types';
import { showMessage, formatRelativeTime, formatFirebaseError } from '../../../utils/helpers';
import { MessageSquare, ArrowLeft, Send, Loader2, Circle } from 'lucide-react';
import SkeletonList from '../../skeletons/SkeletonList';

const ManageChats: React.FC = () => {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(true);
    const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [reply, setReply] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const q = query(collection(db, 'chats'), orderBy('lastMessageAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const sessionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatSession));
            setSessions(sessionsData);
            setLoadingSessions(false);
        }, (error) => {
            console.error("Error fetching chat sessions:", error);
            showMessage(formatFirebaseError(error, "Error: Could not load chat sessions."), true);
            setLoadingSessions(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (selectedSession) {
            setLoadingMessages(true);
            const q = query(collection(db, `chats/${selectedSession.id}/messages`), orderBy('createdAt'));
            const unsubscribe = onSnapshot(q, snapshot => {
                setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)));
                setLoadingMessages(false);
            }, (error) => {
                console.error("Error fetching chat messages for session:", error);
                showMessage(formatFirebaseError(error, "Error: Could not load chat messages for this session."), true);
                setLoadingMessages(false);
            });
            return () => unsubscribe();
        }
    }, [selectedSession]);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSelectSession = async (session: ChatSession) => {
        setSelectedSession(session);
        if (!session.isReadByAdmin) {
            try {
                await updateDoc(doc(db, 'chats', session.id), { isReadByAdmin: true });
            } catch (error) {
                console.error("Error marking session as read:", error);
                showMessage(formatFirebaseError(error, "Error: Could not mark chat session as read."), true);
            }
        }
    };
    
    const handleSendReply = async () => {
        if (!reply.trim() || !selectedSession) return;
        setIsSending(true);
        const text = reply.trim();
        setReply('');

        try {
            // Add message to subcollection
            await addDoc(collection(db, `chats/${selectedSession.id}/messages`), {
                text,
                senderId: 'admin',
                senderName: 'Admin',
                createdAt: serverTimestamp(),
            });

            // Update parent session doc
            await updateDoc(doc(db, 'chats', selectedSession.id), {
                lastMessage: text,
                lastMessageAt: serverTimestamp(),
            });
            
            // Send notification to user
            await addDoc(collection(db, 'users', selectedSession.id, 'notifications'), {
                type: 'chat_reply',
                message: `An admin has sent you a message.`,
                link: 'chat', // A generic link to trigger opening the modal
                createdAt: serverTimestamp(),
                isRead: false,
            });

        } catch (error) {
            console.error(error);
            showMessage(formatFirebaseError(error, "Failed to send reply."), true);
            setReply(text);
        } finally {
            setIsSending(false);
        }
    };

    if (selectedSession) {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg h-[80vh] flex flex-col">
                <div className="flex items-center gap-4 border-b dark:border-gray-700 pb-4 mb-4">
                    <button onClick={() => setSelectedSession(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><ArrowLeft /></button>
                    <div>
                        <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">{selectedSession.userName}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{selectedSession.userEmail}</p>
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg pretty-scrollbar">
                    {loadingMessages ? <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-indigo-500" /></div> :
                        messages.map(msg => (
                            <div key={msg.id} className={`flex items-end gap-2 ${msg.senderId === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-lg p-3 rounded-xl ${msg.senderId === 'admin' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-600 shadow-sm'}`}>
                                    <p className="text-sm">{msg.text}</p>
                                    <p className={`text-xs mt-1 opacity-70 ${msg.senderId === 'admin' ? 'text-right' : 'text-left'}`}>
                                        {msg.createdAt ? formatRelativeTime(msg.createdAt) : 'sending...'}
                                    </p>
                                </div>
                            </div>
                        ))
                    }
                     <div ref={messagesEndRef} />
                </div>
                <div className="mt-4 flex items-center gap-2">
                    <input type="text" value={reply} onChange={e => setReply(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendReply()} placeholder="Type your reply..." className="flex-grow p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700" />
                    <button onClick={handleSendReply} disabled={isSending || !reply.trim()} className="p-3 bg-indigo-600 text-white rounded-lg disabled:bg-indigo-400"><Send /></button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-3"><MessageSquare /> User Chats</h2>
            {loadingSessions ? <SkeletonList items={5} /> :
                <div className="space-y-2">
                    {sessions.length === 0 && <p className="text-center text-gray-500 py-8">No user chats have been started yet.</p>}
                    {sessions.map(session => (
                        <button key={session.id} onClick={() => handleSelectSession(session)} className="w-full text-left p-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border dark:border-gray-700 flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-gray-800 dark:text-gray-100">{session.userName} <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">({session.userEmail})</span></p>
                                <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{session.lastMessage}</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatRelativeTime(session.lastMessageAt)}</p>
                            </div>
                            {!session.isReadByAdmin && <Circle className="w-3 h-3 text-blue-500 fill-current" />}
                        </button>
                    ))}
                </div>
            }
        </div>
    );
};
export default ManageChats;