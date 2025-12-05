
import React, { useState, useEffect } from 'react';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Test } from '../../types';
import { Loader2, Calendar, Clock, AlertTriangle, ChevronLeft, CheckCircle, Play, Timer } from 'lucide-react';
import { showMessage, formatFirebaseError } from '../../utils/helpers';

interface LiveExamWaitingRoomProps {
    testId: string;
    onBack: () => void;
    onStartTest: (test: Test) => void;
}

const LiveExamWaitingRoom: React.FC<LiveExamWaitingRoomProps> = ({ testId, onBack, onStartTest }) => {
    const [test, setTest] = useState<Test | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [status, setStatus] = useState<'loading' | 'upcoming' | 'live' | 'ended'>('loading');

    useEffect(() => {
        const fetchTest = async () => {
            try {
                const docRef = doc(db, 'tests', testId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setTest({ id: docSnap.id, ...docSnap.data() } as Test);
                } else {
                    showMessage("Test not found.", true);
                    onBack();
                }
            } catch (error) {
                showMessage(formatFirebaseError(error, "Failed to load test."), true);
            } finally {
                setLoading(false);
            }
        };
        fetchTest();
    }, [testId, onBack]);

    useEffect(() => {
        if (!test) return;

        const checkStatus = () => {
            const now = Date.now();
            const start = test.liveFrom instanceof Timestamp ? test.liveFrom.toMillis() : 0;
            const end = test.liveUntil instanceof Timestamp ? test.liveUntil.toMillis() : 0;

            if (now < start) {
                setStatus('upcoming');
                setTimeLeft(Math.floor((start - now) / 1000));
            } else if (now >= start && now <= end) {
                setStatus('live');
                setTimeLeft(Math.floor((end - now) / 1000)); // Time until end
            } else {
                setStatus('ended');
                setTimeLeft(0);
            }
        };

        checkStatus(); // Initial check
        const interval = setInterval(checkStatus, 1000);
        return () => clearInterval(interval);
    }, [test]);

    const formatCountdown = (seconds: number) => {
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor((seconds % (3600 * 24)) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;

        if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-indigo-600" /></div>;
    if (!test) return null;

    const startTime = test.liveFrom instanceof Timestamp ? test.liveFrom.toDate() : new Date();
    const endTime = test.liveUntil instanceof Timestamp ? test.liveUntil.toDate() : new Date();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            
            {/* Ambient Background */}
            <div className={`absolute inset-0 opacity-10 pointer-events-none ${status === 'live' ? 'bg-red-500 animate-pulse' : 'bg-indigo-500'}`}></div>
            
            <button onClick={onBack} className="absolute top-6 left-6 p-2 bg-white dark:bg-gray-800 rounded-full shadow-md z-20 hover:bg-gray-100 transition-colors">
                <ChevronLeft className="w-6 h-6 text-gray-700 dark:text-gray-200" />
            </button>

            <div className="relative z-10 w-full max-w-3xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                
                {/* Header Banner */}
                <div className={`p-6 text-center text-white ${status === 'live' ? 'bg-gradient-to-r from-red-600 to-orange-600' : status === 'upcoming' ? 'bg-gradient-to-r from-indigo-600 to-blue-600' : 'bg-gray-600'}`}>
                    <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-2">{test.title}</h1>
                    <p className="text-white/90 font-medium flex items-center justify-center gap-2">
                        {status === 'live' ? <span className="flex items-center gap-2"><div className="w-3 h-3 bg-white rounded-full animate-ping"></div> LIVE EXAM IN PROGRESS</span> : status === 'upcoming' ? 'SCHEDULED EXAM' : 'EXAM ENDED'}
                    </p>
                </div>

                <div className="p-8 sm:p-12 text-center">
                    {status === 'upcoming' && (
                        <div className="mb-8">
                            <p className="text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold text-sm mb-4">Exam Starts In</p>
                            <div className="text-5xl sm:text-7xl font-mono font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                                {timeLeft !== null ? formatCountdown(timeLeft) : '--:--:--'}
                            </div>
                            <p className="mt-4 text-gray-600 dark:text-gray-300 flex items-center justify-center gap-2">
                                <Calendar className="w-4 h-4" /> {startTime.toLocaleString()}
                            </p>
                        </div>
                    )}

                    {status === 'live' && (
                        <div className="mb-8">
                            <p className="text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold text-sm mb-4">Time Remaining to Join</p>
                            <div className="text-5xl sm:text-7xl font-mono font-bold text-red-600 dark:text-red-400 tabular-nums animate-pulse">
                                {timeLeft !== null ? formatCountdown(timeLeft) : '--:--:--'}
                            </div>
                            <p className="mt-4 text-gray-600 dark:text-gray-300">Don't be late! The clock is ticking.</p>
                        </div>
                    )}

                    {status === 'ended' && (
                        <div className="mb-8 py-8">
                            <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-white">This exam has ended.</h3>
                            <p className="text-gray-600 dark:text-gray-300 mt-2">You can check the results or leaderboard if available.</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl mb-8 border dark:border-gray-600">
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">Questions</p>
                            <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{test.questionCount}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">Duration</p>
                            <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{test.durationMinutes} Mins</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">Total Marks</p>
                            <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{test.questionCount * (test.marksPerQuestion || 1)}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center justify-center gap-2"><CheckCircle className="w-5 h-5 text-green-500"/> Important Instructions</h3>
                        <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2 max-w-md mx-auto text-left list-disc pl-5">
                            <li>Ensure you have a stable internet connection.</li>
                            <li>Do not refresh the page once the exam starts.</li>
                            <li>The timer runs server-side; submitting late may result in disqualification.</li>
                            {test.negativeMarking > 0 && <li className="text-red-500 font-semibold">Negative marking of {test.negativeMarking} per wrong answer applies.</li>}
                        </ul>
                    </div>

                    <div className="mt-10">
                        <button
                            onClick={() => onStartTest(test)}
                            disabled={status !== 'live'}
                            className={`w-full sm:w-auto px-10 py-4 rounded-xl font-bold text-lg shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3 mx-auto ${
                                status === 'live' 
                                    ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white hover:shadow-red-500/30' 
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            {status === 'live' ? <><Play fill="currentColor" /> Enter Exam Hall</> : status === 'upcoming' ? <><Timer /> Wait for Start</> : 'Exam Closed'}
                        </button>
                        {status === 'upcoming' && <p className="text-xs text-gray-400 mt-3">This button will activate automatically when the timer hits zero.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveExamWaitingRoom;
