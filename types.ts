
import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
    uid: string;
    name: string;
    email: string;
    mobileNumber?: string;
    role: 'user' | 'admin';
    createdAt: Timestamp;
    lastSeen?: Timestamp;
    enrolledCategoryIds?: string[]; // Added for test series enrollment
    notificationSettings?: {
        newContent?: boolean;
        adminReplies?: boolean;
    };
}

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string; // 'admin' or user's UID
  senderName: string;
  createdAt: Timestamp;
}

export interface ChatSession {
  id: string; // This will be the userId
  userName: string;
  userEmail: string;
  lastMessage: string;
  lastMessageAt: Timestamp;
  isReadByAdmin: boolean;
}

export interface Notification {
  id: string;
  type: 'new_content' | 'admin_reply' | 'chat_reply';
  message: string;
  link?: string; // a path for onNavigate
  createdAt: Timestamp;
  isRead: boolean;
  reportDetails?: { // for admin_reply
      testTitle: string;
      questionText: string;
      adminReply: string;
  }
}

export interface Announcement {
    id: string;
    title: string;
    content: string;
    createdAt: Timestamp;
    isActive: boolean;
}

export interface Category {
    id:string;
    name: string;
    parentId?: string | null;
    sections?: string[];
    icon?: string;
}

export interface CurrentAffairsSection {
    id: string;
    name: string;
    parentId?: string | null;
    icon?: string;
}

export interface BilingualText {
    english: string;
    hindi: string;
}

export interface BilingualOptions {
    english: string[];
    hindi: string[];
}

export interface Question {
    question: BilingualText;
    options: BilingualOptions;
    correctAnswer: string; // 'A', 'B', 'C', 'D'
    explanation?: BilingualText;
    section?: string;
}

export interface Test {
    id: string;
    title: string;
    questionCount: number;
    durationMinutes: number;
    marksPerQuestion: number;
    negativeMarking: number;
    publishAt?: Timestamp;
    expiresAt?: Timestamp;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
    status: 'draft' | 'published';
    questions: Question[];
    // A test belongs to either a category or a current affairs section
    categoryId?: string;
    category?: string;
    currentAffairsSectionId?: string;
    currentAffairsSectionName?: string;
    section?: string; // Kept for backward compatibility
    featured?: boolean;
    
    // Live Exam Properties
    isLive?: boolean;
    liveFrom?: Timestamp;
    liveUntil?: Timestamp;
}

export interface UserResult {
    id: string;
    userId: string;
    userEmail: string;
    testId: string;
    testTitle: string;
    categoryId?: string;
    categoryName?: string;
    score: number;
    total: number;
    correctCount: number;
    incorrectCount: number;
    percentage: number;
    submittedAt: Timestamp;
    userAnswers?: UserAnswer[];
    timeTakenSeconds?: number;
}

export interface Report {
    id: string;
    testId: string;
    testTitle: string;
    questionIndex: number;
    questionText: string;
    reason: string;
    comments?: string;
    userId: string;
    userEmail: string;
    userName: string;
    reportedAt: Timestamp;
    status: 'pending' | 'resolved' | 'discarded';
    adminReply?: string;
}

export type AnswerStatus = 'unattempted' | 'answered' | 'marked' | 'answered_marked' | 'incorrect';

export interface UserAnswer {
    answer: string | null; // 'A', 'B', 'C', 'D'
    status: AnswerStatus;
}

export interface TestStateLocal {
    testId: string;
    currentQuestionIndex: number;
    userAnswers: UserAnswer[];
    timeRemaining: number;
    language: 'english' | 'hindi';
}

export interface CustomPage {
    id: string;
    title: string;
    slug: string;
    content: string;
    status: 'draft' | 'published';
    createdAt: Timestamp;
    updatedAt?: Timestamp;
}

export type ArticleBlock =
    | { id: string; type: 'h2'; content: string }
    | { id: string; type: 'h3'; content: string }
    | { id: string; type: 'paragraph'; content: string }
    | { id: string; type: 'image'; src: string; caption: string; fileName: string }
    | { id: string; type: 'list'; items: string[]; ordered: boolean }
    | { id: string; type: 'quote'; content: string; author: string }
    | { id: string; type: 'test_embed'; testId: string }
    | { id: string; type: 'category_embed'; categoryId: string }
    | { id: string; type: 'code'; code: string; language: string };

export interface UpdateArticle {
  id: string;
  title: string; // This will be treated as H1
  slug: string;
  blocks: ArticleBlock[];
  status: 'draft' | 'published';
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  publishAt: Timestamp;

  // Visuals & Categorization
  featuredImageUrl?: string;
  featuredImageFileName?: string;
  categoryId?: string;
  categoryName?: string;
  tags?: string[];
  
  // Authoring
  authorName?: string;

  // SEO
  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  noIndex?: boolean;

  // Analytics
  viewCount?: number;
}


export interface FooterLink {
    label: string;
    path: string; // For internal: 'home', 'about'. For custom: page slug
}

export interface FooterConfig {
    description?: string;
    socialLinks?: {
        facebook?: string;
        twitter?: string;
        linkedin?: string;
        instagram?: string;
    };
    contactInfo?: {
        address?: string;
        phone?: string;
        email?: string;
    };
    links: FooterLink[];
}

