import React from 'react';
import { Mail, Phone, MapPin, ArrowLeft } from 'lucide-react';

interface ContactPageProps {
    onNavigate: (view: string) => void;
    onBack: () => void;
}

const ContactPage: React.FC<ContactPageProps> = ({ onNavigate, onBack }) => {
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
                <div className="max-w-lg mx-auto md:max-w-none md:grid md:grid-cols-2 md:gap-8">
                    <div>
                        <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 sm:text-3xl">Get in touch</h2>
                        <div className="mt-3">
                            <p className="text-lg text-gray-500 dark:text-gray-400">
                                Have questions or feedback? We'd love to hear from you. Reach out to us through any of the channels below.
                            </p>
                        </div>
                        <div className="mt-9">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <Phone className="h-6 w-6 text-gray-400" />
                                </div>
                                <div className="ml-3 text-base text-gray-500 dark:text-gray-400">
                                    <p>+1 (555) 123-4567</p>
                                    <p className="mt-1">Mon-Fri 9am to 5pm EST</p>
                                </div>
                            </div>
                            <div className="mt-6 flex">
                                <div className="flex-shrink-0">
                                    <Mail className="h-6 w-6 text-gray-400" />
                                </div>
                                <div className="ml-3 text-base text-gray-500 dark:text-gray-400">
                                    <p>support@examhub.com</p>
                                </div>
                            </div>
                             <div className="mt-6 flex">
                                <div className="flex-shrink-0">
                                    <MapPin className="h-6 w-6 text-gray-400" />
                                </div>
                                <div className="ml-3 text-base text-gray-500 dark:text-gray-400">
                                    <p>123 Exam Prep Lane</p>
                                    <p>Knowledge City, EDU 54321</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-12 sm:mt-16 md:mt-0">
                        <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-lg shadow-md border dark:border-gray-700">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Send us a message</h3>
                             <form action="#" method="POST" className="mt-6 grid grid-cols-1 gap-y-6">
                                <div>
                                    <label htmlFor="name" className="sr_only">Full name</label>
                                    <input type="text" name="name" id="name" autoComplete="name" className="block w-full shadow-sm py-3 px-4 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" placeholder="Full name" />
                                </div>
                                <div>
                                    <label htmlFor="email" className="sr_only">Email</label>
                                    <input id="email" name="email" type="email" autoComplete="email" className="block w-full shadow-sm py-3 px-4 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" placeholder="Email" />
                                </div>
                                <div>
                                    <label htmlFor="message" className="sr_only">Message</label>
                                    <textarea id="message" name="message" rows={4} className="block w-full shadow-sm py-3 px-4 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" placeholder="Message"></textarea>
                                </div>
                                <div>
                                    <button type="submit" className="w-full inline-flex justify-center py-3 px-6 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                        Submit
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactPage;