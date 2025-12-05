
import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, where, doc, getDoc, limit, Timestamp, getDocs, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Category, Test, UserResult, TestStateLocal, HomepageSettings, HomeComponent, BannerComponentConfig, FeaturedCategoryComponentConfig, LatestTestsComponentConfig, CategoriesGridComponentConfig, RichTextComponentConfig, RecentTestsComponentConfig, Announcement, AnnouncementsComponentConfig, TestimonialsComponentConfig, StatsCounterComponentConfig, FAQComponentConfig, CTAComponentConfig, FAQ, SyllabusComponentConfig, NotesComponentConfig, InformationComponentConfig, NewAdditionsComponentConfig, RecommendedTestsComponentConfig, CountdownTimerComponentConfig, VideoEmbedComponentConfig, LeaderboardComponentConfig, ImageGalleryComponentConfig, FeaturedTutorsComponentConfig, CurrentAffairsSection, CurrentAffairsGridComponentConfig, TestGridComponentConfig, StudyMaterial, LatestUpdatesComponentConfig, UpdateArticle, ArticleBlock, YourExamsComponentConfig, LiveExamsComponentConfig } from '../../types';
import { AuthContext } from '../../AuthContext';
import TestCard from '../home/TestCard';
import DesktopSidebar from '../layout/DesktopSidebar';
import { showMessage, getCategoryStyle, formatRelativeTime, formatFirebaseError, safeDate } from '../../utils/helpers';
import { Shield, ArrowRight, Star, Megaphone, X, Quote, ChevronDown, TrendingUp, HelpCircle, Info, Trophy, Users, Newspaper, BookCopy, File as FileIcon, Youtube, LayoutDashboard, BookmarkCheck, CheckCircle, BookmarkPlus, Loader2, LayoutGrid, Check, ArrowLeft, PlayCircle, Radio } from 'lucide-react';
import SkeletonCard from '../skeletons/SkeletonCard';
import DynamicIcon from '../layout/DynamicIcon';
import SkeletonHomePage from '../skeletons/SkeletonHomePage';
import VideoPlayerModal from '../modals/VideoPlayerModal';
import ConfirmModal from '../modals/ConfirmModal';

interface HomePageProps {
    onInitiateTestView: (details: { test: Test; action: 'resume' | 'result'; resultData?: UserResult, language: 'english' | 'hindi' }) => void;
    onShowInstructions: (test: Test) => void;
    categories: Category[];
    loadingCategories: boolean;
    selectedCategory: { id: string, name: string };
    onSelectCategory: (category: { id: string, name: string }) => void;
    currentAffairsSections: CurrentAffairsSection[];
    onSelectCurrentAffairsSection: (section: { id: string, name: string }) => void;
    selectedCurrentAffairsSection: { id: string, name: string };
    searchQuery: string;
    onNavigate: (view: string) => void;
    onOpenAuthModal: (initialView?: 'signin' | 'signup') => void;
    isPreview?: boolean;
    previewHomepageSettings?: HomepageSettings | null;
    previewCategorySettings?: HomepageSettings | null;
}

const isRecentlyAdded = (test: Test) => {
    if (!test.createdAt) return false;
    const date = safeDate(test.createdAt);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);
    return diffDays <= 5; // Mark as new if created within last 5 days
};

