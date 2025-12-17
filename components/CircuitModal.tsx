import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Exercise } from '../types';
import { parseDurationToSeconds } from '../utils/helpers';

interface CircuitModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercises: Exercise[];
  config: {
    type: 'circuit' | 'emom';
    totalRounds?: number;
    restBetweenEx?: number; // seconds
    restBetweenRounds?: number; // seconds
    emomIntervals?: number; // Total intervals for EMOM
    emomTimePerInterval?: number; // usually 60s
  };
}

export const CircuitModal: React.FC<CircuitModalProps> = ({ isOpen, onClose, exercises, config }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [phase, setPhase] = useState<'work' | 'rest_ex' | 'rest_round'>('work');
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setIsActive(false);
      setCurrentRound(1);
      setCurrentExerciseIndex(0);
      setPhase('work');
      // Initialize time for the first exercise immediately if it has a duration
      const firstExDuration = parseDurationToSeconds(exercises[0].reps);
      setTimeLeft(firstExDuration > 0 ? firstExDuration : 0);
    }
  }, [isOpen, exercises]);

  useEffect(() => {
    let interval: number;
    if (isActive && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handlePhaseComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handlePhaseComplete = () => {
    if (window.Tone) {
      const synth = new window.Tone.Synth().toDestination();
      synth.triggerAttackRelease('C5', '8n');
    }

    if (config.type === 'emom') {
      const totalIntervals = config.emomIntervals || 10;
      if (currentRound < totalIntervals) {
        setCurrentRound(r => r + 1);
        setCurrentExerciseIndex(i => (i + 1) % exercises.length);
        setTimeLeft(config.emomTimePerInterval || 60);
      } else {
        setIsActive(false); 
      }
    } else {
      // Circuit Logic
      if (phase === 'work') {
        const restEx = config.restBetweenEx || 0;
        if (restEx > 0 && currentExerciseIndex < exercises.length - 1) {
          setPhase('rest_ex');
          setTimeLeft(restEx);
        } else {
          advanceExerciseOrRound();
        }
      } else if (phase === 'rest_ex') {
        advanceExerciseOrRound();
      } else if (phase === 'rest_round') {
        setCurrentRound(r => r + 1);
        setCurrentExerciseIndex(0);
        setPhase('work');
        // Start Work timer for first exercise of new round
        const duration = parseDurationToSeconds(exercises[0].reps);
        setTimeLeft(duration); 
      }
    }
  };

  const advanceExerciseOrRound = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      const nextIndex = currentExerciseIndex + 1;
      setCurrentExerciseIndex(nextIndex);
      setPhase('work');
      // Set time for next exercise
      const duration = parseDurationToSeconds(exercises[nextIndex].reps);
      setTimeLeft(duration);
    } else {
      const totalRounds = config.totalRounds || 3;
      if (currentRound < totalRounds) {
        setPhase('rest_round');
        setTimeLeft(config.restBetweenRounds || 60);
      } else {
        setIsActive(false);
      }
    }
  };

  const startTimer = () => {
    setIsActive(true);
    if (config.type === 'emom') {
      setTimeLeft(config.emomTimePerInterval || 60);
    } else {
      // Circuit start
      // If we are at the start, ensure timeLeft is set to current exercise duration
      if (timeLeft === 0 && phase === 'work') {
         const duration = parseDurationToSeconds(exercises[currentExerciseIndex].reps);
         if (duration > 0) setTimeLeft(duration);
      }
    }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={config.type === 'emom' ? 'EMOM' : 'Circuito'}>
      <div className="flex flex-col items-center">
        
        <div className="w-full flex justify-between text-sm text-gray-400 mb-6 border-b border-gray-700 pb-2">
          <span>Ronda {currentRound} / {config.totalRounds || config.emomIntervals}</span>
          <span>{config.type === 'emom' ? 'Intervalo' : 'Ejercicio'} {currentExerciseIndex + 1} / {exercises.length}</span>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2 leading-tight">
            {phase === 'work' ? exercises[currentExerciseIndex].name : (phase === 'rest_round' ? 'Descanso Ronda' : 'Descanso')}
          </h2>
          <div className={`font-orbitron text-6xl font-bold my-4 ${phase !== 'work' ? 'text-green-400' : 'text-yellow-400'}`}>
            {formatTime(timeLeft)}
          </div>
          {phase === 'work' && (
            <p className="text-xl text-gray-300">Obj: {exercises[currentExerciseIndex].reps}</p>
          )}
        </div>

        <div className="w-full grid grid-cols-2 gap-4">
          {!isActive ? (
            <button onClick={startTimer} className="col-span-2 bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-xl shadow-lg animate-pulse">
              EMPEZAR
            </button>
          ) : (
             <>
               <button onClick={() => setIsActive(false)} className="bg-red-600/80 hover:bg-red-600 text-white py-3 rounded-xl font-bold">
                 Pausar
               </button>
               <button onClick={handlePhaseComplete} className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 py-3 rounded-xl font-bold">
                 Siguiente
               </button>
             </>
          )}
        </div>
      </div>
    </Modal>
  );
};