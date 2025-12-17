import React, { useState, useEffect } from 'react';
import { Exercise, ExerciseSet, WorkoutLogEntry } from '../types';
import { getTargetRepsForSet, calculate1RM, getMaxHistorical1RM } from '../utils/helpers';

interface ExerciseCardProps {
  exercise: Exercise;
  workoutDayKey: string;
  onLogSet: (exerciseName: string, set: ExerciseSet, isPR: boolean) => void;
  onDeleteSet: (exerciseName: string, setIndex: number) => void;
  historyLogs: WorkoutLogEntry[]; 
  previousLogs: any[]; 
  onStartRest: (seconds: number, nextExerciseName?: string) => void;
  isSimpleMode?: boolean;
  onOpenVideo: (url: string, name: string) => void;
  onOpenHistory: (exerciseName: string) => void;
  isGrouped?: boolean; // New prop to style differently if inside a yellow card
  onInputFocus: (value: string, title: string, callback: (val: string) => void) => void; // New prop for keypad
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  onLogSet,
  onDeleteSet,
  historyLogs,
  previousLogs,
  onStartRest,
  isSimpleMode = false,
  onOpenVideo,
  onOpenHistory,
  isGrouped = false,
  onInputFocus
}) => {
  const [kg, setKg] = useState('');
  const [reps, setReps] = useState('');
  
  const currentLog = historyLogs.find(l => l.exerciseName === exercise.name);
  const setsLogged = currentLog ? currentLog.setsPerformed : [];
  const currentSetNumber = setsLogged.length + 1;
  const isComplete = exercise.sets ? setsLogged.length >= exercise.sets : false;

  const currentTargetReps = getTargetRepsForSet(exercise.reps, currentSetNumber);

  const lastPerformance = React.useMemo(() => {
    if (!previousLogs || previousLogs.length === 0) return null;
    const exerciseHistory = previousLogs.filter(l => l.exercise_name === exercise.name);
    const sorted = exerciseHistory.sort((a, b) => new Date(b.raw_date).getTime() - new Date(a.raw_date).getTime());
    
    if (sorted.length > 0) {
      const lastSession = sorted[0];
      const setInHistory = lastSession.sets_performed?.find((s: any) => s.serie === currentSetNumber);
      return setInHistory ? { kg: setInHistory.kg, reps: setInHistory.reps } : null;
    }
    return null;
  }, [previousLogs, exercise.name, currentSetNumber]);

  const historicalMax1RM = React.useMemo(() => {
    return getMaxHistorical1RM(exercise.name, previousLogs);
  }, [previousLogs, exercise.name]);

  useEffect(() => {
    if (isComplete) return;
    const cleanReps = currentTargetReps.replace(/\D/g, '');
    setReps(cleanReps);
    if (lastPerformance) {
      setKg(String(lastPerformance.kg));
    } else {
      setKg('');
    }
  }, [currentSetNumber, isComplete, lastPerformance, currentTargetReps]);

  const handleLog = () => {
    if (!reps) return; 

    const weightNum = parseFloat(kg || '0');
    const repsNum = parseFloat(reps);
    const currentRM = calculate1RM(weightNum, repsNum);
    const isPR = currentRM > historicalMax1RM && historicalMax1RM > 0 && weightNum > 0;

    const newSet: ExerciseSet = {
      serie: currentSetNumber,
      kg: kg || '0',
      reps: reps,
      completionState: 'good'
    };

    onLogSet(exercise.name, newSet, isPR);
    
    if (exercise.rest && !isComplete) {
      const seconds = parseInt(exercise.rest.replace(/\D/g, '')) || 0;
      if (seconds > 0) {
        onStartRest(seconds, exercise.name); 
      }
    }
  };

  const handleContentClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'BUTTON') return;
    if (exercise.videoUrl) {
      onOpenVideo(exercise.videoUrl, exercise.name);
    }
  };

  // If grouped, remove border and background, rely on parent container
  const containerClass = isGrouped 
    ? `p-3 mb-4 border-b border-gray-700/50 last:border-0` 
    : `bg-gray-800/90 border-l-[6px] ${isComplete ? 'border-green-500' : 'border-yellow-500'} rounded-xl p-4 mb-4 shadow-xl relative`;

  return (
    <div className={containerClass}>
      
      {/* Exercise Header */}
      <div className="flex justify-between items-start mb-3" onClick={handleContentClick}>
        <h3 className={`font-bold text-lg leading-tight ${isComplete ? 'text-green-400' : (isGrouped ? 'text-white' : 'text-yellow-400')} flex-1`}>
          {isGrouped ? exercise.name : `${exercise.order}. ${exercise.name}`}
          {exercise.videoUrl && <i className="fas fa-play-circle ml-2 text-sm text-gray-400"></i>}
        </h3>
        
        {/* List Mode Thumbnail */}
        {!isSimpleMode && exercise.imageUrl && (
          <img 
            src={exercise.imageUrl} 
            alt="Exercise" 
            className="w-20 h-20 object-cover rounded-lg bg-gray-900 border border-gray-700 shadow-sm flex-shrink-0 ml-2" 
          />
        )}
      </div>

      {/* Simple Mode Big Image */}
      {isSimpleMode && exercise.imageUrl && (
        <div onClick={handleContentClick} className="mb-4 w-full bg-black/40 rounded-xl overflow-hidden border border-gray-700 flex justify-center p-2 cursor-pointer relative group">
           <img 
              src={exercise.imageUrl} 
              alt={exercise.name} 
              className="max-h-56 w-auto object-contain"
            />
            {exercise.videoUrl && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                 <i className="fas fa-play-circle text-4xl text-white/80"></i>
              </div>
            )}
        </div>
      )}

      {/* Metadata */}
      <div className="flex flex-wrap gap-2 mb-4 text-xs font-medium">
         <div className="bg-gray-700 px-2 py-1 rounded text-white border border-gray-600">
           {exercise.sets} Series
         </div>
         <div className="bg-gray-700 px-2 py-1 rounded text-white border border-gray-600">
           Obj: {currentTargetReps}
         </div>
         {exercise.rest && (
           <div className="bg-gray-700 px-2 py-1 rounded text-gray-300 border border-gray-600">
             <i className="fas fa-clock mr-1 text-yellow-500"></i>{exercise.rest}
           </div>
         )}
      </div>

      {/* History Hint */}
      {!isComplete && lastPerformance && (
        <div 
          onClick={() => onOpenHistory(exercise.name)}
          className="mb-3 text-xs text-blue-300 flex items-center bg-blue-900/20 p-2 rounded-lg border border-blue-900/50 cursor-pointer hover:bg-blue-900/40 transition-colors"
        >
          <i className="fas fa-history mr-2"></i>
          Anterior: <span className="font-bold ml-1 border-b border-dashed border-blue-400">{lastPerformance.kg}kg x {lastPerformance.reps}</span>
          <i className="fas fa-chevron-right ml-auto text-xs opacity-50"></i>
        </div>
      )}

      {/* Input Area */}
      {!isComplete && (
        <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-center mb-4">
          <div className="relative">
            <input
              type="text"
              readOnly
              value={kg}
              onClick={() => onInputFocus(kg, `Peso (${exercise.name})`, setKg)}
              className="w-full bg-gray-700 text-white h-14 rounded-xl text-center text-xl font-bold focus:ring-2 focus:ring-yellow-500 outline-none border border-gray-600 placeholder-gray-500"
              placeholder="Kg"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold pointer-events-none">KG</span>
          </div>
          
          <div className="relative">
            <input
              type="text"
              readOnly
              value={reps}
              onClick={() => onInputFocus(reps, `Reps (${exercise.name})`, setReps)}
              className="w-full bg-gray-700 text-white h-14 rounded-xl text-center text-xl font-bold focus:ring-2 focus:ring-yellow-500 outline-none border border-gray-600 placeholder-gray-500"
              placeholder="Reps"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold pointer-events-none">REPS</span>
          </div>
          
          <button 
            onClick={handleLog}
            className="h-14 w-14 bg-yellow-500 hover:bg-yellow-600 active:scale-95 text-gray-900 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center"
          >
            <i className="fas fa-check text-2xl"></i>
          </button>
        </div>
      )}

      {/* Logged Sets */}
      {setsLogged.length > 0 && (
        <div className="bg-gray-900/40 rounded-xl p-3 border border-gray-700">
          <h4 className="text-[10px] text-gray-400 uppercase font-bold mb-2 tracking-wider">Series Registradas Hoy</h4>
          <div className="space-y-2">
            {setsLogged.map((set, idx) => (
              <div key={idx} className="flex justify-between items-center text-base border-b border-gray-700/50 pb-2 last:border-0 last:pb-0">
                <span className="text-gray-400 text-sm">Serie {set.serie}</span>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-white font-bold text-lg">
                    {set.kg}<span className="text-xs font-sans text-gray-500 ml-0.5 mr-2">kg</span> 
                    {set.reps}<span className="text-xs font-sans text-gray-500 ml-0.5">reps</span>
                  </span>
                  {!isComplete && (
                    <button onClick={() => onDeleteSet(exercise.name, idx)} className="h-8 w-8 flex items-center justify-center bg-red-500/10 text-red-400 rounded-full hover:bg-red-500 hover:text-white transition-colors">
                      <i className="fas fa-trash-alt text-xs"></i>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {isComplete && (
        <div className="mt-2 text-center text-green-400 font-bold text-sm bg-green-500/10 py-2 rounded-lg border border-green-500/20">
          <i className="fas fa-check-circle mr-2"></i> Completado
        </div>
      )}
    </div>
  );
};