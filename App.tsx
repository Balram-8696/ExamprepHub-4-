
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, doc, getDoc, setDoc, serverTimestamp, writeBatch, limit, Timestamp, addDoc } from 'firebase/firestore';
import { auth, db } from './services/firebase';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import HomePage from './components/pages/HomePage';
import TestView from './components/pages/TestView';
import HistoryPage from './components/pages/HistoryPage';
import AboutPage from './components/pages/AboutPage';
import ContactPage from './components/pages/ContactPage';
import PrivacyPolicyPage from './components/pages/PrivacyPolicyPage';
import { CustomPageView } from './components/pages/CustomPageView';
import MobileMenu from './components/layout/MobileMenu';
import AdminDashboard from './components/admin/AdminDashboard';
import ProfilePage from './components/pages/ProfilePage';
import SettingsPage from './components/pages/SettingsPage';
import Breadcrumbs from './components/layout/Breadcrumbs';
import { Test, UserResult, Category, UserProfile, Notification, FooterConfig, CurrentAffairsSection, ViewType } from './types';
import { showMessage, formatFirebaseError } from './utils/helpers';
import InstructionsPage from './components/pages/InstructionsPage';
import NotificationDetailModal from './components/modals/NotificationDetailModal';
import ChatModal from './components/modals/ChatModal';
import UpdatesPage from './components/pages/UpdatesPage';
import UpdateArticleView from './components/pages/UpdateArticleView';
import { AuthModal } from './components/modals/AuthModal';
import CategoryDashboard from './components/pages/CategoryDashboard';
import LiveTestsPage from './components/pages/LiveTestsPage';
import LiveExamWaitingRoom from './components/live/LiveExamWaitingRoom';
import EnrolledExamsPage from './components/pages/EnrolledExamsPage';
import { AuthContext } from './AuthContext';