const FAQComponent: React.FC<{ config: FAQComponentConfig }> = ({ config }) => {
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    return (
         <section>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 text-center">{config.title}</h2>
            <div className="max-w-3xl mx-auto space-y-4">
                {(config.faqs || []).map((f, i) => (
                    <div key={i} className="border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                        <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex justify-between items-center p-4 text-left font-semibold text-gray-800 dark:text-gray-100">
                            <span>{f.question}</span>
                            <ChevronDown className={`transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                        </button>
                        {openFaq === i && <div className="p-4 border-t dark:border-gray-700 text-gray-600 dark:text-gray-300 animate-fade-in">{f.answer}</div>}
                    </div>
                ))}
            </div>
        </section>
    );
};

const CountdownTimerComponent: React.FC<{ config: CountdownTimerComponentConfig }> = ({ config }) => {
    const calculateTimeLeft = useCallback(() => {
        const difference = +new Date(config.targetDate) - +new Date();
        let timeLeft: { [key: string]: number } = {};

        if (difference > 0) {
            timeLeft = {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
            };
        }
        return timeLeft;
    }, [config.targetDate]);

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);
        return () => clearInterval(timer);
    }, [calculateTimeLeft]);

    const timerComponents = Object.entries(timeLeft).map(([interval, value]) => (
        <div key={interval} className="text-center p-2">
            <div className="text-3xl md:text-4xl font-extrabold text-indigo-600 dark:text-indigo-400">{String(value).padStart(2, '0')}</div>
            <div className="text-xs uppercase text-gray-500 dark:text-gray-400 mt-1">{interval}</div>
        </div>
    ));

    return (
        <section className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-lg border dark:border-gray-700 text-center">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">{config.title}</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{config.eventDescription}</p>
            <div className="flex justify-center flex-wrap gap-4 sm:gap-8">
                {timerComponents.length ? timerComponents : <span className="text-xl font-semibold text-green-600 dark:text-green-400">The event has started!</span>}
            </div>
        </section>
    );
};

const LatestUpdatesComponent: React.FC<{ config: LatestUpdatesComponentConfig; onNavigate: (path: string) => void }> = ({ config, onNavigate }) => {
    const [articles, setArticles] = useState<(UpdateArticle & {content?: string})[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(
            collection(db, 'updateArticles'), 
            where('status', '==', 'published')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const articlesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as (UpdateArticle & {content?: string})));
            articlesData.sort((a, b) => (safeDate(b.publishAt).getTime() || 0) - (safeDate(a.publishAt).getTime() || 0));
            setArticles(articlesData.slice(0, config.limit || 3));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching latest updates:", error);
            showMessage(formatFirebaseError(error, "Error: Could not load latest updates."), true);
            setLoading(false);
        });
        return unsubscribe;
    }, [config.limit]);
    
    const getSnippet = (blocks: ArticleBlock[] | undefined) => {
        if (!blocks) return '';
        const textContent = blocks
            .filter(block => ['paragraph', 'h2', 'h3', 'quote'].includes(block.type))
            .map(block => (block as any).content) // Assuming 'content' for paragraph, h2, h3, quote blocks
            .join(' ');
        const trimmedText = textContent.replace(/\s+/g, ' ').trim();
        return trimmedText.length > 80 ? trimmedText.substring(0, 80) + '...' : trimmedText;
    };

    if (loading && articles.length === 0) {
        return (
            <section>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">{config.title}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                         <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-md border dark:border-gray-700 animate-pulse">
                            <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 rounded-t-xl"></div>
                            <div className="p-4 space-y-3">
                                <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                                <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        );
    }
    
    if (articles.length === 0) return null;

    return (
        <section>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">{config.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map(article => (
                    <button key={article.id} onClick={() => onNavigate(`update/${article.slug}`)} className="text-left bg-white dark:bg-gray-800 rounded-xl shadow-md border dark:border-gray-700 overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
                        <img src={article.featuredImageUrl || `https://via.placeholder.com/400x200.png?text=${article.title.split(' ').join('+')}`} alt={article.title} className="w-full h-40 object-cover" />
                        <div className="p-4">
                            <p className="text-xs text-gray-500 dark:text-gray-400">{formatRelativeTime(article.publishAt)}</p>
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 mt-1 truncate">{article.title}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 h-10">{getSnippet(article.blocks)}</p>
                        </div>
                    </button>
                ))}
            </div>
        </section>
    );
};

const HomePage: React.FC<HomePageProps> = ({ 
    onInitiateTestView,
    onShowInstructions,
    categories, 
    loadingCategories, 
    selectedCategory, 
    onSelectCategory,
    currentAffairsSections,
    onSelectCurrentAffairsSection,
    selectedCurrentAffairsSection,
    searchQuery,
    onNavigate,
    onOpenAuthModal,
    isPreview = false,
    previewHomepageSettings,
    previewCategorySettings
}) => {
    const { user, userProfile } = useContext(AuthContext);
    
    // Initialize state from localStorage for immediate rendering
    const [allTests, setAllTests] = useState<Test[]>(() => {
        try {
            const cached = localStorage.getItem('allTests');
            return cached ? JSON.parse(cached) : [];
        } catch { return []; }
    });
    
    const [userResults, setUserResults] = useState<UserResult[]>(() => {
        // Results are user specific, handled in effect
        return [];
    });
    
    const [loadingTests, setLoadingTests] = useState(allTests.length === 0);
    const [inProgressTest, setInProgressTest] = useState<TestStateLocal | null>(null);
    
    // Initialize homepage settings from localStorage
    const [homepageSettings, setHomepageSettings] = useState<HomepageSettings | null>(() => {
        try {
            const cached = localStorage.getItem('homepageSettings');
            return cached ? JSON.parse(cached) : null;
        } catch { return null; }
    });
    
    // Initialize announcements from localStorage
    const [activeAnnouncement, setActiveAnnouncement] = useState<Announcement | null>(() => {
        try {
            const cached = localStorage.getItem('activeAnnouncement');
            return cached ? JSON.parse(cached) : null;
        } catch { return null; }
    });
    
    const [sections, setSections] = useState<string[]>([]);
    const [selectedSection, setSelectedSection] = useState('All');

    const [recommendedTests, setRecommendedTests] = useState<Test[]>([]);
    const [loadingRecommendations, setLoadingRecommendations] = useState(true);

    const [leaderboardData, setLeaderboardData] = useState<{name: string, score: number}[]>([]);
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

    const [categorySettings, setCategorySettings] = useState<HomepageSettings | null>(null);
    const [loadingCategorySettings, setLoadingCategorySettings] = useState(false);

    const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>([]);
    const [loadingStudyMaterials, setLoadingStudyMaterials] = useState(false);
    const [videoToPlay, setVideoToPlay] = useState<string | null>(null);
    
    const [enrollingCategoryId, setEnrollingCategoryId] = useState<string | null>(null);
    const [enrollModalOpen, setEnrollModalOpen] = useState(false);
    const [pendingTest, setPendingTest] = useState<Test | null>(null);

     useEffect(() => {
        if (!selectedCategory.id || isPreview) {
            setStudyMaterials([]);
            return;
        }

        setLoadingStudyMaterials(true);
        
        const q = query(collection(db, 'studyMaterials'), where('categoryId', '==', selectedCategory.id));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const materialsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudyMaterial));
            materialsData.sort((a, b) => (safeDate(b.createdAt).getTime() || 0) - (safeDate(a.createdAt).getTime() || 0));
            setStudyMaterials(materialsData);
            setLoadingStudyMaterials(false);
        }, (error) => {
            console.error("Error fetching study materials:", error);
            showMessage(formatFirebaseError(error, "Error: Could not load study materials."), true);
            setStudyMaterials([]);
            setLoadingStudyMaterials(false);
        });
        return () => unsubscribe();

    }, [selectedCategory.id, categories, isPreview]);

     useEffect(() => {
        if (isPreview) {
            setCategorySettings(previewCategorySettings || null);
            setLoadingCategorySettings(false);
            return;
        }

        if (selectedCategory.id) {
            setLoadingCategorySettings(true);
            const settingsDocRef = doc(db, 'categorySettings', selectedCategory.id);
            const unsubscribe = onSnapshot(settingsDocRef, (doc) => {
                if (doc.exists()) {
                    setCategorySettings(doc.data() as HomepageSettings);
                } else {
                    setCategorySettings(null);
                }
                setLoadingCategorySettings(false);
            }, (error) => {
                console.error("Error fetching category settings:", error);
                showMessage(formatFirebaseError(error, "Error: Could not load category settings."), true);
                setCategorySettings(null);
                setLoadingCategorySettings(false);
            });
            return () => unsubscribe();
        } else {
            setCategorySettings(null);
            setLoadingCategorySettings(false);
        }
    }, [selectedCategory.id, isPreview, previewCategorySettings]);

    useEffect(() => {
        const needsLeaderboard = homepageSettings?.layout.some(c => c.type === 'leaderboard' && c.enabled);
        if (!needsLeaderboard || isPreview) {
            setLoadingLeaderboard(false);
            return;
        }

        setLoadingLeaderboard(true);
        const resultsQuery = query(collection(db, 'results'));
        const unsubscribeResults = onSnapshot(resultsQuery, async (resultsSnapshot) => {
            const allResults = resultsSnapshot.docs.map(doc => doc.data() as UserResult);
            
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const usersMap = new Map(usersSnapshot.docs.map(doc => [doc.id, doc.data().name]));

            const userScores = new Map<string, { totalPercentage: number, count: number }>();
            allResults.forEach(result => {
                if (result.userId) {
                    const current = userScores.get(result.userId) || { totalPercentage: 0, count: 0 };
                    current.totalPercentage += result.percentage;
                    current.count += 1;
                    userScores.set(result.userId, current);
                }
            });

            const calculatedLeaderboard = Array.from(userScores.entries()).map(([userId, data]) => ({
                name: usersMap.get(userId) || 'Anonymous',
                score: data.totalPercentage / data.count,
            }));

            calculatedLeaderboard.sort((a, b) => b.score - a.score);
            
            setLeaderboardData(calculatedLeaderboard);
            setLoadingLeaderboard(false);

        }, (error) => {
            console.error("Error fetching leaderboard data:", error);
            showMessage(formatFirebaseError(error, "Error: Could not load leaderboard data."), true);
            setLoadingLeaderboard(false);
        });

        return () => unsubscribeResults();
    }, [homepageSettings, isPreview]);

    useEffect(() => {
        if (isPreview) {
            setHomepageSettings(previewHomepageSettings || null);
            return; 
        }

        const settingsDocRef = doc(db, 'uiSettings', 'homepage');
        const unsubscribe = onSnapshot(settingsDocRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data() as HomepageSettings;
                setHomepageSettings(data);
                localStorage.setItem('homepageSettings', JSON.stringify(data)); // Cache it
            } else {
                const defaultSettings = { layout: [
                    { id: 'default-banner', type: 'banner', enabled: true, config: { title: 'Master Your Exams', subtitle: 'Prepare effectively with high-quality online mock tests.', imageUrl: null } },
                    { id: 'default-latest', type: 'latest_tests', enabled: true, config: { title: 'Latest Tests', limit: 4 } }
                ]};
                setHomepageSettings(defaultSettings as HomepageSettings);
                localStorage.setItem('homepageSettings', JSON.stringify(defaultSettings));
            }
        }, (error) => {
            console.error("Error fetching homepage settings:", error);
            showMessage(formatFirebaseError(error, "Error: Could not load homepage settings."), true);
        });
        
        const qAnnounce = query(collection(db, 'announcements'), where("isActive", "==", true), limit(1));
        const unsubscribeAnnounce = onSnapshot(qAnnounce, (snapshot) => {
            if (!snapshot.empty) {
                const announcementData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Announcement;
                setActiveAnnouncement(announcementData);
                localStorage.setItem('activeAnnouncement', JSON.stringify(announcementData)); // Cache it
            } else {
                setActiveAnnouncement(null);
                localStorage.removeItem('activeAnnouncement');
            }
        }, (error) => {
            console.error("Error fetching announcements:", error);
            showMessage(formatFirebaseError(error, "Error: Could not load announcements."), true);
        });

        return () => {
            unsubscribe();
            unsubscribeAnnounce();
        };
    }, [isPreview, previewHomepageSettings]);

    useEffect(() => {
        setSelectedSection('All');
        if (selectedCategory.id) {
            const currentCat = categories.find(c => c.id === selectedCategory.id);
            // Use the selected category's sections directly, whether it's parent or child
            setSections(currentCat?.sections || []);
        } else {
            setSections([]);
        }
    }, [selectedCategory, categories]);

    useEffect(() => {
        const q = query(collection(db, 'tests'), where("status", "==", "published"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const testsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Test));
            // Using safeDate for robust sorting
            testsData.sort((a, b) => (safeDate(b.createdAt).getTime() || 0) - (safeDate(a.createdAt).getTime() || 0));
            setAllTests(testsData);
            localStorage.setItem('allTests', JSON.stringify(testsData)); // Cache it
            setLoadingTests(false);
        }, (error) => {
            console.error("Error fetching tests:", error);
            showMessage(formatFirebaseError(error, "Error: Could not load tests."), true);
            setLoadingTests(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (user && !isPreview) {
            // Try load user results from cache
            const cachedResults = localStorage.getItem(`userResults_${user.uid}`);
            if (cachedResults) {
                try {
                    setUserResults(JSON.parse(cachedResults));
                } catch(e) {}
            }

            const q = query(collection(db, 'results'), where("userId", "==", user.uid));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const resultsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserResult));
                resultsData.sort((a, b) => {
                    return safeDate(b.submittedAt).getTime() - safeDate(a.submittedAt).getTime();
                });
                setUserResults(resultsData);
                localStorage.setItem(`userResults_${user.uid}`, JSON.stringify(resultsData)); // Cache it
            }, (error) => {
                console.error("Error fetching user results in HomePage:", error);
                showMessage(formatFirebaseError(error, "Could not load your recent activity."), true);
            });
            setInProgressTest(JSON.parse(localStorage.getItem(`inProgressTest_${user.uid}`) || 'null'));
            return () => unsubscribe();
        } else {
            setUserResults([]);
            setInProgressTest(null);
        }
    }, [user, isPreview]);
    
    const isTestLive = (test: Test) => {
        const now = new Date();
        const publishDate = safeDate(test.publishAt);
        const expiryDate = safeDate(test.expiresAt);
        // Check for validity: safeDate returns now/epoch if invalid, but test.publishAt might be null/undefined which safeDate handles
        const hasPublishDate = !!test.publishAt;
        const hasExpiryDate = !!test.expiresAt;
        
        return (!hasPublishDate || publishDate <= now) && (!hasExpiryDate || expiryDate >= now);
    };
    
    const recentActivityTests = React.useMemo(() => {
        if (!user) return [];
        const activityTests: Test[] = [];
        const addedTestIds = new Set<string>();
        if (inProgressTest) {
            const test = allTests.find(t => t.id === inProgressTest.testId);
            if (test && isTestLive(test)) {
                activityTests.push(test);
                addedTestIds.add(test.id);
            }
        }
        if (userResults.length > 0) {
            for (const result of userResults) {
                if (!addedTestIds.has(result.testId)) {
                    const test = allTests.find(t => t.id === result.testId);
                    if (test) {
                        activityTests.push(test);
                        addedTestIds.add(test.id);
                    }
                }
                if (activityTests.length >= 8) break; 
            }
        }
        return activityTests;
    }, [user, inProgressTest, userResults, allTests]);

    // Enrolled Categories Data
    const enrolledCategoriesData = React.useMemo(() => {
        // Mock data for preview mode to show how the component looks
        if (isPreview) {
             return categories.slice(0, 5).map(c => ({
                category: c,
                totalTests: 20,
                completedTests: 12,
                progress: 60
             }));
        }

        if (!userProfile?.enrolledCategoryIds || !allTests.length) return [];

        return userProfile.enrolledCategoryIds.map(catId => {
            const category = categories.find(c => c.id === catId);
            if (!category) return null;

            const categoryTests = allTests.filter(t => t.categoryId === catId && isTestLive(t));
            const totalTests = categoryTests.length;

            // Find unique completed tests in this category
            const completedTests = new Set(
                userResults
                    .filter(r => r.categoryId === catId)
                    .map(r => r.testId)
            ).size;

            return {
                category,
                totalTests,
                completedTests,
                progress: totalTests > 0 ? (completedTests / totalTests) * 100 : 0
            };
        }).filter(Boolean) as { category: Category, totalTests: number, completedTests: number, progress: number }[];
    }, [userProfile?.enrolledCategoryIds, categories, allTests, userResults, isPreview]);

    useEffect(() => {
        if (!user || userResults.length === 0 || allTests.length === 0 || isPreview) {
            setRecommendedTests([]);
            setLoadingRecommendations(false);
            return;
        }
        setLoadingRecommendations(true);
        const categoryPerformance = new Map<string, { total: number; count: number; name: string }>();
        userResults.forEach(result => {
            const { categoryId, categoryName, percentage } = result;
            if (categoryId) {
                const current = categoryPerformance.get(categoryId) || { total: 0, count: 0, name: categoryName || '' };
                current.total += percentage;
                current.count += 1;
                categoryPerformance.set(categoryId, current);
            }
        });
        let weakestCategory: { id: string; avg: number } | null = null;
        categoryPerformance.forEach((data, id) => {
            const avg = data.total / data.count;
            if (!weakestCategory || avg < weakestCategory.avg) {
                weakestCategory = { id, avg };
            }
        });
        if (weakestCategory) {
            const takenTestIds = new Set(userResults.map(r => r.testId));
            const recommendations = allTests.filter(test => test.categoryId === weakestCategory!.id && !takenTestIds.has(test.id) && isTestLive(test)).slice(0, 4);
            setRecommendedTests(recommendations);
        } else {
            setRecommendedTests([]);
        }
        setLoadingRecommendations(false);
    }, [user, userResults, allTests, isPreview]);
    
    const handleTestAction = async (testId: string, action: 'start' | 'resume' | 'result') => {
        if (isPreview) {
            showMessage("Actions are disabled in preview mode.", true);
            return;
        }
        const test = allTests.find(t => t.id === testId);
        if (!test) return;
        if (action === 'start') {
            if (!user) {
                onOpenAuthModal('signup');
                return;
            }
            
            // Enrollment Check: If user is in a specific category view, require enrollment in that category
            if (selectedCategory.id) {
                const isEnrolled = userProfile?.enrolledCategoryIds?.includes(selectedCategory.id);
                if (!isEnrolled) {
                    setPendingTest(test);
                    setEnrollModalOpen(true);
                    return;
                }
            }

            onShowInstructions(test);
        } else if (action === 'resume') {
            onInitiateTestView({ test, action: 'resume', language: 'english' });
        } else if (action === 'result') {
            const resultData = userResults.find(r => r.testId === testId);
            try {
                const testDoc = await getDoc(doc(db, 'tests', testId));
                if(testDoc.exists()) {
                    onInitiateTestView({ test: {id: testDoc.id, ...testDoc.data()} as Test, action: 'result', resultData, language: 'english' });
                }
            } catch (error) {
                console.error("Error fetching test document for result view:", error);
                showMessage(formatFirebaseError(error, "Error: Could not load test details for result."), true);
            }
        }
    };
    
    const handleEnroll = async (catId: string) => {
        if (!user) {
            onOpenAuthModal('signup');
            return;
        }
        setEnrollingCategoryId(catId);
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                enrolledCategoryIds: arrayUnion(catId)
            });
            showMessage("Successfully enrolled in test series!");
        } catch (error) {
            console.error("Enrollment error:", error);
            showMessage("Failed to enroll. Please try again.", true);
        } finally {
            setEnrollingCategoryId(null);
        }
    };
    
    const confirmEnrollment = async () => {
        if (selectedCategory.id) {
            await handleEnroll(selectedCategory.id);
            setEnrollModalOpen(false);
            if (pendingTest) {
                 onShowInstructions(pendingTest);
                 setPendingTest(null);
            }
        }
    };

    const getCategoryAndAllChildrenIds = useCallback((categoryId: string): string[] => {
        let ids = [categoryId];
        categories.filter(c => c.parentId === categoryId).forEach(child => {
            ids = ids.concat(getCategoryAndAllChildrenIds(child.id));
        });
        return ids;
    }, [categories]);

    const getCASectionAndAllChildrenIds = useCallback((sectionId: string): string[] => {
        let ids = [sectionId];
        currentAffairsSections.filter(c => c.parentId === sectionId).forEach(child => {
            ids = ids.concat(getCASectionAndAllChildrenIds(child.id));
        });
        return ids;
    }, [currentAffairsSections]);
    
    const testsFilteredByCategoryAndSearch = React.useMemo(() => {
        return allTests.filter(test => {
            if (!isTestLive(test)) return false;
            
            let categoryMatch = true;
            if (selectedCategory.id) {
                const relevantIds = getCategoryAndAllChildrenIds(selectedCategory.id);
                categoryMatch = !!test.categoryId && relevantIds.includes(test.categoryId);
            } else if (selectedCurrentAffairsSection.id) {
                const relevantIds = getCASectionAndAllChildrenIds(selectedCurrentAffairsSection.id);
                categoryMatch = !!test.currentAffairsSectionId && relevantIds.includes(test.currentAffairsSectionId);
            }

            const searchMatch = searchQuery ? test.title.toLowerCase().includes(searchQuery.toLowerCase()) : true;
            return categoryMatch && searchMatch;
        });
    }, [allTests, selectedCategory, selectedCurrentAffairsSection, getCategoryAndAllChildrenIds, getCASectionAndAllChildrenIds, searchQuery]);

    const sectionCounts = React.useMemo(() => {
        const counts: { [key: string]: number } = { 'All': testsFilteredByCategoryAndSearch.length };

        // Initialize defined sections with 0
        sections.forEach(section => {
            if (counts[section] === undefined) {
                counts[section] = 0;
            }
        });
        
        // If there are tests with sections, group by them
        testsFilteredByCategoryAndSearch.forEach(test => {
            const section = test.section || 'General';
            counts[section] = (counts[section] || 0) + 1;
        });

        return counts;
    }, [testsFilteredByCategoryAndSearch, sections]);

    const sortedSections = React.useMemo(() => {
        const keys = Object.keys(sectionCounts).filter(key => key !== 'All');
        return keys.sort((a, b) => {
            const idxA = sections.indexOf(a);
            const idxB = sections.indexOf(b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.localeCompare(b);
        });
    }, [sectionCounts, sections]);

    const filteredTests = React.useMemo(() => {
        if (selectedSection === 'All') {
            return testsFilteredByCategoryAndSearch;
        }
        return testsFilteredByCategoryAndSearch.filter(test => (test.section || 'General') === selectedSection);
    }, [testsFilteredByCategoryAndSearch, selectedSection]);

    const renderTestGrid = (testsToRender: Test[], emptyMessage: string, markAsNew = false) => (
        loadingTests ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} />)}
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {testsToRender.length > 0 ? (
                    testsToRender.map(test => (
                        <TestCard
                            key={test.id}
                            test={test}
                            userResult={userResults.find(r => r.testId === test.id)}
                            inProgressTest={inProgressTest?.testId === test.id ? inProgressTest : null}
                            onAction={handleTestAction}
                            isNew={markAsNew || isRecentlyAdded(test)}
                        />
                    ))
                ) : (
                    <p className="text-gray-500 dark:text-gray-400 col-span-full mt-4">{emptyMessage}</p>
                )}
            </div>
        )
    );
    
    const renderHorizontalTestScroll = (testsToRender: Test[], emptyMessage: string) => (
        loadingTests && testsToRender.length === 0 ? (
            <div className="flex space-x-6">
                {Array.from({ length: 2 }).map((_, index) => <div className="w-72 flex-shrink-0" key={index}><SkeletonCard /></div>)}
            </div>
        ) : (
            <div className="flex overflow-x-auto space-x-6 pb-4 -mx-4 px-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {testsToRender.length > 0 ? (
                    testsToRender.map(test => (
                        <div key={test.id} className="w-72 flex-shrink-0">
                            <TestCard
                                test={test}
                                userResult={userResults.find(r => r.testId === test.id)}
                                inProgressTest={inProgressTest?.testId === test.id ? inProgressTest : null}
                                onAction={handleTestAction}
                                isNew={isRecentlyAdded(test)}
                            />
                        </div>
                    ))
                ) : (
                    <p className="text-gray-500 dark:text-gray-400 mt-4">{emptyMessage}</p>
                )}
            </div>
        )
    );

    const AnnouncementsComponent: React.FC = () => {
        const [isDismissed, setIsDismissed] = useState(false);
    
        useEffect(() => {
            if (activeAnnouncement) {
                const dismissed = sessionStorage.getItem(`announcement_dismissed_${activeAnnouncement.id}`) === 'true';
                setIsDismissed(dismissed);
            }
        }, [activeAnnouncement]);
    
        if (!activeAnnouncement || isDismissed) return null;
    
        const handleDismiss = () => {
            sessionStorage.setItem(`announcement_dismissed_${activeAnnouncement.id}`, 'true');
            setIsDismissed(true);
        };
    
        return (
            <div className="bg-indigo-600 text-white p-4 rounded-xl shadow-lg flex items-center justify-between gap-4 animate-fade-in">
                <div className="flex items-center gap-3">
                    <Megaphone />
                    <div>
                        <h3 className="font-bold">{activeAnnouncement.title}</h3>
                        <p className="text-sm opacity-90">{activeAnnouncement.content}</p>
                    </div>
                </div>
                <button onClick={handleDismiss} className="p-1 rounded-full hover:bg-white/20"><X size={18} /></button>
            </div>
        );
    };

    const renderStudyMaterials = () => (
        <section>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-3">
                <BookCopy /> Study Materials
            </h2>
            {loadingStudyMaterials ? (
                <div className="space-y-4">
                    <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse w-full"></div>
                    <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse w-full"></div>
                </div>
            ) : (
                <div className="space-y-4">
                    {studyMaterials.map(material => (
                        <div key={material.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md border dark:border-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                                {material.type === 'pdf' ? <FileIcon className="w-8 h-8 text-red-500 flex-shrink-0 mt-1"/> : <Youtube className="w-8 h-8 text-blue-500 flex-shrink-0 mt-1"/>}
                                <div>
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-100">{material.title}</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">{material.description}</p>
                                </div>
                            </div>
                            {material.type === 'pdf' ? (
                                <a href={material.url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-indigo-700 transition whitespace-nowrap">View PDF</a>
                            ) : (
                                <button onClick={() => setVideoToPlay(material.url)} className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-indigo-700 transition whitespace-nowrap">Watch Video</button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </section>
    );

    const renderSubcategories = () => {
        const childCategories = categories.filter(c => c.parentId === selectedCategory.id);
        if (childCategories.length === 0) return null;

        const isUserEnrolledInParent = userProfile?.enrolledCategoryIds?.includes(selectedCategory.id);

        return (
            <section className="mb-10 animate-fade-in">
                <div className="flex items-center gap-2 mb-6">
                    <div className="h-6 w-1.5 bg-indigo-500 rounded-full"></div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                        Subjects & Topics
                    </h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {childCategories.map(subCat => {
                        const subCatStyle = getCategoryStyle(subCat.name);
                        const relevantIds = getCategoryAndAllChildrenIds(subCat.id);
                        const subCatTests = allTests.filter(t => relevantIds.includes(t.categoryId || '') && isTestLive(t));
                        const totalTests = subCatTests.length;
                        
                        // Progress Calculation
                        let progress = 0;
                        let completedCount = 0;
                        if (user) {
                            const completedSet = new Set(
                                userResults
                                    .filter(r => relevantIds.includes(r.categoryId || ''))
                                    .map(r => r.testId)
                            );
                            completedCount = completedSet.size;
                            progress = totalTests > 0 ? (completedCount / totalTests) * 100 : 0;
                        }

                        const showProgress = isUserEnrolledInParent || userProfile?.enrolledCategoryIds?.includes(subCat.id);

                        return (
                            <button
                                key={subCat.id}
                                onClick={() => onSelectCategory({ id: subCat.id, name: subCat.name })}
                                className="group relative flex flex-col justify-between h-full p-6 bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 dark:hover:shadow-black/30 transition-all duration-300 hover:-translate-y-1 text-left overflow-hidden"
                            >
                                {/* Background Pattern */}
                                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
                                
                                {/* Decorative Background Icon */}
                                <div className={`absolute -right-6 -bottom-6 opacity-5 group-hover:opacity-10 transition-all duration-500 transform group-hover:scale-110 group-hover:rotate-12 ${subCatStyle.text}`}>
                                    <DynamicIcon name={subCat.icon || subCat.name} className="w-32 h-32" />
                                </div>

                                <div className="relative z-10 w-full">
                                    <div className="flex items-start justify-between mb-5">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${subCatStyle.bg} ${subCatStyle.text} shadow-sm ring-1 ring-black/5 dark:ring-white/10 group-hover:scale-110 transition-transform duration-300`}>
                                            <DynamicIcon name={subCat.icon || subCat.name} className="w-7 h-7" />
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-700/80 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-gray-500 dark:text-gray-300 border border-gray-100 dark:border-gray-600 shadow-sm">
                                            {totalTests} {totalTests === 1 ? 'Test' : 'Tests'}
                                        </div>
                                    </div>
                                    
                                    <div className="mb-6">
                                        <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-1.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight">{subCat.name}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 font-medium">
                                            Explore {subCat.name} study material and practice tests.
                                        </p>
                                    </div>
                                </div>

                                <div className="relative z-10 mt-auto w-full">
                                    {showProgress ? (
                                        <div className="space-y-2.5 bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                            <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-gray-300">
                                                <span>Progress</span>
                                                <span className={progress === 100 ? 'text-emerald-500' : 'text-indigo-500'}>{Math.round(progress)}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-1000 ${progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                                                    style={{ width: `${progress}%` }}
                                                ></div>
                                            </div>
                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 text-right font-medium uppercase tracking-wide">{completedCount}/{totalTests} Completed</p>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700/50">
                                            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Start Learning</span>
                                            <div className="flex items-center text-sm font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform duration-300">
                                                Explore <ArrowRight size={16} className="ml-1" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </section>
        );
    };

    const renderCategoryTestArea = () => {
        const childCategories = categories.filter(c => c.parentId === selectedCategory.id);
        const hasSubcategories = childCategories.length > 0;

        if (hasSubcategories) {
            return (
                <>
                    {studyMaterials.length > 0 && !loadingStudyMaterials && (
                        <div className="mb-12">
                            {renderStudyMaterials()}
                        </div>
                    )}
                    {renderSubcategories()}
                </>
            );
        }

        return (
            <>
                {studyMaterials.length > 0 && !loadingStudyMaterials && (
                    <div className="mb-12">
                        {renderStudyMaterials()}
                    </div>
                )}
                {/* Filter Tabs for Sections */}
                {selectedCategory.id && (
                     <div className="flex items-center border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        <button 
                            onClick={() => setSelectedSection('All')} 
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors duration-200 ${selectedSection === 'All' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border-b-2 border-transparent'}`}
                        >
                            All
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${selectedSection === 'All' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}>
                                {sectionCounts['All'] || 0}
                            </span>
                        </button>
                        
                        {sortedSections.map(section => (
                            <button 
                                key={section} 
                                onClick={() => setSelectedSection(section)} 
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors duration-200 ${selectedSection === section ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border-b-2 border-transparent'}`}
                            >
                                {section}
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${selectedSection === section ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}>
                                    {sectionCounts[section] || 0}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
                {renderTestGrid(filteredTests, "No available tests found matching your criteria.")}
            </>
        );
    };

    const renderHomepageComponent = (component: HomeComponent, testsForGrid: Test[] = []) => {
        if (!component.enabled) return null;
        
        switch (component.type) {
            case 'live_exams': {
                const config = component.config as LiveExamsComponentConfig;
                
                // Determine context (Global or Category)
                let relevantTests = allTests;
                
                // If we are in a category view (selectedCategory.id is present), filter by that category
                if (selectedCategory.id) {
                    const relevantIds = getCategoryAndAllChildrenIds(selectedCategory.id);
                    relevantTests = relevantTests.filter(t => relevantIds.includes(t.categoryId || ''));
                }
                
                const now = new Date();
                const liveTests = relevantTests.filter(t => {
                    if (!t.isLive) return false;
                    const until = safeDate(t.liveUntil);
                    return until > now; // Show active and upcoming
                });
                
                // Sort by start time (soonest first)
                liveTests.sort((a, b) => {
                    const startA = safeDate(a.liveFrom).getTime();
                    const startB = safeDate(b.liveFrom).getTime();
                    return startA - startB;
                });
                
                const testsToDisplay = liveTests.slice(0, config.limit);
                
                if (testsToDisplay.length === 0) return null; // Don't show empty section
                
                return (
                    <section className="py-4">
                         <div className="flex items-center gap-3 mb-4">
                             <div className="h-8 w-1.5 bg-red-500 rounded-full"></div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Radio className="text-red-500 animate-pulse" /> {config.title}
                            </h2>
                        </div>
                        {renderHorizontalTestScroll(testsToDisplay, "No upcoming live exams.")}
                    </section>
                );
            }
            case 'your_exams': {
                if (enrolledCategoriesData.length === 0) return null;
                const config = component.config as YourExamsComponentConfig;
                return (
                    <section className="py-4 mb-8">
                         <div className="flex items-center gap-3 mb-6">
                             <div className="h-8 w-1.5 bg-indigo-600 rounded-full"></div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{config.title}</h2>
                        </div>
                        <div className="flex overflow-x-auto space-x-5 pb-8 -mx-4 px-4 scroll-smooth" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            {enrolledCategoriesData.map((item) => {
                                 return (
                                    <div key={item.category.id} className="flex-shrink-0 w-80 relative overflow-hidden rounded-2xl p-6 shadow-xl border group hover:-translate-y-1 transition-all duration-300 bg-white border-gray-200 text-gray-900 dark:bg-gradient-to-br dark:from-indigo-900 dark:via-slate-900 dark:to-slate-900 dark:border-slate-700 dark:text-white">
                                        {/* Subtle Background Pattern */}
                                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]"></div>
                                        
                                        <div className="relative z-10">
                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg bg-indigo-50 text-indigo-600 dark:bg-white/10 dark:backdrop-blur-sm dark:text-white">
                                                    <DynamicIcon name={item.category.icon || item.category.name} className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold leading-tight line-clamp-1 text-gray-900 dark:text-white">{item.category.name}</h3>
                                                    <p className="text-xs font-medium uppercase tracking-wider mt-0.5 text-indigo-600 dark:text-indigo-300">Enrolled</p>
                                                </div>
                                            </div>

                                            <div className="mb-6">
                                                <div className="flex justify-between text-sm mb-2 font-medium text-indigo-700 dark:text-indigo-200">
                                                    <span>Progress</span>
                                                    <span className="font-bold text-indigo-900 dark:text-white">{item.progress.toFixed(0)}%</span>
                                                </div>
                                                <div className="w-full rounded-full h-3 overflow-hidden border bg-gray-100 border-gray-200 dark:bg-slate-800/50 dark:border-slate-700/50">
                                                    <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-1000 ease-out relative" style={{ width: `${item.progress}%` }}>
                                                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-slate-400">
                                                    <span>{item.completedTests} / {item.totalTests} Tests</span>
                                                </div>
                                            </div>

                                            <button 
                                                onClick={() => onNavigate(`category:${item.category.id}`)} 
                                                className="w-full py-3 font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-white dark:text-indigo-900 dark:hover:bg-indigo-50 hover:shadow-indigo-500/20"
                                            >
                                                <PlayCircle size={18} /> Continue Prep
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                );
            }
            case 'banner': {
                const config = component.config as BannerComponentConfig;
                return (
                    <section className="p-6 sm:p-8 rounded-xl shadow-lg text-center border-t-4 border-indigo-500 bg-cover bg-center text-white relative overflow-hidden bg-white dark:bg-gray-800" style={{ backgroundImage: config.imageUrl ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${config.imageUrl})` : 'none' }}>
                         <div className="relative z-10">
                            <h1 className={`text-2xl sm:text-3xl font-extrabold mb-4 ${config.imageUrl ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>{config.title}</h1>
                            <p className={`text-lg mb-6 max-w-2xl mx-auto ${config.imageUrl ? 'text-gray-200' : 'text-gray-600 dark:text-gray-300'}`}>{config.subtitle}</p>
                        </div>
                    </section>
                );
            }
            case 'latest_updates': {
                const config = component.config as LatestUpdatesComponentConfig;
                return <LatestUpdatesComponent config={config} onNavigate={onNavigate} />;
            }
            case 'test_grid': {
                const config = component.config as TestGridComponentConfig;
                return (
                    <section>
                         <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">{config.title || 'Tests'}</h2>
                         {renderCategoryTestArea()}
                    </section>
                );
            }
            case 'announcements': return <AnnouncementsComponent />;
            case 'latest_tests': {
                const config = component.config as LatestTestsComponentConfig;
                const tests = allTests.filter(t => isTestLive(t) && !t.currentAffairsSectionId).slice(0, config.limit);
                return (
                    <section>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">{config.title}</h2>
                        {renderTestGrid(tests, "No new tests available at the moment.")}
                    </section>
                );
            }
            case 'new_additions': {
                const config = component.config as NewAdditionsComponentConfig;
                const tests = allTests.filter(t => isTestLive(t) && !t.currentAffairsSectionId).slice(0, config.limit);
                return (
                    <section>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">{config.title}</h2>
                        {renderTestGrid(tests, "No new items have been added recently.", true)}
                    </section>
                );
            }
            case 'recent_tests': {
                if (!user) return null;
                const config = component.config as RecentTestsComponentConfig;
                const testsToDisplay = recentActivityTests.slice(0, config.limit);
                if (testsToDisplay.length === 0 && !loadingTests) return null;
                return (
                    <section>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">{config.title}</h2>
                        {renderHorizontalTestScroll(testsToDisplay, "You have no recent activity.")}
                    </section>
                );
            }
            case 'featured_category': {
                const config = component.config as FeaturedCategoryComponentConfig;
                if (!config.categoryId) return null;
                const tests = allTests.filter(t => isTestLive(t) && t.categoryId === config.categoryId);
                const category = categories.find(c => c.id === config.categoryId);
                return (
                    <section>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">{config.title || `Featured: ${category?.name}`}</h2>
                        {renderTestGrid(tests, "No tests available in this featured category.")}
                    </section>
                );
            }
            case 'categories_grid': {
                const config = component.config as CategoriesGridComponentConfig;
                const enrolledIds = userProfile?.enrolledCategoryIds || [];
                const topLevelCategories = categories.filter(c => !c.parentId && !enrolledIds.includes(c.id));

                if (topLevelCategories.length === 0) return null;

                return (
                    <section className="py-4">
                        <div className="flex items-center gap-3 mb-6">
                             <div className="h-8 w-1.5 bg-indigo-600 rounded-full"></div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{config.title || "Explore Exams"}</h2>
                        </div>
                        <div className="flex overflow-x-auto space-x-5 pb-8 -mx-4 px-4 scroll-smooth" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            {topLevelCategories.map(cat => {
                                // Calculate Stats
                                const relevantIds = getCategoryAndAllChildrenIds(cat.id);
                                const catTests = allTests.filter(t => relevantIds.includes(t.categoryId || '') && isTestLive(t));
                                const total = catTests.length;
                                const pyqCount = catTests.filter(t => t.section === 'PYQ' || t.title.toLowerCase().includes('pyq') || t.title.toLowerCase().includes('previous year')).length;
                                const sectionTestCount = catTests.filter(t => t.section && t.section !== 'General' && t.section !== 'PYQ' && !t.title.toLowerCase().includes('pyq')).length;
                                const fullTestCount = Math.max(0, total - pyqCount - sectionTestCount);

                                const stats = [
                                    { label: 'All Test Series', count: total },
                                    { label: 'Prev. Year Papers', count: pyqCount },
                                    { label: 'Section Tests', count: sectionTestCount },
                                    { label: 'Full Tests', count: fullTestCount }
                                ];

                                return (
                                <div 
                                    key={cat.id} 
                                    className="flex-shrink-0 w-80 relative overflow-hidden rounded-2xl p-6 shadow-xl border group hover:-translate-y-1 transition-all duration-300 bg-white border-gray-200 text-gray-900 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 dark:border-slate-700 dark:text-white"
                                >
                                     {/* Subtle Background Pattern */}
                                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]"></div>
                                    
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg bg-emerald-50 text-emerald-600 dark:bg-white/10 dark:backdrop-blur-sm dark:text-white">
                                                <DynamicIcon name={cat.icon || cat.name} className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold leading-tight line-clamp-1 text-gray-900 dark:text-white">{cat.name}</h3>
                                                <p className="text-xs font-medium uppercase tracking-wider mt-0.5 text-emerald-600 dark:text-emerald-400">Test Series</p>
                                            </div>
                                        </div>

                                        <div className="space-y-2.5 mb-6">
                                            {stats.map((stat, idx) => (
                                                <div key={idx} className="flex items-center justify-between text-sm">
                                                    <div className="flex items-center gap-2 text-gray-600 dark:text-slate-300">
                                                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                                        <span>{stat.label}</span>
                                                    </div>
                                                    <span className="font-bold text-gray-900 dark:text-white">{stat.count}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <button 
                                            onClick={() => onSelectCategory({ id: cat.id, name: cat.name })} 
                                            className="w-full py-3 font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 hover:shadow-emerald-500/20"
                                        >
                                            Explore Now <ArrowRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            )})}
                        </div>
                    </section>
                );
            }
            case 'current_affairs_grid': {
                const config = component.config as CurrentAffairsGridComponentConfig;
                const topLevelSections = currentAffairsSections.filter(s => !s.parentId);
                 if (topLevelSections.length === 0) return null;
                return (
                    <section className="py-2">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-8 w-1.5 bg-emerald-500 rounded-full"></div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{config.title}</h2>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                            {topLevelSections.map(sec => {
                                const style = getCategoryStyle(sec.name);
                                const relevantIds = getCASectionAndAllChildrenIds(sec.id);
                                const count = allTests.filter(t => relevantIds.includes(t.currentAffairsSectionId || '') && isTestLive(t)).length;

                                return (
                                <button 
                                    key={sec.id} 
                                    onClick={() => onSelectCurrentAffairsSection({ id: sec.id, name: sec.name })} 
                                    className="group relative flex flex-col p-5 h-full w-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden text-left"
                                >
                                     <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-150 ${style.bg}`}></div>

                                    <div className={`w-12 h-12 mb-4 rounded-xl flex items-center justify-center ${style.bg} ${style.text} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                                        <DynamicIcon name={sec.icon || sec.name} className="w-6 h-6" />
                                    </div>
                                    
                                    <div className="relative z-10 w-full">
                                        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1 mb-2">
                                            {sec.name}
                                        </h3>
                                         <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50 px-2.5 py-1 rounded-md">
                                                {count} {count === 1 ? 'Test' : 'Tests'}
                                            </span>
                                            <ArrowRight className="w-4 h-4 text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transform -translate-x-2 group-hover:translate-x-0 transition-all duration-300" />
                                        </div>
                                    </div>
                                </button>
                            )})}
                        </div>
                    </section>
                );
            }
            case 'testimonials': {
                const config = component.config as TestimonialsComponentConfig;
                return (
                    <section>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 text-center">{config.title}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {(config.testimonials || []).map((t, i) => (
                                <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border dark:border-gray-700">
                                    <Quote className="text-indigo-200 dark:text-indigo-700" size={32}/>
                                    <p className="text-gray-600 dark:text-gray-300 my-4 italic">"{t.text}"</p>
                                    <div className="text-right">
                                        <p className="font-semibold text-gray-800 dark:text-gray-100">{t.author}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{t.role}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                );
            }
            case 'stats_counter': {
                const config = component.config as StatsCounterComponentConfig;
                return (
                    <section className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border dark:border-gray-700">
                         <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 text-center">{config.title}</h2>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                             {(config.stats || []).map((s, i) => (
                                 <div>
                                     <p className="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400">{s.value}</p>
                                     <p className="text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
                                 </div>
                             ))}
                         </div>
                    </section>
                );
            }
            case 'faq': {
                const config = component.config as FAQComponentConfig;
                return <FAQComponent config={config} />;
            }
            case 'cta': {
                const config = component.config as CTAComponentConfig;
                const isExternal = config.buttonLink.startsWith('http');
                return (
                    <section className="bg-indigo-700 text-white p-8 rounded-xl shadow-lg text-center">
                        <h2 className="text-3xl font-extrabold">{config.headline}</h2>
                        <p className="mt-2 text-indigo-200 max-w-2xl mx-auto">{config.description}</p>
                        <button onClick={() => isExternal ? window.open(config.buttonLink, '_blank') : onNavigate(config.buttonLink)} className="mt-6 px-8 py-3 bg-white text-indigo-700 font-bold rounded-lg shadow-md hover:bg-gray-200 transition">
                            {config.buttonText}
                        </button>
                    </section>
                );
            }
            case 'rich_text': {
                const config = component.config as RichTextComponentConfig;
                return (
                    <section className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border dark:border-gray-700">
                        <div className="prose prose-indigo dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: config.content }} />
                    </section>
                );
            }
            case 'syllabus':
            case 'notes':
            case 'information': {
                const config = component.config as (SyllabusComponentConfig | NotesComponentConfig | InformationComponentConfig);
                return (
                    <section>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-3">
                           <Info /> {config.title}
                        </h2>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border dark:border-gray-700">
                            <div className="prose prose-indigo dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: config.content }} />
                        </div>
                    </section>
                );
            }
            case 'recommended_tests': {
                if (!user) return null;
                const config = component.config as RecommendedTestsComponentConfig;
                const testsToDisplay = recommendedTests.slice(0, config.limit);
                if (loadingRecommendations || testsToDisplay.length === 0) return null;
                return (
                    <section>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-3">
                            <Star className="text-amber-500" /> {config.title}
                        </h2>
                         <p className="text-gray-600 dark:text-gray-300 -mt-4 mb-6">Based on your performance, you might want to try these tests to improve.</p>
                        {renderTestGrid(testsToDisplay, "No recommendations available right now.")}
                    </section>
                );
            }
            case 'countdown_timer': {
                const config = component.config as CountdownTimerComponentConfig;
                return <CountdownTimerComponent config={config} />;
            }
            case 'video_embed': {
                const config = component.config as VideoEmbedComponentConfig;
                return (
                    <section>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">{config.title}</h2>
                        <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
                            <iframe
                                className="w-full h-full"
                                src={`https://www.youtube.com/embed/${config.youtubeVideoId}`}
                                title="YouTube video player"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        </div>
                    </section>
                );
            }
            case 'leaderboard': {
                const config = component.config as LeaderboardComponentConfig;
                const topPerformers = leaderboardData.slice(0, config.limit);
                return (
                    <section>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-3"><Trophy className="text-amber-500" /> {config.title}</h2>
                        {loadingLeaderboard ? (
                            <div className="space-y-3">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg animate-pulse">
                                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                                        <div className="flex-1 h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                        <div className="w-16 h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {topPerformers.map((user, index) => (
                                    <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm">
                                        <span className={`font-bold text-lg w-8 text-center ${index < 3 ? 'text-amber-500' : 'text-gray-500 dark:text-gray-400'}`}>{index + 1}</span>
                                        <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-300">{user.name.charAt(0)}</div>
                                        <span className="font-semibold text-gray-800 dark:text-gray-100 flex-1">{user.name}</span>
                                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{user.score.toFixed(2)}%</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                );
            }
            case 'image_gallery': {
                const config = component.config as ImageGalleryComponentConfig;
                return (
                    <section>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">{config.title}</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {(config.images || []).map((image, index) => (
                                <div key={index} className="group relative overflow-hidden rounded-lg shadow-lg">
                                    <img src={image.src} alt={image.alt} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                                    {image.caption && <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/50 text-white text-xs text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">{image.caption}</div>}
                                </div>
                            ))}
                        </div>
                    </section>
                );
            }
            case 'featured_tutors': {
                const config = component.config as FeaturedTutorsComponentConfig;
                return (
                    <section>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">{config.title}</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {(config.tutors || []).map((tutor, index) => (
                                <div key={index} className="text-center bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border dark:border-gray-700">
                                    <img src={tutor.imageUrl} alt={tutor.name} className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-4 border-indigo-200" />
                                    <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100">{tutor.name}</h4>
                                    <p className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold">{tutor.specialty}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                );
            }
            default: return null;
        }
    };
    
    const currentFilterName = searchQuery ? `Search results for "${searchQuery}"` : selectedCategory.id ? `${selectedCategory.name} Tests` : selectedCurrentAffairsSection.id ? `${selectedCurrentAffairsSection.name}` : `All Tests`;

    const isShowingFilteredView = searchQuery || selectedCategory.id || selectedCurrentAffairsSection.id;

    const isInitialLoad = homepageSettings === null && !isShowingFilteredView;

    const selectedCategoryParent = useMemo(() => {
        if (!selectedCategory.id) return null;
        const current = categories.find(c => c.id === selectedCategory.id);
        if (current?.parentId) {
            return categories.find(c => c.id === current.parentId);
        }
        return null;
    }, [selectedCategory, categories]);

    if (isInitialLoad && !isPreview) {
        return <SkeletonHomePage />;
    }

    return (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col lg:flex-row gap-8">
                <DesktopSidebar 
                    categories={categories}
                    loading={loadingCategories}
                    selectedCategory={selectedCategory}
                    onSelectCategory={onSelectCategory}
                    onNavigate={onNavigate}
                />
                <div className="flex-1 space-y-12">
                     {userProfile?.role === 'admin' && !isPreview && (
                        <div className="bg-indigo-50 dark:bg-gray-800 border-2 border-dashed border-indigo-200 dark:border-gray-700 p-6 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <Shield className="w-10 h-10 text-indigo-500 dark:text-indigo-400" />
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Admin Controls</h3>
                                    <p className="text-gray-600 dark:text-gray-300">Access the dashboard to manage the application.</p>
                                </div>
                            </div>
                            <button onClick={() => onNavigate('admin')} className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2 shrink-0">
                                Go to Dashboard <ArrowRight size={16} />
                            </button>
                        </div>
                    )}
                    
                    {!isShowingFilteredView && (
                        <>
                            {(homepageSettings?.layout || []).map(comp => 
                                <React.Fragment key={comp.id}>{renderHomepageComponent(comp)}</React.Fragment>
                            )}
                        </>
                    )}

                    {isShowingFilteredView && (
                        <section>
                            {selectedCategory.id && !searchQuery ? (
                                 <div className="flex flex-col border-b border-gray-200 dark:border-gray-700 pb-6 mb-8 gap-4">
                                    <div className="flex items-start gap-4">
                                        {selectedCategoryParent && (
                                            <button 
                                                onClick={() => onSelectCategory({ id: selectedCategoryParent.id, name: selectedCategoryParent.name })}
                                                className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 mt-1"
                                                title={`Back to ${selectedCategoryParent.name}`}
                                            >
                                                <ArrowLeft size={24} />
                                            </button>
                                        )}
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm ${getCategoryStyle(selectedCategory.name).bg} ${getCategoryStyle(selectedCategory.name).text}`}>
                                            <DynamicIcon name={categories.find(c => c.id === selectedCategory.id)?.icon || selectedCategory.name} className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <div className="flex flex-wrap items-center gap-3">
                                                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">
                                                    {selectedCategory.name}
                                                </h1>
                                                {!isPreview && userProfile?.enrolledCategoryIds?.includes(selectedCategory.id) && (
                                                    <button 
                                                        onClick={() => onNavigate(`dashboard:${selectedCategory.id}`)} 
                                                        className="px-4 py-1.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 text-sm font-bold rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-all shadow-sm flex items-center gap-2"
                                                    >
                                                        <LayoutDashboard size={16} /> ScoreBoard
                                                    </button>
                                                )}
                                                {!isPreview && !userProfile?.enrolledCategoryIds?.includes(selectedCategory.id) && !selectedCategoryParent && (
                                                     <button 
                                                        onClick={() => handleEnroll(selectedCategory.id)}
                                                        disabled={enrollingCategoryId === selectedCategory.id}
                                                        className="px-4 py-1.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-all shadow-md flex items-center gap-2"
                                                    >
                                                       {enrollingCategoryId === selectedCategory.id ? <Loader2 className="animate-spin" size={16}/> : <BookmarkPlus size={16}/>} Enroll Free
                                                    </button>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                {selectedCategoryParent 
                                                    ? `${selectedCategoryParent.name} ${selectedCategory.name} Test Series`
                                                    : "Full and Topic wise Test"
                                                }
                                            </p>
                                        </div>
                                    </div>
                                 </div>
                            ) : (
                                 <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end border-b dark:border-gray-700 pb-3 mb-6 gap-4">
                                     <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{currentFilterName}</h2>
                                 </div>
                            )}
                             
                            <div className="mt-6" id="test-grid-section">
                                {loadingCategorySettings ? <SkeletonHomePage /> :
                                categorySettings && categorySettings.layout && categorySettings.layout.length > 0 ? (
                                    <div className="space-y-12">
                                        {(categorySettings.layout || []).map(comp =>
                                            <React.Fragment key={comp.id}>{renderHomepageComponent(comp, filteredTests)}</React.Fragment>
                                        )}
                                        {!(categorySettings.layout || []).some(c => c.type === 'test_grid' && c.enabled) && (
                                            renderCategoryTestArea()
                                        )}
                                    </div>
                                ) : (
                                    renderCategoryTestArea()
                                )
                                }
                            </div>
                        </section>
                    )}
                </div>
            </div>
             <VideoPlayerModal isOpen={!!videoToPlay} onClose={() => setVideoToPlay(null)} videoUrl={videoToPlay} />
             <ConfirmModal
                isOpen={enrollModalOpen}
                onClose={() => { setEnrollModalOpen(false); setPendingTest(null); }}
                onConfirm={confirmEnrollment}
                title="Enroll in Test Series"
                message={
                    <div>
                        <p className="mb-2">To take this test, please enroll in the <strong>{selectedCategory.name}</strong> series.</p>
                        <p className="text-sm text-gray-500">Enrollment is completely free and allows you to track your progress.</p>
                    </div>
                }
                confirmText={enrollingCategoryId ? "Enrolling..." : "Enroll Now"}
            />
        </div>
    );
};

export default HomePage;
