import React from 'react';
import { Target, Zap, Users, ArrowLeft } from 'lucide-react';

interface AboutPageProps {
    onNavigate: (view: string) => void;
    onBack: () => void;
}

const AboutPage: React.FC<AboutPageProps> = ({ onNavigate, onBack }) => {
    return (
        <div className="bg-white dark:bg-gray-900">
             <div className="max-w-7xl mx-auto pt-8 px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                    >
                        <ArrowLeft size={18} /> Back
                    </button>
                </div>
            </div>
            <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                    <h2 className="text-base font-semibold text-indigo-600 dark:text-indigo-400 tracking-wide uppercase">About Us</h2>
                    <p className="mt-1 text-4xl font-extrabold text-gray-900 dark:text-gray-100 sm:text-5xl sm:tracking-tight lg:text-6xl">
                        Welcome to ExamHub
                    </p>
                    <p className="max-w-xl mt-5 mx-auto text-xl text-gray-500 dark:text-gray-400">
                        Your one-stop destination for acing your exams with confidence. We provide the tools and resources you need to succeed.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="lg:text-center">
                    <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl">
                        Our Mission
                    </p>
                    <p className="mt-4 max-w-2xl text-xl text-gray-500 dark:text-gray-400 lg:mx-auto">
                        To empower students and professionals by providing an interactive and comprehensive platform for mock exams. We believe that practice is the key to success, and our goal is to make high-quality preparation accessible to everyone.
                    </p>
                </div>

                <div className="mt-20">
                    <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-3 md:gap-x-8 md:gap-y-10">
                        <div className="relative text-center">
                            <dt>
                                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mx-auto left-0 right-0">
                                    <Target className="h-6 w-6" aria-hidden="true" />
                                </div>
                                <p className="mt-16 text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">Comprehensive Test Series</p>
                            </dt>
                            <dd className="mt-2 text-base text-gray-500 dark:text-gray-400">
                                Access a wide range of tests across various categories, designed by experts to simulate the real exam environment.
                            </dd>
                        </div>
                        <div className="relative text-center">
                            <dt>
                                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mx-auto left-0 right-0">
                                    <Zap className="h-6 w-6" aria-hidden="true" />
                                </div>
                                <p className="mt-16 text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">Instant Performance Analysis</p>
                            </dt>
                            <dd className="mt-2 text-base text-gray-500 dark:text-gray-400">
                                Get detailed feedback on your performance, including score, accuracy, and question-wise analysis, right after you submit.
                            </dd>
                        </div>
                        <div className="relative text-center">
                            <dt>
                                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mx-auto left-0 right-0">
                                    <Users className="h-6 w-6" aria-hidden="true" />
                                </div>
                                <p className="mt-16 text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">Community of Learners</p>
                            </dt>
                            <dd className="mt-2 text-base text-gray-500 dark:text-gray-400">
                                Join thousands of other aspirants preparing for their exams. Track your progress and stay motivated.
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>
        </div>
    );
};

export default AboutPage;