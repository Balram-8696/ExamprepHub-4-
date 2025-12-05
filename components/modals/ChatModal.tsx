import React, { useState, useEffect, useRef, useContext } from 'react';
import Modal from './Modal';
import { AuthContext } from '../../AuthContext';
import { db } from '../../services/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { ChatMessage } from '../../types';
import { showMessage, formatRelativeTime, formatFirebaseError } from '../../utils/helpers';
import { Loader2, Send } from 'lucide-react';

interface ChatModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose }) => {
    const { user, userProfile } = useContext(AuthContext);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen || !user) {
            setLoading(true);
            setMessages([]);
            return;
        }

        const q = query(collection(db, `chats/${user.uid}/messages`), orderBy('createdAt'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
            setMessages(msgs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching chat messages:", error);
            showMessage(formatFirebaseError(error, "Error: Could not load chat messages."), true);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [isOpen, user]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !user || !userProfile) return;

        setIsSending(true);
        const text = newMessage.trim();
        setNewMessage('');

        try {
            const chatSessionRef = doc(db, 'chats', user.uid);
            const messageCollectionRef = collection(db, `chats/${user.uid}/messages`);

            // Add new message
            await addDoc(messageCollectionRef, {
                text,
                senderId: user.uid,
                senderName: userProfile.name,
                createdAt: serverTimestamp(),
            });

            // Update or create chat session document for admin view
            await setDoc(chatSessionRef, {
                userName: userProfile.name,
                userEmail: user.email,
                lastMessage: text,
                lastMessageAt: serverTimestamp(),
                isReadByAdmin: false,
            }, { merge: true });

            showMessage("We will get back to you soon.");

        } catch (error) {
            console.error("Error sending message:", error);
            showMessage(formatFirebaseError(error, "Could not send message. Please try again."), true);
            setNewMessage(text); // Put message back on error
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Chat with Admin">
            <div className="flex flex-col h-[60vh]">
                <div className="flex-grow overflow-y-auto p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-4 pretty-scrollbar">
                    {loading && <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-indigo-500" /></div>}
                    {!loading && messages.length === 0 && (
                        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                            No messages yet. Send a message to start the conversation.
                        </div>
                    )}
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex items-end gap-2 ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs md:max-w-md p-3 rounded-xl ${msg.senderId === user?.uid ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-100 shadow-sm'}`}>
                                <p className="text-sm">{msg.text}</p>
                                <p className={`text-xs mt-1 opacity-70 ${msg.senderId === user?.uid ? 'text-right' : 'text-left'}`}>
                                    {msg.createdAt ? formatRelativeTime(msg.createdAt) : 'sending...'}
                                </p>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                <div className="mt-4 flex items-center gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && !isSending && handleSendMessage()}
                        placeholder="Type your message..."
                        className="flex-grow p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-700"
                        disabled={isSending}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={isSending || !newMessage.trim()}
                        className="p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                    >
                        {isSending ? <Loader2 className="animate-spin" /> : <Send />}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ChatModal;