import React, { useEffect } from 'react';
import { Check } from 'lucide-react';

interface NotificationProps {
    message: string;
    type: 'success' | 'error';
    isVisible: boolean;
    onClose: () => void;
}

const Notification = ({ message, type, isVisible, onClose }: NotificationProps) => {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose();
            }, 1500);

            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    if (!isVisible) return null;

    return (
        <div className="fixed top-5 right-5 z-50 animate-in fade-in slide-in-from-top-5 duration-300">
            <div className={`
                flex items-center gap-2 rounded-lg shadow-lg p-4 pl-3 pr-6
                ${type === 'success' ? 'bg-green-100 border-l-4 border-green-500' : 'bg-red-100 border-l-4 border-red-500'}
            `}>
                <div className={`
                    rounded-full p-1
                    ${type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}
                `}>
                    <Check size={16} />
                </div>
                <p className={`text-sm font-medium ${type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                    {message}
                </p>
            </div>
        </div>
    );
};

export default Notification;
