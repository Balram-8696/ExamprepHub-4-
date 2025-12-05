
import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Test } from '../../types';
import { Radio, Calendar, Clock, ChevronRight, CheckCircle, ChevronLeft, Timer, AlertCircle } from 'lucide-react';
import SkeletonList from '../skeletons/SkeletonList';

interface LiveTestsPageProps {
    onNavigate: (view: string, testId?: string) => void;
}

// Helper to safely convert Firestore Timestamp or string to Date
const toDate = (val: any): Date => {
    if (!val) return new Date(0);
    if (val instanceof Timestamp) return val.toDate();
    if (typeof val.toDate === 'function') return val.toDate();
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date(0) : d;
};

const CountdownTimer: React.FC<{ targetDate: Date }> = ({ targetDate }) => {
    const calculateTimeLeft = () => {
        const difference = +targetDate - +new Date();
        let timeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };

        if (difference > 0) {
            timeLeft = {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
            };
        }
        return timeLeft;
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);
        return () => clearInterval(timer);
    }, [targetDate]);

    const TimeBlock = ({ value, label }: { value: number, label: string }) => (
        <div className="flex flex-col items-center bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3 min-w-[60px] sm:min-w-[70px] border border-white/10">
            <span className="text-xl sm:text-2xl font-bold text-white">{String(value).padStart(2, '0')}</span>
            <span className="text-[10px] sm:text-xs uppercase tracking-wider text-white/80">{label}</span>
        </div>
    );

    return (
        <div className="flex gap-2 sm:gap-3 mt-4 justify-center sm:justify-start">
            <TimeBlock value={timeLeft.days} label="Days" />
            <TimeBlock value={timeLeft.hours} label="Hrs" />
            <TimeBlock value={timeLeft.minutes} label="Mins" />
            <TimeBlock value={timeLeft.seconds} label="Secs" />
        </div>
    );
};

