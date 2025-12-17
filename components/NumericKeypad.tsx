import React from 'react';

interface NumericKeypadProps {
  isOpen: boolean;
  onClose: () => void;
  onPress: (key: string) => void;
  onConfirm: () => void;
  title: string;
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({ 
  isOpen, 
  onClose, 
  onPress,
  onConfirm,
  title 
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity" 
        onClick={onConfirm}
      />
      
      {/* Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[70] bg-gray-800 border-t-4 border-yellow-500 rounded-t-3xl shadow-2xl h-[50vh] flex flex-col animate-slide-up">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h3 className="text-yellow-400 font-bold text-lg">{title}</h3>
          <button onClick={onConfirm} className="text-green-400 font-bold text-lg px-4 py-2 bg-gray-700 rounded-lg">
            OK
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 p-2 grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button 
              key={num}
              onClick={() => onPress(num.toString())}
              className="bg-gray-700 hover:bg-gray-600 active:bg-yellow-500 active:text-gray-900 text-white text-3xl font-bold rounded-xl transition-colors shadow-sm"
            >
              {num}
            </button>
          ))}
          <button 
            onClick={() => onPress('.')}
            className="bg-gray-700 hover:bg-gray-600 active:bg-yellow-500 active:text-gray-900 text-white text-3xl font-bold rounded-xl transition-colors"
          >
            .
          </button>
          <button 
            onClick={() => onPress('0')}
            className="bg-gray-700 hover:bg-gray-600 active:bg-yellow-500 active:text-gray-900 text-white text-3xl font-bold rounded-xl transition-colors"
          >
            0
          </button>
          <button 
            onClick={() => onPress('backspace')}
            className="bg-red-900/30 hover:bg-red-900/50 text-red-400 text-2xl font-bold rounded-xl flex items-center justify-center transition-colors"
          >
            <i className="fas fa-backspace"></i>
          </button>
        </div>
      </div>
    </>
  );
};