
import React from 'react';
import { FooterConfig } from '../../types';
import { Facebook, Twitter, Linkedin, Instagram, Mail, MapPin, Phone } from 'lucide-react';

interface FooterProps {
    onNavigate: (view: string) => void;
    config: FooterConfig | null;
}

const Footer: React.FC<FooterProps> = ({ onNavigate, config }) => {
    const links = config?.links || [];
    const description = config?.description || "Empowering students with comprehensive mock tests and real-time analytics to ace their exams with confidence.";
    const socialLinks = config?.socialLinks || {};
    const contactInfo = config?.contactInfo || {};

    return (
        <footer className="bg-white dark:bg-gray-800 relative mt-16">
             {/* Gradient Line Top */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
            
            <div className="max-w-7xl mx-auto pt-12 pb-8 px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                    
                    {/* Brand & Socials */}
                    <div className="space-y-4">
                         <div className="flex items-center gap-2">
                            <div className="bg-indigo-600 text-white p-1 rounded-md">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
                                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                            <span className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">ExamHub</span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
                            {description}
                        </p>
                        <div className="flex items-center gap-4 pt-2">
                            {socialLinks.facebook && <a href={socialLinks.facebook} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-indigo-500 transition-colors"><Facebook size={20} /></a>}
                            {socialLinks.twitter && <a href={socialLinks.twitter} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-sky-500 transition-colors"><Twitter size={20} /></a>}
                            {socialLinks.linkedin && <a href={socialLinks.linkedin} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-600 transition-colors"><Linkedin size={20} /></a>}
                            {socialLinks.instagram && <a href={socialLinks.instagram} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-pink-600 transition-colors"><Instagram size={20} /></a>}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-4">Quick Links</h3>
                        <ul className="space-y-3">
                            {links.map((link, index) => (
                                <li key={`${link.path}-${index}`}>
                                    <button 
                                        onClick={() => onNavigate(link.path)} 
                                        className="text-base text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                    >
                                        {link.label}
                                    </button>
                                </li>
                            ))}
                             {/* Default links if none provided */}
                            {links.length === 0 && (
                                <>
                                    <li><button onClick={() => onNavigate('home')} className="text-base text-gray-600 dark:text-gray-400 hover:text-indigo-600 transition-colors">Home</button></li>
                                    <li><button onClick={() => onNavigate('about')} className="text-base text-gray-600 dark:text-gray-400 hover:text-indigo-600 transition-colors">About Us</button></li>
                                    <li><button onClick={() => onNavigate('contact')} className="text-base text-gray-600 dark:text-gray-400 hover:text-indigo-600 transition-colors">Contact</button></li>
                                </>
                            )}
                        </ul>
                    </div>

                    {/* Contact Info */}
                     <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-4">Contact Us</h3>
                        <ul className="space-y-3">
                            {contactInfo.address && (
                                <li className="flex items-start gap-3 text-gray-600 dark:text-gray-400 text-sm">
                                    <MapPin className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                                    <span>{contactInfo.address}</span>
                                </li>
                            )}
                            {contactInfo.phone && (
                                <li className="flex items-center gap-3 text-gray-600 dark:text-gray-400 text-sm">
                                    <Phone className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                                    <span>{contactInfo.phone}</span>
                                </li>
                            )}
                            {contactInfo.email && (
                                <li className="flex items-center gap-3 text-gray-600 dark:text-gray-400 text-sm">
                                    <Mail className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                                    <span>{contactInfo.email}</span>
                                </li>
                            )}
                        </ul>
                    </div>

                </div>
                
                <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center md:text-left">
                        &copy; {new Date().getFullYear()} ExamHub. All rights reserved.
                    </p>
                    <div className="flex gap-6 text-sm text-gray-500 dark:text-gray-400">
                         <button onClick={() => onNavigate('privacy')} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Privacy Policy</button>
                         <button onClick={() => onNavigate('terms')} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Terms of Service</button>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