export interface StudyMaterial {
    id: string;
    categoryId: string;
    categoryName: string;
    title: string;
    description: string;
    type: 'pdf' | 'video';
    url: string; 
    fileName?: string;
    createdAt: Timestamp;
}


// --- New Homepage Layout Types ---

export interface BannerComponentConfig {
    title: string;
    subtitle: string;
    imageUrl: string | null;
}

export interface FeaturedCategoryComponentConfig {
    title: string;
    categoryId: string | null;
}

export interface LatestTestsComponentConfig {
    title: string;
    limit: number;
}

export interface LatestUpdatesComponentConfig {
    title: string;
    limit: number;
}

export interface RecentTestsComponentConfig {
    title: string;
    limit: number;
}

export interface CategoriesGridComponentConfig {
    title: string;
}

export interface CurrentAffairsGridComponentConfig {
    title: string;
}

export interface RichTextComponentConfig {
    content: string;
}

export interface AnnouncementsComponentConfig {
    title: string;
}

export interface Testimonial {
    text: string;
    author: string;
    role: string;
}
export interface TestimonialsComponentConfig {
    title: string;
    testimonials: Testimonial[];
}

export interface Stat {
    label: string;
    value: string;
}
export interface StatsCounterComponentConfig {
    title: string;
    stats: Stat[];
}

export interface FAQ {
    question: string;
    answer: string;
}
export interface FAQComponentConfig {
    title: string;
    faqs: FAQ[];
}

export interface CTAComponentConfig {
    headline: string;
    description: string;
    buttonText: string;
    buttonLink: string;
}

export interface SyllabusComponentConfig {
    title: string;
    content: string; // HTML content
}

export interface NotesComponentConfig {
    title: string;
    content: string; // HTML content
}

export interface InformationComponentConfig {
    title: string;
    content: string; // HTML content
}

export interface NewAdditionsComponentConfig {
    title: string;
    limit: number;
}

export interface RecommendedTestsComponentConfig {
    title: string;
    limit: number;
}

export interface CountdownTimerComponentConfig {
    title: string;
    targetDate: string;
    eventDescription: string;
}

export interface VideoEmbedComponentConfig {
    title: string;
    youtubeVideoId: string;
}

export interface LeaderboardComponentConfig {
    title: string;
    limit: number;
    timeframe: 'all-time' | 'monthly' | 'weekly';
}

export interface GalleryImage {
    src: string;
    alt: string;
    caption?: string;
}
export interface ImageGalleryComponentConfig {
    title: string;
    images: GalleryImage[];
}

export interface Tutor {
    name: string;
    specialty: string;
    imageUrl: string;
}
export interface FeaturedTutorsComponentConfig {
    title: string;
    tutors: Tutor[];
}

export interface TestGridComponentConfig {
    title: string;
}

export interface YourExamsComponentConfig {
    title: string;
}

export interface LiveExamsComponentConfig {
    title: string;
    limit: number;
}


export type HomeComponent = {
    id: string;
    enabled: boolean;
} & (
    | { type: 'banner'; config: BannerComponentConfig }
    | { type: 'featured_category'; config: FeaturedCategoryComponentConfig }
    | { type: 'latest_tests'; config: LatestTestsComponentConfig }
    | { type: 'latest_updates'; config: LatestUpdatesComponentConfig }
    | { type: 'recent_tests'; config: RecentTestsComponentConfig }
    | { type: 'categories_grid'; config: CategoriesGridComponentConfig }
    | { type: 'current_affairs_grid'; config: CurrentAffairsGridComponentConfig }
    | { type: 'rich_text'; config: RichTextComponentConfig }
    | { type: 'announcements'; config: AnnouncementsComponentConfig }
    | { type: 'testimonials'; config: TestimonialsComponentConfig }
    | { type: 'stats_counter'; config: StatsCounterComponentConfig }
    | { type: 'faq'; config: FAQComponentConfig }
    | { type: 'cta'; config: CTAComponentConfig }
    | { type: 'syllabus'; config: SyllabusComponentConfig }
    | { type: 'notes'; config: NotesComponentConfig }
    | { type: 'information'; config: InformationComponentConfig }
    | { type: 'new_additions'; config: NewAdditionsComponentConfig }
    | { type: 'recommended_tests'; config: RecommendedTestsComponentConfig }
    | { type: 'countdown_timer'; config: CountdownTimerComponentConfig }
    | { type: 'video_embed'; config: VideoEmbedComponentConfig }
    | { type: 'leaderboard'; config: LeaderboardComponentConfig }
    | { type: 'image_gallery'; config: ImageGalleryComponentConfig }
    | { type: 'featured_tutors'; config: FeaturedTutorsComponentConfig }
    | { type: 'test_grid'; config: TestGridComponentConfig }
    | { type: 'your_exams'; config: YourExamsComponentConfig }
    | { type: 'live_exams'; config: LiveExamsComponentConfig }
);


export interface HomepageSettings {
    layout: HomeComponent[];
}

export type ViewType = 'home' | 'history' | 'about' | 'contact' | 'privacy' | 'admin' | 'profile' | 'settings' | 'updates' | 'updateArticle' | 'category-dashboard' | 'live-exams' | 'live-waiting-room' | 'enrolled-exams';

export type AdminView = 'dashboard' | 'updates' | 'categories' | 'tests' | 'view-tests' | 'pages' | 'ui-management' | 'reports' | 'current-affairs' | 'category-layout' | 'study-materials' | 'user-chats';