type ActiveTestData = {
    test: Test;
    action: 'start' | 'resume' | 'result';
    resultData?: UserResult;
    language: 'english' | 'hindi';
};

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [view, setView] = useState<ViewType>('home');
    const [lastView, setLastView] = useState<ViewType>('home');
    const [isAdminView, setIsAdminView] = useState(false);
    const [activeTestData, setActiveTestData] = useState<ActiveTestData | null>(null);
    const [testForInstructions, setTestForInstructions] = useState<Test | null>(null);
    const [activePageSlug, setActivePageSlug] = useState<string | null>(null);
    const [activeArticleSlug, setActiveArticleSlug] = useState<string | null>(null);
    const [activeDashboardCategoryId, setActiveDashboardCategoryId] = useState<string | null>(null);
    const [activeLiveExamId, setActiveLiveExamId] = useState<string | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Initialize categories from localStorage if available
    const [categories, setCategories] = useState<Category[]>(() => {
        try {
            const cached = localStorage.getItem('categories');
            return cached ? JSON.parse(cached) : [];
        } catch { return []; }
    });
    
    // Initialize CA Sections from localStorage if available
    const [currentAffairsSections, setCurrentAffairsSections] = useState<CurrentAffairsSection[]>(() => {
        try {
            const cached = localStorage.getItem('currentAffairsSections');
            return cached ? JSON.parse(cached) : [];
        } catch { return []; }
    });

    const [loadingCategories, setLoadingCategories] = useState(categories.length === 0);
    const [selectedCategory, setSelectedCategory] = useState<{ id: string, name: string }>({ id: '', name: 'All Tests' });
    const [selectedCurrentAffairsSection, setSelectedCurrentAffairsSection] = useState<{ id: string, name: string }>({ id: '', name: 'All' });
    
    // Initialize Footer from localStorage
    const [footerConfig, setFooterConfig] = useState<FooterConfig | null>(() => {
        try {
            const cached = localStorage.getItem('footerConfig');
            return cached ? JSON.parse(cached) : null;
        } catch { return null; }
    });
    
    const [breadcrumbs, setBreadcrumbs] = useState<{ label: string, path?: string }[]>([]);
    const [customPageTitle, setCustomPageTitle] = useState<string | null>(null);

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [notificationToShow, setNotificationToShow] = useState<Notification | null>(null);
    const [isChatModalOpen, setIsChatModalOpen] = useState(false);
    const [authModalState, setAuthModalState] = useState({ isOpen: false, initialView: 'signin' as 'signin' | 'signup' });


    useEffect(() => {
        // Load cached styles first
        const cachedStyles = localStorage.getItem('dynamicStyles');
        if (cachedStyles) {
             const styleElement = document.getElementById('live-dynamic-styles') || document.createElement('style');
             styleElement.id = 'live-dynamic-styles';
             styleElement.innerHTML = cachedStyles;
             if (!document.getElementById('live-dynamic-styles')) document.head.appendChild(styleElement);
        }

        const stylesDocRef = doc(db, 'uiSettings', 'dynamicStyles');
        const unsubscribe = onSnapshot(stylesDocRef, (docSnap) => {
            const existingStyleElement = document.getElementById('live-dynamic-styles');
            if (existingStyleElement) {
                existingStyleElement.remove();
            }

            if (docSnap.exists()) {
                const css = docSnap.data().css;
                if (css) {
                    const styleElement = document.createElement('style');
                    styleElement.id = 'live-dynamic-styles';
                    styleElement.innerHTML = css;
                    document.head.appendChild(styleElement);
                    localStorage.setItem('dynamicStyles', css); // Cache updated styles
                }
            }
        }, (error) => {
            console.error("Could not listen to dynamic UI styles:", error);
            // showMessage(formatFirebaseError(error, "Error: Could not load dynamic UI styles."), true);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        let profileUnsubscribe: (() => void) | undefined;

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (profileUnsubscribe) profileUnsubscribe();

            if (currentUser) {
                // Try loading cached profile immediately
                const cachedProfile = localStorage.getItem(`userProfile_${currentUser.uid}`);
                if (cachedProfile) {
                    try {
                        setUserProfile(JSON.parse(cachedProfile));
                    } catch (e) { console.error("Failed to parse cached profile"); }
                }

                const userDocRef = doc(db, 'users', currentUser.uid);
                
                profileUnsubscribe = onSnapshot(userDocRef, (userDoc) => {
                    const isDefaultAdmin = currentUser.email === 'resotainofficial@gmail.com';

                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        const profile: UserProfile = {
                            uid: currentUser.uid,
                            email: currentUser.email!,
                            role: isDefaultAdmin ? 'admin' : data.role,
                            createdAt: data.createdAt,
                            name: data.name || currentUser.displayName || currentUser.email!.split('@')[0],
                            mobileNumber: data.mobileNumber || '',
                            notificationSettings: data.notificationSettings ?? { newContent: true, adminReplies: true },
                            enrolledCategoryIds: data.enrolledCategoryIds || [],
                        };
                        setUserProfile(profile);
                        localStorage.setItem(`userProfile_${currentUser.uid}`, JSON.stringify(profile)); // Cache profile
                    } else {
                        const role = isDefaultAdmin ? 'admin' : 'user';
                        const name = currentUser.displayName || currentUser.email!.split('@')[0];
                        const newProfile: UserProfile = {
                            uid: currentUser.uid,
                            email: currentUser.email!,
                            name: name,
                            role: role,
                            createdAt: serverTimestamp() as any,
                            mobileNumber: '',
                            notificationSettings: { newContent: true, adminReplies: true },
                            enrolledCategoryIds: [],
                        };
                        setUserProfile(newProfile);
                        localStorage.setItem(`userProfile_${currentUser.uid}`, JSON.stringify(newProfile));
                        setDoc(userDocRef, {
                            name: name,
                            email: currentUser.email,
                            createdAt: serverTimestamp(),
                            role: role,
                            mobileNumber: '',
                            notificationSettings: { newContent: true, adminReplies: true },
                            enrolledCategoryIds: [],
                        });
                    }
                }, (error) => {
                    console.error("Error fetching user profile:", error);
                    showMessage(formatFirebaseError(error, "Error: Could not load user profile."), true);
                });

            } else {
                setUserProfile(null);
                setIsAdminView(false);
                setNotifications([]);
            }
        });

        const qCategories = query(collection(db, 'testCategories'), orderBy('name'));
        const unsubscribeCategories = onSnapshot(qCategories, (snapshot) => {
            const categoriesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
            setCategories(categoriesData);
            localStorage.setItem('categories', JSON.stringify(categoriesData)); // Cache categories
            setLoadingCategories(false);
        }, (error) => {
            console.error("Error fetching categories:", error);
            // showMessage(formatFirebaseError(error, "Error: Could not load categories."), true);
            setLoadingCategories(false);
        });

        const qCASections = query(collection(db, 'currentAffairsSections'), orderBy('name'));
        const unsubscribeCASections = onSnapshot(qCASections, (snapshot) => {
            const sectionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CurrentAffairsSection));
            setCurrentAffairsSections(sectionsData);
            localStorage.setItem('currentAffairsSections', JSON.stringify(sectionsData)); // Cache sections
        }, (error) => {
            console.error("Error fetching current affairs sections:", error);
            // showMessage(formatFirebaseError(error, "Error: Could not load current affairs sections."), true);
        });
        
        const footerConfigRef = doc(db, 'uiSettings', 'footer');
        const unsubscribeFooter = onSnapshot(footerConfigRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as FooterConfig;
                setFooterConfig(data);
                localStorage.setItem('footerConfig', JSON.stringify(data)); // Cache footer
            } else {
                 const defaultFooter = {
                    links: [
                        { label: 'Home', path: 'home' },
                        { label: 'About Us', path: 'about' },
                        { label: 'Contact Us', path: 'contact' },
                        { label: 'Privacy Policy', path: 'privacy' },
                    ]
                 };
                 setFooterConfig(defaultFooter);
                 localStorage.setItem('footerConfig', JSON.stringify(defaultFooter));
            }
        }, (error) => {
            console.error("Error fetching footer config:", error);
            // showMessage(formatFirebaseError(error, "Error: Could not load footer settings."), true);
        });

        return () => {
            unsubscribeAuth();
            if (profileUnsubscribe) profileUnsubscribe();
            unsubscribeCategories();
            unsubscribeFooter();
            unsubscribeCASections();
        };
    }, []);

     useEffect(() => {
        if (!user) {
            setNotifications([]);
            return;
        }

        const notifQuery = query(
            collection(db, 'users', user.uid, 'notifications'), 
            orderBy('createdAt', 'desc'), 
            limit(15)
        );
        const unsubscribeNotifs = onSnapshot(notifQuery, (snapshot) => {
            const notifsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
            setNotifications(notifsData);
        }, (error) => {
            console.error("Error fetching user notifications:", error);
            showMessage(formatFirebaseError(error, "Error: Could not load notifications."), true);
        });

        const checkNewContent = async () => {
            if (userProfile?.notificationSettings?.newContent === false) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists() && userDoc.data().newTests > 0) {
                         await setDoc(doc(db, 'users', user.uid), { newTests: 0 }, { merge: true });
                    }
                } catch (error) {
                    console.error("Error checking new content notification setting:", error);
                }
                return;
            };

            const lastCheckString = localStorage.getItem(`lastContentCheck_${user.uid}`);
            // const lastCheckTimestamp = lastCheckString ? Timestamp.fromDate(new Date(lastCheckString)) : Timestamp.fromDate(new Date(0));
            
            try {
                const contentSnapshot = await getDoc(doc(db, 'users', user.uid));
                if (contentSnapshot.exists()) {
                    const newTests = contentSnapshot.data().newTests || 0;
                    if (newTests > 0) {
                         const message = newTests === 1 ? '1 new test has been added!' : `${newTests} new tests have been added!`;
                         const userNotificationsRef = collection(db, 'users', user.uid, 'notifications');
                         await addDoc(userNotificationsRef, {
                             type: 'new_content',
                             message: message,
                             link: 'home',
                             createdAt: serverTimestamp(),
                             isRead: false,
                         });
                         await setDoc(doc(db, 'users', user.uid), { newTests: 0 }, { merge: true });
                    }
                }
                localStorage.setItem(`lastContentCheck_${user.uid}`, new Date().toISOString());
            } catch (error) {
                console.error("Error checking for new content:", error);
                showMessage(formatFirebaseError(error, "Error: Could not check for new content."), true);
            }
        };
        checkNewContent();


        return () => {
            unsubscribeNotifs();
        };
    }, [user, userProfile]);

     useEffect(() => {
        const newBreadcrumbs: { label: string, path?: string }[] = [{ label: 'Home', path: 'home' }];

        const findCategoryPath = (catId: string, allCats: Category[]): Category[] => {
            const path: Category[] = [];
            let currentCat = allCats.find(c => c.id === catId);
            while (currentCat) {
                path.unshift(currentCat);
                currentCat = allCats.find(c => c.id === currentCat?.parentId);
            }
            return path;
        };

        const findCASectionPath = (sectionId: string, allSections: CurrentAffairsSection[]): CurrentAffairsSection[] => {
            const path: CurrentAffairsSection[] = [];
            let current = allSections.find(s => s.id === sectionId);
            while(current) {
                path.unshift(current);
                current = allSections.find(s => s.id === current?.parentId);
            }
            return path;
        }
        
        if (testForInstructions) {
            newBreadcrumbs.push({ label: testForInstructions.title });
        } else if (isAdminView) {
            newBreadcrumbs.push({ label: 'Admin Dashboard' });
        } else if (activeTestData) {
            if (activeTestData.action === 'result' && view === 'history') {
                newBreadcrumbs.push({ label: 'My Results', path: 'history' });
            }
            newBreadcrumbs.push({ label: activeTestData.test.title });
        } else if (activePageSlug) {
            newBreadcrumbs.push({ label: customPageTitle || '...' });
        } else if (activeArticleSlug) {
            newBreadcrumbs.push({ label: 'Updates', path: 'updates' });
            newBreadcrumbs.push({ label: customPageTitle || '...' });
        } else if (view === 'category-dashboard' && activeDashboardCategoryId) {
             newBreadcrumbs.push({ label: 'Dashboard' });
             const cat = categories.find(c => c.id === activeDashboardCategoryId);
             if(cat) newBreadcrumbs.push({ label: cat.name });
        } else if (view === 'live-exams') {
            newBreadcrumbs.push({ label: 'Live Exams' });
        } else if (view === 'live-waiting-room') {
            newBreadcrumbs.push({ label: 'Live Exams', path: 'live-exams' });
            newBreadcrumbs.push({ label: 'Waiting Room' });
        } else if (view === 'enrolled-exams') {
            newBreadcrumbs.push({ label: 'Your Exams' });
        } else {
            switch(view) {
                case 'home':
                    if (selectedCategory.id) {
                        newBreadcrumbs.push({ label: 'Test Categories', path: 'home' });
                        const categoryPath = findCategoryPath(selectedCategory.id, categories);
                        categoryPath.forEach(cat => {
                            newBreadcrumbs.push({ label: cat.name, path: `category:${cat.id}` });
                        });
                    } else if (selectedCurrentAffairsSection.id) {
                         newBreadcrumbs.push({ label: 'Current Affairs', path: 'home' });
                        const sectionPath = findCASectionPath(selectedCurrentAffairsSection.id, currentAffairsSections);
                        sectionPath.forEach(sec => {
                            newBreadcrumbs.push({ label: sec.name, path: `ca-section:${sec.id}` });
                        });
                    }
                    break;
                case 'updates':
                    newBreadcrumbs.push({ label: 'Updates' });
                    break;
                case 'history':
                    newBreadcrumbs.push({ label: 'My Results' });
                    break;
                case 'about':
                    newBreadcrumbs.push({ label: 'About Us' });
                    break;
                case 'contact':
                    newBreadcrumbs.push({ label: 'Contact Us' });
                    break;
                case 'privacy':
                    newBreadcrumbs.push({ label: 'Privacy Policy' });
                    break;
                case 'profile':
                    newBreadcrumbs.push({ label: 'My Profile' });
                    break;
                case 'settings':
                    newBreadcrumbs.push({ label: 'Settings' });
                    break;
            }
        }

        setBreadcrumbs(newBreadcrumbs);
    }, [view, isAdminView, activeTestData, activePageSlug, activeArticleSlug, selectedCategory, categories, customPageTitle, testForInstructions, selectedCurrentAffairsSection, currentAffairsSections, activeDashboardCategoryId, activeLiveExamId]);
    
    const handleMarkAsRead = async (ids: string[]) => {
        if (!user || ids.length === 0) return;
        const batch = writeBatch(db);
        ids.forEach(id => {
            const notifRef = doc(db, 'users', user.uid, 'notifications', id);
            batch.update(notifRef, { isRead: true });
        });
        try {
            await batch.commit();
        } catch (error) {
            console.error("Error marking notifications as read:", error);
            showMessage(formatFirebaseError(error, "Error: Could not mark notifications as read."), true);
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        if (notification.type === 'admin_reply') {
            setNotificationToShow(notification);
        } else if (notification.type === 'chat_reply') {
            setIsChatModalOpen(true);
        } else if (notification.link) {
            handleNavigation(notification.link);
        }
    };

    const staticViews: ViewType[] = ['home', 'history', 'about', 'contact', 'privacy', 'admin', 'profile', 'settings', 'updates', 'live-exams', 'enrolled-exams'];

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (query.trim() !== '') {
            setSelectedCategory({ id: '', name: 'All Tests' });
            setSelectedCurrentAffairsSection({ id: '', name: 'All' });
            if (view !== 'home' || testForInstructions || activeTestData || activePageSlug || activeArticleSlug) {
                setActiveTestData(null);
                setTestForInstructions(null);
                setActivePageSlug(null);
                setActiveArticleSlug(null);
                setIsAdminView(false);
                setView('home');
            }
        }
    };

    const handleNavigation = (newView: string, extraId?: string) => {
        if (newView !== view) {
            setLastView(view);
        }
        
        setIsMobileMenuOpen(false);
        setActiveTestData(null);
        setTestForInstructions(null);
        setActivePageSlug(null);
        setActiveArticleSlug(null);
        setActiveDashboardCategoryId(null);
        setActiveLiveExamId(null);
        setIsAdminView(false);

        if (newView.startsWith('category:')) {
            const catId = newView.split(':')[1];
            const category = categories.find(c => c.id === catId);
            if (category) {
                setSelectedCategory({ id: catId, name: category.name });
                setSelectedCurrentAffairsSection({ id: '', name: 'All' });
            }
            setView('home');
        } else if (newView.startsWith('dashboard:')) {
            const catId = newView.split(':')[1];
            setActiveDashboardCategoryId(catId);
            setView('category-dashboard');
        } else if (newView.startsWith('ca-section:')) {
            const sectionId = newView.split(':')[1];
            const section = currentAffairsSections.find(s => s.id === sectionId);
            if(section) {
                setSelectedCurrentAffairsSection({ id: sectionId, name: section.name });
                setSelectedCategory({ id: '', name: 'All Tests' });
            }
            setView('home');
        } else if (newView.startsWith('update/')) {
            const slug = newView.split('/')[1];
            setActiveArticleSlug(slug);
            setView('updateArticle');
        } else if (newView === 'live-waiting-room' && extraId) {
            setActiveLiveExamId(extraId);
            setView('live-waiting-room');
        } else if (staticViews.includes(newView as ViewType)) {
            setView(newView as ViewType);
            if (newView === 'home') {
                setSearchQuery('');
                setSelectedCategory({ id: '', name: 'All Tests' });
                setSelectedCurrentAffairsSection({ id: '', name: 'All' });
            }
            if (newView === 'admin') {
                setIsAdminView(true);
            }
        } else {
            setActivePageSlug(newView);
        }
    };

    const handleBack = () => {
        if (view === 'live-waiting-room') {
            handleNavigation('live-exams');
        } else {
            handleNavigation(lastView);
        }
    };

    const handleSelectCategory = (category: { id: string, name: string }) => {
        setSelectedCategory(category);
        setSelectedCurrentAffairsSection({id: '', name: 'All'});
        setSearchQuery('');
        setIsMobileMenuOpen(false);
        setView('home');
    };
    
    const handleSelectCurrentAffairsSection = (section: {id: string, name: string}) => {
        setSelectedCurrentAffairsSection(section);
        setSelectedCategory({id: '', name: 'All Tests'});
        setSearchQuery('');
        setIsMobileMenuOpen(false);
        setView('home');
    }

    const handleInitiateTestView = (details: ActiveTestData) => {
        setActiveTestData(details);
        // If user was in waiting room, we are now entering test view, so waiting room view is irrelevant
        if (view === 'live-waiting-room') {
            setActiveLiveExamId(null);
        }
    };

    const handleShowInstructions = (test: Test) => {
        setTestForInstructions(test);
    };

    const handleStartTest = (language: 'english' | 'hindi') => {
        if (testForInstructions) {
            handleInitiateTestView({ test: testForInstructions, action: 'start', language });
            setTestForInstructions(null);
        }
    };
    
    // Handler specifically for live exam start from waiting room (skips instructions page as waiting room covers it)
    const handleStartLiveTest = (test: Test) => {
        if (!user) {
            setAuthModalState({ isOpen: true, initialView: 'signup' });
            return;
        }
        handleInitiateTestView({ test, action: 'start', language: 'english' }); // Could prompt for language, defaulting to english for now
    };

    const exitTestView = () => {
        setActiveTestData(null);
        setView('home');
    };
    
    const handleSwitchToUserView = () => {
        setIsAdminView(false);
        setView('home');
    };

    const renderView = () => {
        if (isAdminView) {
            return <AdminDashboard />;
        }
        if (testForInstructions) {
            return <InstructionsPage test={testForInstructions} onStartTest={handleStartTest} onBack={() => setTestForInstructions(null)} />;
        }
        if (activeTestData) {
            return <TestView {...activeTestData} onExitTestView={exitTestView} />;
        }
        if (activePageSlug) {
            return <CustomPageView slug={activePageSlug} onNavigate={handleNavigation} onBack={handleBack} onPageLoad={setCustomPageTitle} />;
        }
        if (activeArticleSlug) {
            return <UpdateArticleView 
                slug={activeArticleSlug} 
                onNavigate={handleNavigation} 
                onPageLoad={setCustomPageTitle}
                onInitiateTestView={handleInitiateTestView}
                onShowInstructions={handleShowInstructions}
            />;
        }
        if (view === 'category-dashboard' && activeDashboardCategoryId) {
            return <CategoryDashboard 
                categoryId={activeDashboardCategoryId} 
                onNavigate={handleNavigation} 
                onBack={() => handleNavigation('home')} 
            />;
        }
        if (view === 'live-exams') {
            return <LiveTestsPage onNavigate={handleNavigation} />;
        }
        if (view === 'live-waiting-room' && activeLiveExamId) {
            return <LiveExamWaitingRoom 
                testId={activeLiveExamId} 
                onBack={() => handleNavigation('live-exams')} 
                onStartTest={handleStartLiveTest}
            />;
        }
        if (view === 'enrolled-exams') {
            return <EnrolledExamsPage onNavigate={handleNavigation} />;
        }

        switch (view) {
            case 'home':
                return <HomePage 
                    onInitiateTestView={handleInitiateTestView} 
                    onShowInstructions={handleShowInstructions}
                    categories={categories} 
                    loadingCategories={loadingCategories}
                    selectedCategory={selectedCategory}
                    onSelectCategory={handleSelectCategory}
                    currentAffairsSections={currentAffairsSections}
                    onSelectCurrentAffairsSection={handleSelectCurrentAffairsSection}
                    selectedCurrentAffairsSection={selectedCurrentAffairsSection}
                    searchQuery={searchQuery}
                    onNavigate={handleNavigation}
                    onOpenAuthModal={(initialView = 'signup') => setAuthModalState({ isOpen: true, initialView })}
                />;
            case 'updates':
                return <UpdatesPage onNavigate={handleNavigation} />;
            case 'history':
                return <HistoryPage onInitiateTestView={handleInitiateTestView} />;
            case 'about':
                return <AboutPage onNavigate={handleNavigation} onBack={handleBack} />;
            case 'contact':
                return <ContactPage onNavigate={handleNavigation} onBack={handleBack} />;
            case 'privacy':
                return <PrivacyPolicyPage onNavigate={handleNavigation} onBack={handleBack} />;
            case 'profile':
                 return <ProfilePage />;
            case 'settings':
                return <SettingsPage />;
            default:
                return <HomePage 
                    onInitiateTestView={handleInitiateTestView} 
                    onShowInstructions={handleShowInstructions}
                    categories={categories} 
                    loadingCategories={loadingCategories}
                    selectedCategory={selectedCategory}
                    onSelectCategory={handleSelectCategory}
                    currentAffairsSections={currentAffairsSections}
                    onSelectCurrentAffairsSection={handleSelectCurrentAffairsSection}
                    selectedCurrentAffairsSection={selectedCurrentAffairsSection}
                    searchQuery={searchQuery}
                    onNavigate={handleNavigation}
                    onOpenAuthModal={(initialView = 'signup') => setAuthModalState({ isOpen: true, initialView })}
                />;
        }
    };

    const showFooter = !isAdminView && 
                       view === 'home' && 
                       !selectedCategory.id && 
                       !selectedCurrentAffairsSection.id && 
                       !searchQuery && 
                       !testForInstructions && 
                       !activeTestData &&
                       view !== 'live-waiting-room'; // Don't show footer in waiting room

    return (
        <AuthContext.Provider value={{ user, userProfile }}>
            {activeTestData || testForInstructions || view === 'live-waiting-room' ? (
                 <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">
                    {renderView()}
                </div>
            ) : (
                <div className={`flex flex-col min-h-screen ${isAdminView ? 'bg-slate-50 dark:bg-gray-900' : 'bg-white dark:bg-slate-900'}`}>
                    <Header 
                        onNavigate={handleNavigation} 
                        onMenuClick={() => setIsMobileMenuOpen(true)} 
                        isAdminView={isAdminView}
                        onSwitchToUserView={handleSwitchToUserView}
                        searchQuery={searchQuery}
                        onSearch={handleSearch}
                        notifications={notifications}
                        onOpenChat={() => setIsChatModalOpen(true)}
                        onMarkAsRead={handleMarkAsRead}
                        onNotificationClick={handleNotificationClick}
                        onOpenAuthModal={() => setAuthModalState({ isOpen: true, initialView: 'signin' })}
                    />
                    {!isAdminView && <Breadcrumbs items={breadcrumbs} onNavigate={handleNavigation} />}
                    <MobileMenu 
                        isOpen={isMobileMenuOpen} 
                        onClose={() => setIsMobileMenuOpen(false)}
                        categories={categories}
                        loading={loadingCategories}
                        onSelectCategory={handleSelectCategory}
                        onNavigate={handleNavigation}
                    />
                    <main className="flex-grow">
                        {renderView()}
                    </main>
                    {showFooter && <Footer onNavigate={handleNavigation} config={footerConfig} />}
                    <NotificationDetailModal 
                        isOpen={!!notificationToShow}
                        onClose={() => setNotificationToShow(null)}
                        notification={notificationToShow}
                    />
                    <ChatModal
                        isOpen={isChatModalOpen}
                        onClose={() => setIsChatModalOpen(false)}
                    />
                    <AuthModal
                        isOpen={authModalState.isOpen}
                        initialView={authModalState.initialView}
                        onClose={() => setAuthModalState({ isOpen: false, initialView: 'signin' })}
                    />
                </div>
            )}
        </AuthContext.Provider>
    );
};

export default App;
