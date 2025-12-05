import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface PrivacyPolicyPageProps {
    onNavigate: (view: string) => void;
    onBack: () => void;
}

const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onNavigate, onBack }) => {
    return (
        <div className="bg-white dark:bg-gray-900 py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                    >
                        <ArrowLeft size={18} /> Back
                    </button>
                </div>
            </div>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="prose prose-indigo dark:prose-invert text-gray-500 dark:text-gray-400 mx-auto lg:max-w-none">
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">Privacy Policy</h1>
                    <p>Last updated: {new Date().toLocaleDateString()}</p>
                    
                    <h2>1. Introduction</h2>
                    <p>Welcome to ExamHub. We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about our policy, or our practices with regards to your personal information, please contact us at privacy@examhub.com.</p>

                    <h2>2. Information We Collect</h2>
                    <p>We collect personal information that you voluntarily provide to us when you register on the website, express an interest in obtaining information about us or our products and services, when you participate in activities on the website (such as taking a test) or otherwise when you contact us.</p>
                    <p>The personal information that we collect depends on the context of your interactions with us and the website, the choices you make and the products and features you use. The personal information we collect may include the following:</p>
                    <ul>
                        <li><strong>Personal Information Provided by You.</strong> We collect names; email addresses; passwords; and other similar information.</li>
                        <li><strong>Test Data.</strong> We collect data related to your test performance, including scores, answers, and time taken. This is used to provide you with performance analytics.</li>
                    </ul>

                    <h2>3. How We Use Your Information</h2>
                    <p>We use personal information collected via our website for a variety of business purposes described below. We process your personal information for these purposes in reliance on our legitimate business interests, in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations.</p>
                    <ul>
                        <li>To facilitate account creation and logon process.</li>
                        <li>To post testimonials.</li>
                        <li>To manage user accounts.</li>
                        <li>To send administrative information to you.</li>
                        <li>To protect our Services.</li>
                        <li>To respond to user inquiries/offer support to users.</li>
                    </ul>

                    <h2>4. Will Your Information Be Shared With Anyone?</h2>
                    <p>We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations.</p>

                    <h2>5. How Long Do We Keep Your Information?</h2>
                    <p>We keep your information for as long as necessary to fulfill the purposes outlined in this privacy policy unless otherwise required by law.</p>

                    <h2>6. How Do We Keep Your Information Safe?</h2>
                    <p>We aim to protect your personal information through a system of organizational and technical security measures.</p>

                    <h2>7. Do We Collect Information From Minors?</h2>
                    <p>We do not knowingly solicit data from or market to children under 18 years of age.</p>

                    <h2>8. What Are Your Privacy Rights?</h2>
                    <p>In some regions (like the European Economic Area), you have rights that allow you greater access to and control over your personal information. You may review, change, or terminate your account at any time.</p>

                    <h2>9. Controls for Do-Not-Track Features</h2>
                    <p>Most web browsers and some mobile operating systems and mobile applications include a Do-Not-Track (“DNT”) feature or setting you can activate to signal your privacy preference not to have data about your online browsing activities monitored and collected.</p>

                    <h2>10. Updates to This Policy</h2>
                    <p>We may update this privacy policy from time to time. The updated version will be indicated by an updated “Revised” date and the updated version will be effective as soon as it is accessible.</p>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicyPage;