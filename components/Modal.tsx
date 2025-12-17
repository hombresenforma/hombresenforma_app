import React, { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-80 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-800 border-2 border-yellow-500 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-scale-up">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h3 className="text-xl font-bold text-yellow-400 truncate">{title}</h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
          >
            &times;
          </button>
        </div>
        <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
