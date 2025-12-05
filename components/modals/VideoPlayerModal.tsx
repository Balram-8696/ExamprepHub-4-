import React from 'react';
import { X } from 'lucide-react';

interface VideoPlayerModalProps {
    isOpen: boolean;
    onClose: () => void;
    videoUrl: string | null;
}

const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ isOpen, onClose, videoUrl }) => {
    if (!isOpen || !videoUrl) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-[200] animate-fade-in" onClick={onClose}>
            <div className="bg-black rounded-xl shadow-2xl w-full max-w-4xl aspect-video relative animate-scale-in" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute -top-3 -right-3 z-10 p-1.5 bg-white text-gray-800 rounded-full shadow-lg hover:bg-gray-200">
                    <X />
                </button>
                <iframe
                    className="w-full h-full rounded-xl"
                    src={videoUrl}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                ></iframe>
            </div>
        </div>
    );
};

export default VideoPlayerModal;
