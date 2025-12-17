import React from 'react';
import { Modal } from './Modal';

interface VideoConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  exerciseName: string;
}

export const VideoConfirmModal: React.FC<VideoConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  exerciseName 
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ver Vídeo">
      <div className="flex flex-col items-center text-center p-2">
        {/* Icon removed to save space as requested */}
        
        <h3 className="text-xl text-white font-bold mb-2 mt-2">
          ¿Abrir vídeo explicativo?
        </h3>
        <p className="text-gray-400 mb-6 text-sm">
          Vas a salir de la app para ver la técnica de: <br/>
          <span className="text-yellow-400 font-semibold text-base">{exerciseName}</span>
        </p>
        
        <div className="flex w-full gap-4">
          <button 
            onClick={onClose}
            className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-3 rounded-xl font-bold text-lg transition-transform active:scale-95"
          >
            Cancelar
          </button>
          <button 
            onClick={() => { onConfirm(); onClose(); }}
            className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-gray-900 py-3 rounded-xl font-bold text-lg transition-transform active:scale-95"
          >
            Ver Vídeo
          </button>
        </div>
      </div>
    </Modal>
  );
};