const UpcomingCarousel: React.FC<{ tests: Test[]; onJoin: (test: Test) => void }> = ({ tests, onJoin }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % tests.length);
        }, 6000); // Auto-advance every 6 seconds
        return () => clearInterval(interval);
    }, [tests.length]);

    const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % tests.length);
    const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + tests.length) % tests.length);

    if (tests.length === 0) {
        return (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">No Upcoming Exams</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Stay tuned for new schedules.</p>
            </div>
        );
    }

    const currentTest = tests[currentIndex];
    const startDate = toDate(currentTest.liveFrom);

    return (
        <div className="relative w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700 transition-all">
            {/* Navigation Buttons */}
            {tests.length > 1 && (
                <>
                    <button 
                        onClick={(e) => { e.stopPropagation(); prevSlide(); }} 
                        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors backdrop-blur-sm"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); nextSlide(); }} 
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors backdrop-blur-sm"
                    >
                        <ChevronRight size={24} />
                    </button>
                </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 h-full">
                {/* Left: Visual & Countdown */}
                <div className="relative bg-gradient-to-br from-indigo-600 to-purple-700 p-8 flex flex-col justify-center text-white min-h-[300px]">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]"></div>
                    
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-white/10">
                            <Calendar size={12} /> Upcoming Live Exam
                        </div>
                        
                        <h2 className="text-3xl sm:text-4xl font-extrabold mb-2 leading-tight line-clamp-2">
                            {currentTest.title}
                        </h2>
                        
                        <div className="flex items-center gap-2 text-indigo-100 mb-6">
                            <span className="bg-indigo-500/30 px-2 py-0.5 rounded text-sm font-medium border border-indigo-400/30">{currentTest.category || 'General'}</span>
                            <span>&bull;</span>
                            <span className="text-sm font-medium flex items-center gap-1"><Clock size={14}/> {currentTest.durationMinutes} Mins</span>
                        </div>

                        <div className="mb-2">
                            <p className="text-xs font-bold uppercase text-indigo-200 mb-2">Starts In</p>
                            <CountdownTimer targetDate={startDate} />
                        </div>
                    </div>
                </div>

                {/* Right: Details & Action */}
                <div className="p-8 flex flex-col justify-center bg-white dark:bg-gray-800">
                    <div className="space-y-6">
                        <div>
                            <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Schedule</h4>
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                                    <Calendar size={24} />
                                </div>
                                <div>
                                    <p className="text-gray-900 dark:text-white font-bold">{startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm">at {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Exam Details</h4>
                            <ul className="space-y-2">
                                <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                    <CheckCircle size={16} className="text-green-500" />
                                    <span>{currentTest.questionCount} Multiple Choice Questions</span>
                                </li>
                                <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                    <CheckCircle size={16} className="text-green-500" />
                                    <span>{currentTest.marksPerQuestion * currentTest.questionCount} Total Marks</span>
                                </li>
                                <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                    <CheckCircle size={16} className="text-green-500" />
                                    <span>Negative Marking: {currentTest.negativeMarking > 0 ? 'Yes' : 'No'}</span>
                                </li>
                            </ul>
                        </div>

                        <button 
                            onClick={() => onJoin(currentTest)}
                            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
                        >
                            <Timer size={20} />
                            View Exam Details
                        </button>
                    </div>
                </div>
            </div>

            {/* Carousel Indicators */}
            {tests.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                    {tests.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                            className={`h-2 rounded-full transition-all ${idx === currentIndex ? 'w-8 bg-indigo-500' : 'w-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'}`}
                            aria-label={`Go to slide ${idx + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const LiveTestsPage: React.FC<LiveTestsPageProps> = ({ onNavigate }) => {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'live' | 'upcoming' | 'past'>('live');
    const [liveTests, setLiveTests] = useState<Test[]>([]);
    const [upcomingTests, setUpcomingTests] = useState<Test[]>([]);
    const [pastTests, setPastTests] = useState<Test[]>([]);

    useEffect(() => {
        // Query all tests marked as live
        const q = query(collection(db, 'tests'), where('isLive', '==', true));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const now = new Date();
            const live: Test[] = [];
            const upcoming: Test[] = [];
            const past: Test[] = [];

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const test = { id: doc.id, ...data } as Test;
                
                const from = toDate(test.liveFrom);
                const until = toDate(test.liveUntil);

                if (now >= from && now <= until) {
                    live.push(test);
                } else if (now < from) {
                    upcoming.push(test);
                } else {
                    past.push(test);
                }
            });

            // Helper to safely get time
            const getTime = (val: any) => toDate(val).getTime();

            // Sort appropriately
            live.sort((a, b) => getTime(a.liveUntil) - getTime(b.liveUntil)); // Ending soonest first
            upcoming.sort((a, b) => getTime(a.liveFrom) - getTime(b.liveFrom)); // Starting soonest first
            past.sort((a, b) => getTime(b.liveUntil) - getTime(a.liveUntil)); // Most recently ended first

            setLiveTests(live);
            setUpcomingTests(upcoming);
            setPastTests(past);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleJoinTest = (test: Test) => {
        onNavigate('live-waiting-room', test.id);
    };

    const renderTestCard = (test: Test, type: 'live' | 'upcoming' | 'past') => {
        const until = toDate(test.liveUntil);
        
        const formatDate = (date: Date) => {
            try {
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            } catch (e) {
                return 'Invalid Date';
            }
        };

        return (
            <div key={test.id} className={`group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all hover:shadow-md ${type === 'live' ? 'ring-2 ring-red-500 dark:ring-red-500 border-transparent' : ''}`}>
                {type === 'live' && (
                    <div className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1 animate-pulse">
                        <Radio size={12} /> LIVE NOW
                    </div>
                )}
                
                <div className="p-5">
                    <div className="mb-3">
                        <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold rounded-md mb-2">
                            {test.category || 'General'}
                        </span>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                            {test.title}
                        </h3>
                    </div>

                    <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400 mb-5">
                        <div className="flex items-center gap-2">
                            <Clock size={16} className="text-indigo-500" />
                            <span>{test.durationMinutes} Mins &bull; {test.questionCount} Questions</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-indigo-500" />
                            <span>
                                {type === 'live' 
                                    ? `Ends: ${formatDate(until)}` 
                                    : `Ended: ${formatDate(until)}`}
                            </span>
                        </div>
                    </div>

                    <button 
                        onClick={() => handleJoinTest(test)}
                        className={`w-full py-2.5 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                            type === 'live' 
                                ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20' 
                                : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
                        }`}
                    >
                        {type === 'live' ? 'Join Exam Now' : 'View Details'}
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
                        <Radio className="text-red-500" /> Live Exams
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Compete in real-time time-bound examinations.
                    </p>
                </div>
                
                <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg inline-flex self-start md:self-auto">
                    <button onClick={() => setActiveTab('live')} className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === 'live' ? 'bg-white dark:bg-gray-700 text-red-600 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}>
                        Live Now
                        {liveTests.length > 0 && <span className="ml-2 bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full text-xs">{liveTests.length}</span>}
                    </button>
                    <button onClick={() => setActiveTab('upcoming')} className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === 'upcoming' ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}>
                        Upcoming
                        {upcomingTests.length > 0 && <span className="ml-2 bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full text-xs">{upcomingTests.length}</span>}
                    </button>
                    <button onClick={() => setActiveTab('past')} className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === 'past' ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}>
                        Past
                    </button>
                </div>
            </div>

            {loading ? (
                <SkeletonList items={4} />
            ) : (
                <div className="animate-fade-in">
                    {/* Live Tests Grid */}
                    {activeTab === 'live' && (
                        liveTests.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {liveTests.map(test => renderTestCard(test, 'live'))}
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                                <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">No Live Exams</h3>
                                <p className="text-gray-500 dark:text-gray-400 mt-2">There are currently no exams running live. Check upcoming!</p>
                            </div>
                        )
                    )}
                    
                    {/* Upcoming Tests Carousel */}
                    {activeTab === 'upcoming' && (
                        <UpcomingCarousel tests={upcomingTests} onJoin={handleJoinTest} />
                    )}

                    {/* Past Tests Grid */}
                    {activeTab === 'past' && (
                        pastTests.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {pastTests.map(test => renderTestCard(test, 'past'))}
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                                <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">No Past Exams</h3>
                                <p className="text-gray-500 dark:text-gray-400 mt-2">Past exams will appear here.</p>
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );
};

export default LiveTestsPage;
