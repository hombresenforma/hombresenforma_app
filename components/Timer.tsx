import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';

interface TimerProps {
  seconds: number;
  isActive: boolean;
  label?: string;
  nextExercise?: string;
  onComplete: () => void;
  onCancel: () => void;
  onAddSeconds: (s: number) => void;
}

// Global Tone access
declare global {
  interface Window {
    Tone: any;
  }
}

export const RestTimer: React.FC<TimerProps> = ({ 
  seconds, 
  isActive, 
  label = "DESCANSO", 
  nextExercise, 
  onComplete, 
  onCancel,
  onAddSeconds 
}) => {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    setTimeLeft(seconds);
  }, [seconds]);

  useEffect(() => {
    let interval: number;
    if (isActive && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            playBeep('A5', '8n');
            onComplete();
            return 0;
          }
          if (prev <= 4) playBeep('C4', '16n');
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, onComplete]);

  const playBeep = (note: string, duration: string) => {
    if (window.Tone && window.Tone.context.state === 'running') {
      const synth = new window.Tone.Synth().toDestination();
      synth.volume.value = -5;
      synth.triggerAttackRelease(note, duration);
    }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isActive) return null;

  // Minimized View
  if (isMinimized) {
    return (
      <div 
        onClick={() => setIsMinimized(false)}
        className="fixed top-20 left-4 z-50 bg-gray-800 border-2 border-yellow-500 rounded-lg p-3 shadow-xl cursor-pointer flex flex-col items-center animate-bounce-in"
      >
        <span className="font-orbitron text-xl font-bold text-white">{formatTime(timeLeft)}</span>
        <span className="text-[10px] text-gray-300 uppercase tracking-wider">Rest</span>
      </div>
    );
  }

  // Full Modal View
  return (
    <Modal isOpen={true} onClose={() => setIsMinimized(true)} title="Temporizador">
      <div className="flex flex-col items-center gap-4">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-yellow-400 mb-1">{label}</h2>
          {nextExercise && <p className="text-sm text-gray-400">Siguiente: {nextExercise}</p>}
        </div>
        
        <div className="font-orbitron text-7xl font-bold text-white my-4">
          {formatTime(timeLeft)}
        </div>

        <div className="grid grid-cols-3 gap-3 w-full">
          <button onClick={() => onAddSeconds(-10)} className="bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-bold transition">-10s</button>
          <button onClick={() => setIsMinimized(true)} className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold transition">Minimizar</button>
          <button onClick={() => onAddSeconds(10)} className="bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-bold transition">+10s</button>
        </div>
        
        <button onClick={onCancel} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-bold uppercase tracking-wider mt-2">
          Saltar Descanso
        </button>
      </div>
    </Modal>
  );
};