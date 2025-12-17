import React, { useEffect, useState, useCallback, useRef } from 'react';
import { fetchWorkoutData, getUserIdentifier, fetchLogs, saveSessionLog } from './services/dataService';
import { WorkoutData, WorkoutLogEntry, ExerciseSet, Exercise } from './types';
import { RestTimer } from './components/Timer';
import { ExerciseCard } from './components/ExerciseCard';
import { VideoConfirmModal } from './components/VideoConfirmModal';
import { WorkoutHistoryModal, ExerciseProgressModal } from './components/HistoryViews';
import { CircuitModal } from './components/CircuitModal';
import { Modal } from './components/Modal';
import { NumericKeypad } from './components/NumericKeypad';

declare global {
  interface Window {
    Tone: any;
  }
}

interface SlideItem {
  type: 'single' | 'group';
  exercises: Exercise[];
  groupTitle?: string;
  isSuperset?: boolean;
  isCircuit?: boolean;
  circuitConfig?: any;
  order?: number;
}

const WorkoutTimer: React.FC<{ startTime: number }> = ({ startTime }) => {
  const [elapsed, setElapsed] = useState("00:00");

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.floor((now - startTime) / 1000);
      const hours = Math.floor(diff / 3600);
      const mins = Math.floor((diff % 3600) / 60);
      const secs = diff % 60;
      
      if (hours > 0) {
        setElapsed(`${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      } else {
        setElapsed(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return <div className="text-yellow-400 font-mono font-bold text-lg border border-yellow-500/30 px-3 py-1 rounded bg-yellow-500/10">{elapsed}</div>;
};

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<string | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  
  const [workoutData, setWorkoutData] = useState<WorkoutData | null>(null);
  const [previousLogs, setPreviousLogs] = useState<any[]>([]); 
  
  const [activeDayKey, setActiveDayKey] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'home' | 'list' | 'simple'>('home');
  const [simpleModeIndex, setSimpleModeIndex] = useState(0);
  
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedExerciseForHistory, setSelectedExerciseForHistory] = useState<string | null>(null);

  const [videoModal, setVideoModal] = useState<{ isOpen: boolean; url: string; name: string }>({ 
    isOpen: false, url: '', name: '' 
  });
  const [circuitModalData, setCircuitModalData] = useState<{isOpen: boolean, exercises: Exercise[], config: any} | null>(null);

  // Keypad State
  const [keypadOpen, setKeypadOpen] = useState(false);
  const [keypadTitle, setKeypadTitle] = useState('');
  // We need a ref to the current setter to avoid stale closures in the keypad callback
  const activeInputSetterRef = useRef<((val: string | ((prev: string) => string)) => void) | null>(null);
  const [shouldClearInput, setShouldClearInput] = useState(false);

  // Confirmation Modals
  const [confirmExitModal, setConfirmExitModal] = useState(false);
  const [confirmFinishModal, setConfirmFinishModal] = useState(false);
  const [newRecordModal, setNewRecordModal] = useState(false);
  const [resumeSessionModal, setResumeSessionModal] = useState(false);
  const [logoutConfirmModal, setLogoutConfirmModal] = useState(false);

  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [currentLogs, setCurrentLogs] = useState<WorkoutLogEntry[]>([]);

  const [timerState, setTimerState] = useState<{
    active: boolean;
    seconds: number;
    label: string;
    nextExercise?: string;
  }>({ active: false, seconds: 0, label: '' });

  const initAudio = useCallback(() => {
    if (window.Tone && window.Tone.context.state !== 'running') {
      window.Tone.start();
    }
  }, []);

  // --- Persistence Logic ---
  const saveProgressToStorage = useCallback(() => {
    if (!user || !sessionStartTime) return;
    const state = {
      user,
      sessionStartTime,
      currentLogs,
      activeDayKey,
      viewMode,
      simpleModeIndex
    };
    localStorage.setItem(`hef_session_${user}`, JSON.stringify(state));
  }, [user, sessionStartTime, currentLogs, activeDayKey, viewMode, simpleModeIndex]);

  const clearProgressFromStorage = useCallback(() => {
    if (user) {
      localStorage.removeItem(`hef_session_${user}`);
    }
  }, [user]);

  // Auto-save effect
  useEffect(() => {
    if (sessionStartTime) {
      saveProgressToStorage();
    }
  }, [saveProgressToStorage]);

  const loadUserData = async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [data, logs] = await Promise.all([
        fetchWorkoutData(userId),
        fetchLogs(userId)
      ]);
      
      setWorkoutData(data);
      setPreviousLogs(logs);
      setUser(userId);
      
      // Check for saved session
      const savedSession = localStorage.getItem(`hef_session_${userId}`);
      if (savedSession) {
        setResumeSessionModal(true);
      } else {
        if (data && Object.keys(data).length > 0) {
          setActiveDayKey(Object.keys(data)[0]);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al cargar los datos.');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const urlUser = getUserIdentifier();
    if (urlUser) {
      loadUserData(urlUser);
    } else {
      setLoading(false);
    }
  }, []);

  const handleResumeSession = () => {
    if (!user) return;
    const saved = localStorage.getItem(`hef_session_${user}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      setSessionStartTime(parsed.sessionStartTime);
      setCurrentLogs(parsed.currentLogs);
      setActiveDayKey(parsed.activeDayKey);
      setViewMode(parsed.viewMode);
      setSimpleModeIndex(parsed.simpleModeIndex);
      setResumeSessionModal(false);
      initAudio();
    }
  };

  const handleDiscardSession = () => {
    clearProgressFromStorage();
    setResumeSessionModal(false);
    if (workoutData && Object.keys(workoutData).length > 0) {
      setActiveDayKey(Object.keys(workoutData)[0]);
    }
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;
    loadUserData(usernameInput.trim().toLowerCase());
  };

  const handleLogout = () => {
    setLogoutConfirmModal(true);
  };

  const confirmLogout = () => {
    setUser(null);
    setViewMode('home');
    setSessionStartTime(null);
    setCurrentLogs([]);
    setLogoutConfirmModal(false);
  };

  const startWorkout = (mode: 'list' | 'simple') => {
    initAudio();
    setViewMode(mode);
    setSessionStartTime(Date.now());
    setCurrentLogs([]);
    setSimpleModeIndex(0);
  };

  // --- Keypad Logic ---
  const handleInputFocus = (value: string, title: string, setter: (val: string) => void) => {
    activeInputSetterRef.current = setter;
    setKeypadTitle(title);
    setShouldClearInput(true); // Flag to clear input on next keypress
    setKeypadOpen(true);
  };

  const handleKeypadPress = (key: string) => {
    if (!activeInputSetterRef.current) return;

    if (key === 'backspace') {
      activeInputSetterRef.current((prev) => prev.slice(0, -1));
      setShouldClearInput(false);
      return;
    }

    if (shouldClearInput) {
      // Overwrite mode
      if (key === '.') activeInputSetterRef.current('0.');
      else activeInputSetterRef.current(key);
      setShouldClearInput(false);
    } else {
      // Append mode
      activeInputSetterRef.current((prev) => {
        if (key === '.' && prev.includes('.')) return prev;
        if (prev === '0' && key !== '.') return key;
        return prev + key;
      });
    }
  };

  const handleLogSet = (exerciseName: string, set: ExerciseSet, isPR: boolean) => {
    if (isPR) {
      setNewRecordModal(true);
      if (window.Tone) {
        const synth = new window.Tone.Synth().toDestination();
        synth.triggerAttackRelease('G5', '8n');
        setTimeout(() => synth.triggerAttackRelease('C6', '4n'), 200);
      }
    }

    setCurrentLogs(prev => {
      const existing = prev.find(l => l.exerciseName === exerciseName);
      if (existing) {
        const updatedRecord = isPR ? `${set.kg}` : existing.personalRecord;
        return prev.map(l => l.exerciseName === exerciseName ? {
          ...l,
          setsPerformed: [...l.setsPerformed, set],
          personalRecord: updatedRecord
        } : l);
      } else {
        return [...prev, {
          exerciseName,
          setsPerformed: [set],
          completionState: 'neutral',
          dayKey: activeDayKey || '',
          date: new Date().toLocaleDateString(),
          time: new Date().toLocaleTimeString(),
          rawDate: new Date().toISOString(),
          personalRecord: isPR ? `${set.kg}` : undefined
        }];
      }
    });
  };

  const handleDeleteSet = (exerciseName: string, setIndex: number) => {
    setCurrentLogs(prev => {
      return prev.map(l => {
        if (l.exerciseName === exerciseName) {
          const newSets = [...l.setsPerformed];
          newSets.splice(setIndex, 1);
          return { ...l, setsPerformed: newSets };
        }
        return l;
      });
    });
  };

  const handleExitWorkout = () => {
    setConfirmExitModal(true);
  };

  const confirmExit = () => {
    setConfirmExitModal(false);
    clearProgressFromStorage();
    setViewMode('home');
    setSessionStartTime(null);
    setCurrentLogs([]);
  };

  const handleRequestFinish = () => {
    setConfirmFinishModal(true);
  };

  const confirmFinish = async () => {
    setConfirmFinishModal(false);
    if (!sessionStartTime || !activeDayKey || !workoutData || !user) return;
    
    setLoading(true);
    const endTime = Date.now();
    const durationMs = endTime - sessionStartTime;
    const hours = Math.floor(durationMs / 3600000);
    const minutes = Math.floor((durationMs % 3600000) / 60000);
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    let totalVolume = 0;
    currentLogs.forEach(l => {
      l.setsPerformed.forEach(s => {
        totalVolume += (parseFloat(s.kg as string) || 0) * (parseInt(s.reps as string) || 0);
      });
    });

    const sessionData = {
      sessionId: crypto.randomUUID(),
      workoutName: workoutData[activeDayKey].name,
      logs: currentLogs,
      totalTime: timeStr,
      totalVolume: totalVolume
    };

    try {
      await saveSessionLog(user, sessionData);
      const newLogs = await fetchLogs(user);
      setPreviousLogs(newLogs);
      clearProgressFromStorage();
      setViewMode('home');
      setSessionStartTime(null);
    } catch (e) {
      alert('Error al guardar entrenamiento.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const startRestTimer = (seconds: number, nextExercise?: string) => {
    setTimerState({
      active: true,
      seconds,
      label: 'DESCANSO',
      nextExercise
    });
  };

  const handleOpenVideo = (url: string, name: string) => {
    setVideoModal({ isOpen: true, url, name });
  };
  
  const handleOpenHistory = (exerciseName: string) => {
    setSelectedExerciseForHistory(exerciseName);
    setShowProgressModal(true);
  };

  const getGroupedExercises = (): SlideItem[] => {
    if (!workoutData || !activeDayKey) return [];
    const day = workoutData[activeDayKey];
    
    return day.exercises.map(ex => {
      if (ex.items && ex.items.length > 0) {
        const subExercises: Exercise[] = ex.items.map(sub => ({
           ...ex, ...sub, name: sub.name, order: ex.order
        }));
        
        let config = {};
        if (ex.isEMOM) config = { type: 'emom', emomIntervals: ex.emomDetails?.totalIntervals };
        if (ex.circuitDetails) config = { 
          type: 'circuit', 
          totalRounds: ex.circuitDetails.totalRounds,
          restBetweenEx: parseInt(ex.circuitDetails.restBetweenExercisesSeconds) || 0,
          restBetweenRounds: parseInt(ex.circuitDetails.restBetweenRoundsSeconds) || 0
        };

        return {
          type: 'group',
          exercises: subExercises,
          groupTitle: ex.isSuperset ? 'Superserie' : (ex.isEMOM ? 'EMOM' : (ex.circuitDetails ? 'Circuito' : ex.name)),
          isSuperset: ex.isSuperset,
          isCircuit: !!ex.circuitDetails || !!ex.isEMOM,
          circuitConfig: config,
          order: ex.order
        };
      }
      return { type: 'single', exercises: [ex], order: ex.order };
    });
  };

  const groupedExercises = getGroupedExercises();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#1A263A]"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-yellow-500"></div></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#1A263A]" onClick={initAudio}>
         <div className="w-full max-w-md bg-gray-800 border-2 border-yellow-500 rounded-xl shadow-2xl p-8 flex flex-col items-center">
            <img src="https://storage.googleapis.com/msgsndr/dikOTQ4DE3OClw85d5oB/media/6821cea25072096f7d31d5c1.png" alt="Logo" className="h-16 mb-6" />
            <h2 className="text-xl font-medium text-center text-gray-300 mb-6">Escribe tu usuario para acceder</h2>
            {error && <div className="bg-red-500/20 text-red-100 p-3 rounded mb-4 text-center w-full">{error}</div>}
            <form onSubmit={handleManualLogin} className="space-y-4 w-full">
              <input type="text" className="w-full bg-gray-700 p-4 text-white rounded-lg outline-none focus:ring-2 focus:ring-yellow-500 text-center text-lg" placeholder="Usuario" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} />
              <button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-4 rounded-lg transition-colors">ENTRAR</button>
            </form>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 max-w-2xl mx-auto px-3" onClick={initAudio}>
      {/* Header */}
      <header className="bg-gray-800/95 backdrop-blur-md shadow-xl rounded-b-2xl p-4 mb-6 border-b-2 border-yellow-500 sticky top-0 z-30 flex justify-between items-center">
        <img src="https://storage.googleapis.com/msgsndr/dikOTQ4DE3OClw85d5oB/media/6821cea25072096f7d31d5c1.png" alt="Logo" className="h-10" />
        
        {sessionStartTime && <WorkoutTimer startTime={sessionStartTime} />}

        <div className="flex items-center gap-4">
           {!sessionStartTime && <div className="text-yellow-400 font-bold uppercase text-xs tracking-widest border border-yellow-500/30 px-2 py-1 rounded bg-yellow-500/10">{user}</div>}
           <button onClick={handleLogout} className="text-gray-400 hover:text-white p-2">
              <i className="fas fa-sign-out-alt text-xl"></i>
           </button>
        </div>
      </header>

      <main>
        {/* HOME */}
        {viewMode === 'home' && workoutData && (
          <div className="animate-fade-in space-y-6">
            <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar px-1">
              {Object.keys(workoutData).map(key => (
                <button 
                  key={key} 
                  onClick={() => setActiveDayKey(key)} 
                  className={`flex-shrink-0 px-4 py-2 rounded-full font-bold text-sm transition-all shadow-sm ${
                    activeDayKey === key 
                      ? 'bg-yellow-500 text-gray-900 ring-2 ring-yellow-300' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {workoutData[key].name.split(':')[0]}
                </button>
              ))}
            </div>

            {activeDayKey && (
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-2xl">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold text-yellow-400 leading-tight">{workoutData[activeDayKey].name}</h2>
                </div>

                {/* Preview List */}
                <div className="mb-6 bg-gray-900/50 rounded-xl p-4 border border-gray-700/50 max-h-60 overflow-y-auto custom-scrollbar">
                  <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-3">Resumen de la Sesión</h3>
                  <div className="space-y-3">
                    {workoutData[activeDayKey].exercises.map((ex, index) => (
                      <div key={index} className="flex flex-col">
                        <div className="flex items-start">
                          <span className="text-yellow-500/50 font-mono text-sm mr-3 mt-0.5">{ex.order}.</span>
                          <div className="flex-1">
                            <span className="text-gray-200 text-sm font-medium leading-snug block">
                              {ex.isSuperset || ex.circuitDetails || ex.isEMOM 
                                ? (ex.isSuperset ? 'SUPERSERIE' : ex.isEMOM ? 'EMOM' : 'CIRCUITO') 
                                : ex.name}
                            </span>
                            {/* Sub Items */}
                            {ex.items && ex.items.length > 0 && (
                              <div className="mt-1 pl-2 border-l-2 border-gray-700 space-y-1">
                                {ex.items.map((sub, sIdx) => (
                                  <div key={sIdx} className="text-xs text-gray-400">
                                    • {sub.name}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => startWorkout('list')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg text-sm sm:text-base flex flex-col items-center justify-center gap-1">
                    <i className="fas fa-list-ol text-xl"></i> 
                    <span>Modo Lista</span>
                  </button>
                  <button onClick={() => startWorkout('simple')} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg text-sm sm:text-base flex flex-col items-center justify-center gap-1">
                    <i className="fas fa-mobile-alt text-xl"></i> 
                    <span>Modo Guiado</span>
                  </button>
                </div>
              </div>
            )}
            
            <button onClick={() => setShowHistoryModal(true)} className="w-full bg-gray-700 p-5 rounded-xl flex justify-between items-center border border-gray-600"><span className="font-bold text-gray-200">Historial de Entrenos</span><i className="fas fa-history text-yellow-500"></i></button>
            <button onClick={() => { setSelectedExerciseForHistory(null); setShowProgressModal(true); }} className="w-full bg-gray-700 p-5 rounded-xl flex justify-between items-center border border-gray-600"><span className="font-bold text-gray-200">Progreso Ejercicios</span><i className="fas fa-chart-line text-blue-500"></i></button>
          </div>
        )}

        {/* LIST MODE */}
        {viewMode === 'list' && activeDayKey && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6 bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-700">
              <h2 className="text-lg font-bold text-yellow-400 truncate w-2/3">{workoutData![activeDayKey].name}</h2>
              <button onClick={handleExitWorkout} className="bg-red-600 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-lg mr-2">SALIR</button>
            </div>
            
            <div className="space-y-6">
              {groupedExercises.map((group, i) => (
                <div key={i} className={group.type === 'group' ? "bg-gray-800/90 border-l-[6px] border-yellow-500 rounded-xl overflow-hidden shadow-xl" : ""}>
                  {group.type === 'group' && (
                    <div className="bg-yellow-500 text-gray-900 px-4 py-2 font-bold flex justify-between items-center">
                      <span>{group.order}. {group.groupTitle?.toUpperCase()}</span>
                      {group.isCircuit && (
                        <button onClick={() => setCircuitModalData({ isOpen: true, exercises: group.exercises, config: group.circuitConfig })} className="text-xs bg-gray-900 text-white px-2 py-1 rounded border border-gray-700">
                          <i className="fas fa-stopwatch mr-1"></i> TIMER
                        </button>
                      )}
                    </div>
                  )}
                  <div className={group.type === 'group' ? "p-2 bg-gray-800" : ""}>
                    {group.exercises.map((ex, idx) => (
                      <ExerciseCard 
                        key={`${activeDayKey}-${i}-${idx}`}
                        exercise={ex}
                        workoutDayKey={activeDayKey}
                        onLogSet={handleLogSet}
                        onDeleteSet={handleDeleteSet}
                        historyLogs={currentLogs}
                        previousLogs={previousLogs}
                        onStartRest={startRestTimer}
                        onOpenVideo={handleOpenVideo}
                        onOpenHistory={handleOpenHistory}
                        isGrouped={group.type === 'group'}
                        onInputFocus={handleInputFocus}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={handleRequestFinish} className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-xl shadow-lg animate-pulse">FINALIZAR ENTRENAMIENTO</button>
          </div>
        )}

        {/* SIMPLE MODE */}
        {viewMode === 'simple' && activeDayKey && (
          <div className="flex flex-col h-[calc(100vh-140px)] animate-fade-in">
             {(() => {
               const slide = groupedExercises[simpleModeIndex];
               return (
                 <>
                   <div className="flex justify-between items-center mb-4 bg-gray-800 p-3 rounded-xl shadow border border-gray-700">
                      <div className="text-sm font-medium text-gray-300">
                         {slide.type === 'group' ? slide.groupTitle : `Ejercicio ${simpleModeIndex + 1}`} 
                         <span className="text-yellow-400 font-bold ml-2">({simpleModeIndex + 1}/{groupedExercises.length})</span>
                      </div>
                      <button onClick={handleExitWorkout} className="bg-red-600/20 text-red-400 px-3 py-1 rounded-lg text-sm font-bold border border-red-500/30">SALIR</button>
                   </div>

                   <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
                      {slide.type === 'group' && (
                        <div className="bg-yellow-500 text-gray-900 text-center font-bold py-2 rounded-t-xl mb-0 shadow-md relative z-10">
                          {slide.order}. {slide.groupTitle?.toUpperCase()}
                        </div>
                      )}
                      
                      {slide.isCircuit && (
                        <div className="bg-gray-800 p-4 mb-4 border-l-4 border-yellow-500 rounded-b-xl">
                          <button onClick={() => setCircuitModalData({ isOpen: true, exercises: slide.exercises, config: slide.circuitConfig })} className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-bold shadow-lg flex items-center justify-center gap-2">
                             <i className="fas fa-stopwatch text-xl"></i> INICIAR TIMER {slide.groupTitle?.toUpperCase()}
                          </button>
                        </div>
                      )}

                      <div className={`space-y-6 ${slide.type === 'group' && !slide.isCircuit ? 'bg-gray-800/50 p-2 pt-4 rounded-b-xl border border-gray-700 border-t-0' : ''}`}>
                        {slide.exercises.map((ex, idx) => (
                          <ExerciseCard 
                            key={`simple-${activeDayKey}-${simpleModeIndex}-${idx}`}
                            exercise={ex}
                            workoutDayKey={activeDayKey}
                            onLogSet={handleLogSet}
                            onDeleteSet={handleDeleteSet}
                            historyLogs={currentLogs}
                            previousLogs={previousLogs}
                            onStartRest={startRestTimer}
                            isSimpleMode={true}
                            onOpenVideo={handleOpenVideo}
                            onOpenHistory={handleOpenHistory}
                            isGrouped={slide.type === 'group'}
                            onInputFocus={handleInputFocus}
                          />
                        ))}
                      </div>
                   </div>

                   {/* Bottom Nav with Finish Button */}
                   <div className="flex justify-between items-center mt-2 gap-2 bg-gray-900/80 p-3 rounded-2xl border border-gray-700">
                      <button onClick={() => setSimpleModeIndex(Math.max(0, simpleModeIndex - 1))} disabled={simpleModeIndex === 0} className="bg-gray-700 disabled:opacity-30 text-white w-14 h-14 rounded-2xl shadow-lg flex items-center justify-center flex-shrink-0"><i className="fas fa-arrow-left text-xl"></i></button>
                      
                      <button onClick={handleRequestFinish} className="flex-1 bg-green-600 hover:bg-green-700 text-white h-14 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center px-2">
                        FINALIZAR
                      </button>

                      <button onClick={() => setSimpleModeIndex(Math.min(groupedExercises.length - 1, simpleModeIndex + 1))} disabled={simpleModeIndex === groupedExercises.length - 1} className="bg-yellow-500 disabled:opacity-30 text-gray-900 w-14 h-14 rounded-2xl shadow-lg flex items-center justify-center flex-shrink-0"><i className="fas fa-arrow-right text-xl"></i></button>
                   </div>
                 </>
               );
             })()}
          </div>
        )}
      </main>

      {/* MODALS */}
      <RestTimer 
        isActive={timerState.active}
        seconds={timerState.seconds}
        label={timerState.label}
        nextExercise={timerState.nextExercise}
        onComplete={() => setTimerState(prev => ({ ...prev, active: false }))}
        onCancel={() => setTimerState(prev => ({ ...prev, active: false }))}
        onAddSeconds={(s) => setTimerState(prev => ({ ...prev, seconds: prev.seconds + s }))}
      />

      <VideoConfirmModal isOpen={videoModal.isOpen} onClose={() => setVideoModal({ ...videoModal, isOpen: false })} onConfirm={() => window.open(videoModal.url, '_blank')} exerciseName={videoModal.name} />

      <NumericKeypad 
        isOpen={keypadOpen} 
        onClose={() => setKeypadOpen(false)} 
        onPress={handleKeypadPress}
        onConfirm={() => setKeypadOpen(false)}
        title={keypadTitle}
      />

      {showHistoryModal && <WorkoutHistoryModal logs={previousLogs} onClose={() => setShowHistoryModal(false)} />}
      
      {showProgressModal && (
        <ExerciseProgressModal 
          logs={previousLogs} 
          initialExercise={selectedExerciseForHistory}
          onClose={() => {
            setShowProgressModal(false);
            setSelectedExerciseForHistory(null);
          }} 
        />
      )}
      
      {circuitModalData && <CircuitModal isOpen={circuitModalData.isOpen} onClose={() => setCircuitModalData(null)} exercises={circuitModalData.exercises} config={circuitModalData.config} />}

      {/* Confirmation Modals */}
      {confirmExitModal && (
        <Modal isOpen={true} onClose={() => setConfirmExitModal(false)} title="¿Salir sin guardar?">
          <div className="text-center p-4">
            <p className="text-gray-300 mb-6">Si sales ahora, se perderán todos los datos de esta sesión.</p>
            <div className="flex gap-4">
              <button onClick={() => setConfirmExitModal(false)} className="flex-1 bg-gray-600 py-3 rounded-lg font-bold">Cancelar</button>
              <button onClick={confirmExit} className="flex-1 bg-red-600 py-3 rounded-lg font-bold text-white">Salir</button>
            </div>
          </div>
        </Modal>
      )}

      {logoutConfirmModal && (
        <Modal isOpen={true} onClose={() => setLogoutConfirmModal(false)} title="¿Cerrar Sesión?">
          <div className="text-center p-4">
            <p className="text-gray-300 mb-6">¿Seguro que quieres cambiar de usuario?</p>
            <div className="flex gap-4">
              <button onClick={() => setLogoutConfirmModal(false)} className="flex-1 bg-gray-600 py-3 rounded-lg font-bold">Cancelar</button>
              <button onClick={confirmLogout} className="flex-1 bg-red-600 py-3 rounded-lg font-bold text-white">Salir</button>
            </div>
          </div>
        </Modal>
      )}

      {resumeSessionModal && (
        <Modal isOpen={true} onClose={() => {}} title="Entrenamiento en Curso">
          <div className="text-center p-4">
            <p className="text-gray-300 mb-6">Se ha detectado un entrenamiento no finalizado. ¿Quieres continuar?</p>
            <div className="flex gap-4">
              <button onClick={handleDiscardSession} className="flex-1 bg-red-600/80 hover:bg-red-600 py-3 rounded-lg font-bold text-white">Descartar</button>
              <button onClick={handleResumeSession} className="flex-1 bg-green-600 hover:bg-green-500 py-3 rounded-lg font-bold text-white">Reanudar</button>
            </div>
          </div>
        </Modal>
      )}

      {confirmFinishModal && (
        <Modal isOpen={true} onClose={() => setConfirmFinishModal(false)} title="¿Finalizar Entreno?">
          <div className="text-center p-4">
            <p className="text-gray-300 mb-6">¿Estás seguro de que quieres guardar y finalizar esta sesión?</p>
            <div className="flex gap-4">
              <button onClick={() => setConfirmFinishModal(false)} className="flex-1 bg-gray-600 py-3 rounded-lg font-bold">Revisar</button>
              <button onClick={confirmFinish} className="flex-1 bg-green-600 py-3 rounded-lg font-bold text-white">Guardar</button>
            </div>
          </div>
        </Modal>
      )}

      {newRecordModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setNewRecordModal(false)}>
           <div className="bg-yellow-500 rounded-full p-10 animate-scale-up shadow-[0_0_50px_rgba(250,204,21,0.6)] flex flex-col items-center">
              <i className="fas fa-trophy text-6xl text-gray-900 mb-2"></i>
              <h2 className="text-2xl font-black text-gray-900 uppercase">¡Nuevo Récord!</h2>
           </div>
        </div>
      )}
    </div>
  );
};
export default App;