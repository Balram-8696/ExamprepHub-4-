
import React, { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, setDoc, collection, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../../services/firebase';
import { showMessage } from '../../../utils/helpers';
import { Category, HomepageSettings, HomeComponent, BannerComponentConfig, FeaturedCategoryComponentConfig, LatestTestsComponentConfig, CategoriesGridComponentConfig, RichTextComponentConfig, RecentTestsComponentConfig, AnnouncementsComponentConfig, TestimonialsComponentConfig, Testimonial, StatsCounterComponentConfig, Stat, FAQComponentConfig, FAQ, CTAComponentConfig, SyllabusComponentConfig, NotesComponentConfig, InformationComponentConfig, NewAdditionsComponentConfig, RecommendedTestsComponentConfig, CountdownTimerComponentConfig, VideoEmbedComponentConfig, LeaderboardComponentConfig, ImageGalleryComponentConfig, GalleryImage, FeaturedTutorsComponentConfig, Tutor, CurrentAffairsGridComponentConfig, TestGridComponentConfig, CurrentAffairsSection, LatestUpdatesComponentConfig, YourExamsComponentConfig, LiveExamsComponentConfig } from '../../../types';
import { LayoutGrid, Loader2, Save, Trash2, PlusCircle, Pencil, LayoutPanelTop, ArrowUp, ArrowDown, GripVertical, Image as ImageIcon, FileText, List, Grid, Type as TypeIcon, History, Bell, Megaphone, MessageSquareQuote, TrendingUp, HelpCircle, Info, ClipboardList, StickyNote, Sparkles, Star, Timer, Youtube, Trophy, Users, Newspaper, Eye, BookmarkCheck, Radio } from 'lucide-react';
import Modal from '../../modals/Modal';
import LayoutPreviewModal from '../../modals/LayoutPreviewModal';

const componentTypes: { type: HomeComponent['type']; label: string; icon: React.ElementType }[] = [
    { type: 'banner', label: 'Banner', icon: ImageIcon },
    { type: 'announcements', label: 'Announcements Bar', icon: Bell },
    { type: 'live_exams', label: 'Live Exams', icon: Radio },
    { type: 'your_exams', label: 'Your Exams (Enrolled)', icon: BookmarkCheck },
    { type: 'cta', label: 'Call to Action', icon: Megaphone },
    { type: 'categories_grid', label: 'Categories Grid', icon: Grid },
    { type: 'current_affairs_grid', label: 'Current Affairs Grid', icon: Newspaper },
    { type: 'latest_tests', label: 'Latest Tests', icon: List },
    { type: 'latest_updates', label: 'Latest Updates', icon: Newspaper },
    { type: 'new_additions', label: 'New Additions (with badge)', icon: Sparkles },
    { type: 'recent_tests', label: 'Recent User Tests', icon: History },
    { type: 'recommended_tests', label: 'Recommended Tests', icon: Star },
    { type: 'featured_category', label: 'Featured Category', icon: FileText },
    { type: 'testimonials', label: 'Testimonials', icon: MessageSquareQuote },
    { type: 'stats_counter', label: 'Statistics Counter', icon: TrendingUp },
    { type: 'faq', label: 'FAQ Section', icon: HelpCircle },
    { type: 'countdown_timer', label: 'Countdown Timer', icon: Timer },
    { type: 'video_embed', label: 'YouTube Video', icon: Youtube },
    { type: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { type: 'image_gallery', label: 'Image Gallery', icon: ImageIcon },
    { type: 'featured_tutors', label: 'Featured Tutors', icon: Users },
    { type: 'syllabus', label: 'Syllabus Block', icon: ClipboardList },
    { type: 'notes', label: 'Notes Block', icon: StickyNote },
    { type: 'information', label: 'Information Block', icon: Info },
    { type: 'rich_text', label: 'Rich Text Block', icon: TypeIcon },
    { type: 'test_grid', label: 'Test Grid', icon: Grid },
];

const ManageCategoryLayout: React.FC = () => {
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [allCurrentAffairsSections, setAllCurrentAffairsSections] = useState<CurrentAffairsSection[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
    const [settings, setSettings] = useState<HomepageSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editingComponent, setEditingComponent] = useState<HomeComponent | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const addMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const catQuery = query(collection(db, 'testCategories'), orderBy('name'));
        const unsubscribeCats = onSnapshot(catQuery, (snapshot) => {
            setAllCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
            setLoading(false);
        });
        const caQuery = query(collection(db, 'currentAffairsSections'), orderBy('name'));
        const unsubscribeCA = onSnapshot(caQuery, (snapshot) => {
            setAllCurrentAffairsSections(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CurrentAffairsSection)));
        });
        return () => {
            unsubscribeCats();
            unsubscribeCA();
        };
    }, []);

    useEffect(() => {
        if (!selectedCategoryId) {
            setSettings(null);
            return;
        }

        const settingsDocRef = doc(db, 'categorySettings', selectedCategoryId);
        const unsubscribe = onSnapshot(settingsDocRef, (doc) => {
            if (doc.exists()) {
                setSettings(doc.data() as HomepageSettings);
            } else {
                setSettings({ layout: [] }); // Default to empty layout if not exists
            }
        });
        return () => unsubscribe();
    }, [selectedCategoryId]);
    
    const handleSave = async () => {
        if (!settings || !selectedCategoryId) return;
        setIsSaving(true);
        try {
            const settingsToSave = { ...settings, layout: settings.layout || [] };
            await setDoc(doc(db, 'categorySettings', selectedCategoryId), settingsToSave);
            showMessage('Category layout saved!');
        } catch (error) { showMessage('Failed to save layout.', true);
        } finally { setIsSaving(false); }
    };

    const handleAddComponent = (type: HomeComponent['type']) => {
        const newId = `${type}-${Date.now()}`;
        let defaultConfig: any;
        switch(type) {
            case 'banner': defaultConfig = { title: 'New Banner', subtitle: 'Banner subtitle', imageUrl: null }; break;
            case 'featured_category': defaultConfig = { title: 'Featured Category', categoryId: null }; break;
            case 'latest_tests': defaultConfig = { title: 'Latest Tests', limit: 4 }; break;
            case 'latest_updates': defaultConfig = { title: 'Latest Updates', limit: 3 }; break;
            case 'categories_grid': defaultConfig = { title: 'Explore Categories' }; break;
            case 'current_affairs_grid': defaultConfig = { title: 'Current Affairs' }; break;
            case 'rich_text': defaultConfig = { content: '<h2>New Section</h2><p>Add your custom text or HTML content here.</p>' }; break;
            case 'recent_tests': defaultConfig = { title: 'Your Recent Activity', limit: 4 }; break;
            case 'announcements': defaultConfig = { title: 'Latest Announcements' }; break;
            case 'testimonials': defaultConfig = { title: 'What Our Users Say', testimonials: [{ text: 'This platform is amazing!', author: 'Jane Doe', role: 'Student' }] }; break;
            case 'stats_counter': defaultConfig = { title: 'Our Achievements', stats: [{ label: 'Tests Taken', value: '10,000+' }, { label: 'Happy Students', value: '5,000+' }] }; break;
            case 'faq': defaultConfig = { title: 'Frequently Asked Questions', faqs: [{ question: 'How do I start?', answer: 'Just pick a test and click "Attempt Now"!' }] }; break;
            case 'cta': defaultConfig = { headline: 'Ready to Ace Your Next Exam?', description: 'Join thousands of students preparing on our platform.', buttonText: 'Sign Up Now', buttonLink: 'home' }; break;
            case 'syllabus': defaultConfig = { title: 'Syllabus', content: '<p>Details about the syllabus...</p>' }; break;
            case 'notes': defaultConfig = { title: 'Important Notes', content: '<ul><li>Note 1</li><li>Note 2</li></ul>' }; break;
            case 'information': defaultConfig = { title: 'General Information', content: '<p>Some important info for students.</p>' }; break;
            case 'new_additions': defaultConfig = { title: 'What\'s New', limit: 4 }; break;
            case 'recommended_tests': defaultConfig = { title: 'Recommended For You', limit: 4 }; break;
            case 'countdown_timer': defaultConfig = { title: 'Next Big Exam', targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), eventDescription: 'Countdown to the main event!' }; break;
            case 'video_embed': defaultConfig = { title: 'Watch this Video', youtubeVideoId: 'dQw4w9WgXcQ' }; break;
            case 'leaderboard': defaultConfig = { title: 'Top Performers', limit: 5, timeframe: 'all-time' }; break;
            case 'image_gallery': defaultConfig = { title: 'Gallery', images: [{ src: 'https://via.placeholder.com/400x300', alt: 'Placeholder', caption: 'Sample Image' }] }; break;
            case 'featured_tutors': defaultConfig = { title: 'Our Experts', tutors: [{ name: 'John Doe', specialty: 'Physics', imageUrl: 'https://via.placeholder.com/100' }] }; break;
            case 'test_grid': defaultConfig = { title: 'Available Tests' }; break;
            case 'your_exams': defaultConfig = { title: 'Your Exams' }; break;
            case 'live_exams': defaultConfig = { title: 'Upcoming Live Exams', limit: 5 }; break;
            default: {
                // Prevent build crash by safely handling exhaustive check
                const _exhaustiveCheck = type as any;
                defaultConfig = { title: `New Component` };
                break;
            }
        }
        const newComponent = { id: newId, type, enabled: true, config: defaultConfig } as HomeComponent;
        setSettings(s => ({ ...s, layout: [...(s?.layout || []), newComponent] } as HomepageSettings));
        setIsAddMenuOpen(false);
    };

    const handleUpdateComponent = (updatedComponent: HomeComponent) => {
        setSettings(s => {
            if (!s) return s;
            const newLayout = (s.layout || []).map(c => c.id === updatedComponent.id ? updatedComponent : c);
            return { ...s, layout: newLayout };
        });
    };

    const handleRemoveComponent = (id: string) => {
        setSettings(s => {
            if (!s) return s;
            const newLayout = (s.layout || []).filter(c => c.id !== id);
            return { ...s, layout: newLayout };
        });
    };

    const moveComponent = (index: number, direction: 'up' | 'down') => {
        setSettings(s => {
            if (!s || !s.layout) return s;
            const newLayout = [...s.layout];
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            if (targetIndex < 0 || targetIndex >= newLayout.length) return s;
            [newLayout[index], newLayout[targetIndex]] = [newLayout[targetIndex], newLayout[index]];
            return { ...s, layout: newLayout };
        });
    };

    const handleEditClick = (component: HomeComponent) => {
        setEditingComponent(component);
        setIsEditModalOpen(true);
    };

    const selectedCategoryObject = allCategories.find(c => c.id === selectedCategoryId);

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-3"><LayoutGrid /> Category Page Layout</h2>
            
            <div>
                <label htmlFor="category-select" className="block text-sm font-medium text-gray-700 mb-1">Select a category to customize:</label>
                <select 
                    id="category-select"
                    value={selectedCategoryId}
                    onChange={e => setSelectedCategoryId(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg bg-white"
                >
                    <option value="">-- Select a Category --</option>
                    {allCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
            </div>

            {selectedCategoryId && (
                <div className="mt-6 border-t pt-6">
                    <h3 className="font-semibold text-lg mb-4">Layout for "{selectedCategoryObject?.name}"</h3>
                    <div className="space-y-2 mb-4 min-h-[60px]">
                        {(settings?.layout || []).map((component, index) => {
                            const componentInfo = componentTypes.find(ct => ct.type === component.type) || { label: 'Unknown', icon: PlusCircle };
                            const title = (component.config as any).title || (component.config as any).headline || componentInfo.label;
                            return (
                               <div key={component.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border hover:bg-gray-100">
                                    <div className="flex items-center gap-3">
                                        <GripVertical className="text-gray-400 cursor-grab"/>
                                        <componentInfo.icon className="text-indigo-500"/>
                                        <span className="font-semibold">{title}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => moveComponent(index, 'up')} disabled={index === 0} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-md disabled:opacity-30"><ArrowUp size={16}/></button>
                                        <button onClick={() => moveComponent(index, 'down')} disabled={index === (settings?.layout || []).length - 1} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-md disabled:opacity-30"><ArrowDown size={16}/></button>
                                        <button onClick={() => handleEditClick(component)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md"><Pencil size={16}/></button>
                                        <button onClick={() => handleRemoveComponent(component.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded-md"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                            );
                        })}
                         {(settings?.layout || []).length === 0 && <p className="text-center text-gray-400 py-4">This category has no custom layout. Add a component to get started.</p>}
                    </div>
                     <div className="relative" ref={addMenuRef}>
                         <button onClick={() => setIsAddMenuOpen(prev => !prev)} className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-indigo-50 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-100">
                            <PlusCircle size={18} /> Add Component
                        </button>
                        {isAddMenuOpen && (
                            <div className="absolute bottom-full mb-2 w-full bg-white shadow-lg rounded-lg border z-10 p-2 animate-scale-in origin-bottom max-h-60 overflow-y-auto">
                                {componentTypes.map(({ type, label, icon: Icon }) => (
                                    <button key={type} onClick={() => handleAddComponent(type as HomeComponent['type'])} className="w-full flex items-center gap-3 p-2 text-left text-sm rounded-md hover:bg-gray-100">
                                        <Icon className="text-indigo-500" size={16} /> {label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button onClick={() => setIsPreviewOpen(true)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 disabled:bg-gray-400">
                             <Eye /> Preview Layout
                        </button>
                        <button onClick={handleSave} disabled={isSaving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400">
                             {isSaving ? <Loader2 className="animate-spin" /> : <Save />} Save Layout
                        </button>
                    </div>
                </div>
            )}
            
            {editingComponent && <EditComponentModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} component={editingComponent} onSave={handleUpdateComponent} allCategories={allCategories} />}
            {selectedCategoryObject && <LayoutPreviewModal 
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                categorySettings={settings}
                selectedCategory={{id: selectedCategoryObject.id, name: selectedCategoryObject.name}}
                allCategories={allCategories}
                allCurrentAffairsSections={allCurrentAffairsSections}
            />}
        </div>
    );
};

const renderArrayEditor = (
    items: any[] | undefined,
    itemFields: { key: string; label: string; type?: string }[],
    itemTypeName: string,
    updateFn: (newItems: any[]) => void
) => {
    const handleItemChange = (index: number, field: string, value: string) => {
        const newItems = [...(items || [])];
        newItems[index] = { ...newItems[index], [field]: value };
        updateFn(newItems);
    };
    const addItem = () => {
        const newItem = itemFields.reduce((acc, f) => ({ ...acc, [f.key]: '' }), {});
        updateFn([...(items || []), newItem]);
    };
    const removeItem = (index: number) => updateFn((items || []).filter((_, i) => i !== index));

    return (
        <div className="space-y-3">
            {(items || []).map((item, index) => (
                <div key={index} className="p-3 bg-gray-50 border rounded-lg space-y-2 relative">
                     <button type="button" onClick={() => removeItem(index)} className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-100 rounded-full"><Trash2 size={14}/></button>
                    {itemFields.map(field => (
                         <div key={field.key}>
                            <label className="text-xs font-medium">{field.label}</label>
                            {field.type === 'textarea' ? (
                                 <textarea value={item[field.key]} onChange={e => handleItemChange(index, field.key, e.target.value)} className="w-full p-1 border rounded-md mt-1 text-sm" />
                            ) : (
                                 <input type="text" value={item[field.key] || ''} onChange={e => handleItemChange(index, field.key, e.target.value)} className="w-full p-1 border rounded-md mt-1 text-sm" />
                            )}
                        </div>
                    ))}
                </div>
            ))}
            <button type="button" onClick={addItem} className="text-sm font-semibold text-indigo-600 flex items-center gap-1"><PlusCircle size={14}/>Add {itemTypeName}</button>
        </div>
    );
};

// Edit Component Modal
interface EditModalProps { isOpen: boolean; onClose: () => void; component: HomeComponent; onSave: (comp: HomeComponent) => void; allCategories: Category[]; }
const EditComponentModal: React.FC<EditModalProps> = ({ isOpen, onClose, component, onSave, allCategories }) => {
    const [editedConfig, setEditedConfig] = useState(component.config);
    const [imageFile, setImageFile] = useState<File|null>(null);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => { setEditedConfig(component.config); setImageFile(null); }, [component]);
    
    const handleSave = async () => {
        let finalConfig = { ...editedConfig };
        if (component.type === 'banner' && imageFile) {
            setIsUploading(true);
            const config = finalConfig as BannerComponentConfig;
            try {
                if ((component.config as BannerComponentConfig).imageUrl) {
                    try {
                        const oldImageRef = ref(storage, (component.config as BannerComponentConfig).imageUrl!);
                        await deleteObject(oldImageRef);
                    } catch (deleteError) {
                        console.warn("Could not delete old banner image:", deleteError);
                    }
                }
                const storageRef = ref(storage, `homepage_banners/${component.id}/${imageFile.name}`);
                await uploadBytes(storageRef, imageFile);
                config.imageUrl = await getDownloadURL(storageRef);
            } catch (e) { showMessage('Image upload failed!', true); setIsUploading(false); return; }
            setIsUploading(false);
        }
        onSave({ ...component, config: finalConfig });
        onClose();
    };
    
    const handleRemoveImage = () => {
        setEditedConfig({ ...editedConfig, imageUrl: null });
        setImageFile(null);
    };
    
    const renderForm = () => {
        switch (component.type) {
            case 'your_exams':
                const yourExamsConf = editedConfig as YourExamsComponentConfig;
                return (
                    <div><label className="text-sm font-medium">Section Title</label><input type="text" value={yourExamsConf.title} onChange={e => setEditedConfig({...yourExamsConf, title: e.target.value})} className="w-full p-2 border rounded-lg mt-1"/></div>
                );
            case 'banner':
                const bannerConf = editedConfig as BannerComponentConfig;
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Title</label>
                            <input type="text" value={bannerConf.title} onChange={e => setEditedConfig({...bannerConf, title: e.target.value})} className="w-full p-2 border rounded-lg"/>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Subtitle</label>
                            <textarea value={bannerConf.subtitle} onChange={e => setEditedConfig({...bannerConf, subtitle: e.target.value})} className="w-full p-2 border rounded-lg mt-1"/>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Background Image</label>
                            <div className="mt-1 flex items-center gap-4">
                                {(bannerConf.imageUrl || imageFile) ? <img src={imageFile ? URL.createObjectURL(imageFile) : bannerConf.imageUrl!} alt="preview" className="w-24 h-14 object-cover rounded shadow-sm"/> : <div className="w-24 h-14 bg-gray-100 rounded flex items-center justify-center"><ImageIcon className="text-gray-400"/></div>}
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        <input id="banner-img" type="file" onChange={e => setImageFile(e.target.files?.[0] || null)} accept="image/*" className="hidden"/>
                                        <label htmlFor="banner-img" className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-semibold cursor-pointer hover:bg-gray-50 whitespace-nowrap">Choose File</label>
                                    </div>
                                    {(bannerConf.imageUrl) && <button type="button" onClick={handleRemoveImage} className="text-red-600 text-xs font-semibold text-left">Remove Current Image</button>}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'latest_tests':
            case 'recent_tests':
            case 'new_additions':
            case 'recommended_tests':
            case 'live_exams':
                const testListConf = editedConfig as (LatestTestsComponentConfig | RecentTestsComponentConfig | NewAdditionsComponentConfig | RecommendedTestsComponentConfig | LiveExamsComponentConfig);
                return (
                    <div className="space-y-4">
                        <div><label className="text-sm font-medium">Section Title</label><input type="text" value={testListConf.title} onChange={e => setEditedConfig({...testListConf, title: e.target.value})} className="w-full p-2 border rounded-lg mt-1"/></div>
                        <div><label className="text-sm font-medium">Number of tests to show</label><input type="number" value={testListConf.limit} onChange={e => setEditedConfig({...testListConf, limit: Number(e.target.value)})} className="w-full p-2 border rounded-lg mt-1"/></div>
                    </div>
                );
            case 'countdown_timer':
                const countdownConf = editedConfig as CountdownTimerComponentConfig;
                return (
                    <div className="space-y-4">
                        <div><label className="text-sm font-medium">Title</label><input type="text" value={countdownConf.title} onChange={e => setEditedConfig({...countdownConf, title: e.target.value})} className="w-full p-2 border rounded-lg mt-1"/></div>
                        <div><label className="text-sm font-medium">Target Date and Time</label><input type="datetime-local" value={countdownConf.targetDate.slice(0, 16)} onChange={e => setEditedConfig({...countdownConf, targetDate: new Date(e.target.value).toISOString()})} className="w-full p-2 border rounded-lg mt-1"/></div>
                        <div><label className="text-sm font-medium">Event Description</label><textarea value={countdownConf.eventDescription} onChange={e => setEditedConfig({...countdownConf, eventDescription: e.target.value})} className="w-full p-2 border rounded-lg mt-1"/></div>
                    </div>
                );
            case 'video_embed':
                const videoConf = editedConfig as VideoEmbedComponentConfig;
                return (
                     <div className="space-y-4">
                        <div><label className="text-sm font-medium">Title</label><input type="text" value={videoConf.title} onChange={e => setEditedConfig({...videoConf, title: e.target.value})} className="w-full p-2 border rounded-lg mt-1"/></div>
                        <div><label className="text-sm font-medium">YouTube Video ID</label><input type="text" value={videoConf.youtubeVideoId} onChange={e => setEditedConfig({...videoConf, youtubeVideoId: e.target.value})} className="w-full p-2 border rounded-lg mt-1"/>
                        <p className="text-xs text-gray-500 mt-1">From a youtube URL like `https://www.youtube.com/watch?v=VIDEO_ID`, the ID is `VIDEO_ID`.</p></div>
                    </div>
                );
            case 'featured_category':
                const featuredConf = editedConfig as FeaturedCategoryComponentConfig;
                return (
                    <div className="space-y-4">
                        <div><label className="text-sm font-medium">Section Title</label><input type="text" value={featuredConf.title} onChange={e => setEditedConfig({...featuredConf, title: e.target.value})} className="w-full p-2 border rounded-lg mt-1"/></div>
                        <div>
                            <label className="text-sm font-medium">Category to Feature</label>
                            <select value={featuredConf.categoryId || ''} onChange={e => setEditedConfig({...featuredConf, categoryId: e.target.value})} className="w-full p-2 border rounded-lg bg-white mt-1">
                                <option value="">Select Category...</option>
                                {allCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>
                );
            case 'announcements':
                const announceConf = editedConfig as AnnouncementsComponentConfig;
                return (
                    <div><label className="text-sm font-medium">Section Title</label><input type="text" value={announceConf.title} onChange={e => setEditedConfig({...announceConf, title: e.target.value})} className="w-full p-2 border rounded-lg mt-1"/></div>
                );
            case 'testimonials':
                const testimonialConf = editedConfig as TestimonialsComponentConfig;
                return (
                     <div className="space-y-4">
                        <div><label className="text-sm font-medium">Section Title</label><input type="text" value={testimonialConf.title} onChange={e => setEditedConfig({...testimonialConf, title: e.target.value})} className="w-full p-2 border rounded-lg mt-1"/></div>
                        {renderArrayEditor(
                            testimonialConf.testimonials,
                            [{ key: 'text', label: 'Quote', type: 'textarea' }, { key: 'author', label: 'Author' }, { key: 'role', label: 'Role/Title' }],
                            'Testimonial',
                            (newItems: Testimonial[]) => setEditedConfig({...testimonialConf, testimonials: newItems})
                        )}
                    </div>
                );
            case 'stats_counter':
                const statsConf = editedConfig as StatsCounterComponentConfig;
                return (
                    <div className="space-y-4">
                        <div><label className="text-sm font-medium">Section Title</label><input type="text" value={statsConf.title} onChange={e => setEditedConfig({...statsConf, title: e.target.value})} className="w-full p-2 border rounded-lg mt-1"/></div>
                        {renderArrayEditor(
                            statsConf.stats,
                            [{ key: 'label', label: 'Label' }, { key: 'value', label: 'Value' }],
                            'Stat',
                            (newItems: Stat[]) => setEditedConfig({...statsConf, stats: newItems})
                        )}
                    </div>
                );
            case 'faq':
                const faqConf = editedConfig as FAQComponentConfig;
                return (
                    <div className="space-y-4">
                        <div><label className="text-sm font-medium">Section Title</label><input type="text" value={faqConf.title} onChange={e => setEditedConfig({...faqConf, title: e.target.value})} className="w-full p-2 border rounded-lg mt-1"/></div>
                        {renderArrayEditor(
                            faqConf.faqs,
                            [{ key: 'question', label: 'Question' }, { key: 'answer', label: 'Answer', type: 'textarea' }],
                            'FAQ',
                            (newItems: FAQ[]) => setEditedConfig({...faqConf, faqs: newItems})
                        )}
                    </div>
                );
            case 'cta':
                const ctaConf = editedConfig as CTAComponentConfig;
                return (
                    <div className="space-y-4">
                        <div><label className="text-sm font-medium">Headline</label><input type="text" value={ctaConf.headline} onChange={e => setEditedConfig({...ctaConf, headline: e.target.value})} className="w-full p-2 border rounded-lg mt-1"/></div>
                        <div><label className="text-sm font-medium">Description</label><textarea value={ctaConf.description} onChange={e => setEditedConfig({...ctaConf, description: e.target.value})} className="w-full p-2 border rounded-lg mt-1"/></div>
                        <div><label className="text-sm font-medium">Button Text</label><input type="text" value={ctaConf.buttonText} onChange={e => setEditedConfig({...ctaConf, buttonText: e.target.value})} className="w-full p-2 border rounded-lg mt-1"/></div>
                        <div><label className="text-sm font-medium">Button Link</label><input type="text" value={ctaConf.buttonLink} onChange={e => setEditedConfig({...ctaConf, buttonLink: e.target.value})} className="w-full p-2 border rounded-lg mt-1"/></div>
                    </div>
                );
            case 'categories_grid':
            case 'current_affairs_grid':
            case 'test_grid':
                const gridConf = editedConfig as (CategoriesGridComponentConfig | CurrentAffairsGridComponentConfig | TestGridComponentConfig);
                return <div><label className="text-sm font-medium">Section Title</label><input type="text" value={gridConf.title} onChange={e => setEditedConfig({ ...gridConf, title: e.target.value })} className="w-full p-2 border rounded-lg mt-1" /></div>;
            case 'rich_text':
                const richConf = editedConfig as RichTextComponentConfig;
                return <div><label className="text-sm font-medium">Content (HTML allowed)</label><textarea value={richConf.content} onChange={e => setEditedConfig({ ...richConf, content: e.target.value })} rows={10} className="w-full p-2 border rounded-lg mt-1 font-mono text-sm" /></div>;
            case 'syllabus':
            case 'notes':
            case 'information': {
                const config = editedConfig as (SyllabusComponentConfig | NotesComponentConfig | InformationComponentConfig);
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Section Title</label>
                            <input type="text" value={config.title} onChange={e => setEditedConfig({ ...config, title: e.target.value })} className="w-full p-2 border rounded-lg mt-1" />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Content (HTML allowed)</label>
                            <textarea value={config.content} onChange={e => setEditedConfig({ ...config, content: e.target.value })} rows={10} className="w-full p-2 border rounded-lg mt-1 font-mono text-sm" />
                        </div>
                    </div>
                );
            }
            case 'leaderboard':
                const leaderboardConf = editedConfig as LeaderboardComponentConfig;
                return (
                    <div className="space-y-4">
                        <div><label className="text-sm font-medium">Section Title</label><input type="text" value={leaderboardConf.title} onChange={e => setEditedConfig({...leaderboardConf, title: e.target.value})} className="w-full p-2 border rounded-lg mt-1"/></div>
                        <div><label className="text-sm font-medium">Number of users to show</label><input type="number" value={leaderboardConf.limit} onChange={e => setEditedConfig({...leaderboardConf, limit: Number(e.target.value)})} className="w-full p-2 border rounded-lg mt-1"/></div>
                        <div>
                            <label className="text-sm font-medium">Timeframe</label>
                            <select value={leaderboardConf.timeframe} onChange={e => setEditedConfig({...leaderboardConf, timeframe: e.target.value as any})} className="w-full p-2 border rounded-lg bg-white mt-1">
                                <option value="all-time">All Time</option>
                                <option value="monthly">This Month</option>
                                <option value="weekly">This Week</option>
                            </select>
                        </div>
                    </div>
                );
            case 'image_gallery':
                const galleryConf = editedConfig as ImageGalleryComponentConfig;
                return (
                    <div className="space-y-4">
                        <div><label className="text-sm font-medium">Section Title</label><input type="text" value={galleryConf.title} onChange={e => setEditedConfig({...galleryConf, title: e.target.value})} className="w-full p-2 border rounded-lg mt-1"/></div>
                        {renderArrayEditor(
                            galleryConf.images,
                            [{ key: 'src', label: 'Image URL' }, { key: 'alt', label: 'Alt Text' }, { key: 'caption', label: 'Caption (optional)' }],
                            'Image',
                            (newItems: GalleryImage[]) => setEditedConfig({...galleryConf, images: newItems})
                        )}
                    </div>
                );
            case 'featured_tutors':
                const tutorsConf = editedConfig as FeaturedTutorsComponentConfig;
                return (
                    <div className="space-y-4">
                        <div><label className="text-sm font-medium">Section Title</label><input type="text" value={tutorsConf.title} onChange={e => setEditedConfig({...tutorsConf, title: e.target.value})} className="w-full p-2 border rounded-lg mt-1"/></div>
                        {renderArrayEditor(
                            tutorsConf.tutors,
                            [{ key: 'name', label: 'Tutor Name' }, { key: 'specialty', label: 'Specialty' }, { key: 'imageUrl', label: 'Image URL' }],
                            'Tutor',
                            (newItems: Tutor[]) => setEditedConfig({...tutorsConf, tutors: newItems})
                        )}
                    </div>
                );
            default: return null;
        }
    };

    return <Modal isOpen={isOpen} onClose={onClose} title={`Edit ${component.type.replace(/_/g, ' ')}`}>
        <div className="max-h-[60vh] overflow-y-auto p-1 pr-4">
            {renderForm()}
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">Cancel</button>
            <button onClick={handleSave} disabled={isUploading} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg flex items-center gap-2 hover:bg-indigo-700 disabled:bg-indigo-400">
                {isUploading && <Loader2 className="animate-spin"/>} Save Changes
            </button>
        </div>
    </Modal>;
};

export default ManageCategoryLayout;
