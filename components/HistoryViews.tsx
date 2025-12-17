import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Modal } from './Modal';
import { formatDateSpanish, calculate1RM } from '../utils/helpers';

declare global {
  interface Window {
    Chart: any;
  }
}

interface HistoryViewProps {
  logs: any[];
  onClose: () => void;
  initialExercise?: string | null;
}

export const WorkoutHistoryModal: React.FC<HistoryViewProps> = ({ logs, onClose }) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const sessions = useMemo(() => {
    const grouped: Record<string, { date: string, time: string, name: string, exercises: any[], rawDate: string, hasPR: boolean }> = {};
    
    logs.forEach(log => {
      // Check for PR flag in individual exercises (this field needs to be saved in Supabase)
      // or check the summary's parsed data if available.
      // For now, let's assume if any log has a high 1RM we might tag it, but realistically 
      // we need a 'personalRecord' field on the log entry.
      const isPR = !!log.personalRecord; 

      if (log.exercise_name === 'Workout Session Summary') {
        if (!grouped[log.session_id]) {
           grouped[log.session_id] = {
             date: log.date,
             time: log.time,
             name: log.name_workout,
             exercises: [],
             rawDate: log.raw_date,
             hasPR: false
           };
        } else {
           grouped[log.session_id].name = log.name_workout;
        }
        return; 
      }

      if (!grouped[log.session_id]) {
        grouped[log.session_id] = {
          date: log.date,
          time: log.time,
          name: log.name_workout || 'Entrenamiento',
          exercises: [],
          rawDate: log.raw_date,
          hasPR: false
        };
      }
      grouped[log.session_id].exercises.push(log);
      if (log.personalRecord) grouped[log.session_id].hasPR = true;
    });

    return Object.values(grouped).sort((a, b) => 
      new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime()
    );
  }, [logs]);

  if (selectedSessionId) {
    const details = logs.filter(l => l.session_id === selectedSessionId && l.exercise_name !== 'Workout Session Summary');
    const summary = logs.find(l => l.session_id === selectedSessionId && l.exercise_name === 'Workout Session Summary');

    return (
      <Modal isOpen={true} onClose={() => setSelectedSessionId(null)} title="Detalles del Entreno">
        <button onClick={() => setSelectedSessionId(null)} className="mb-4 text-sm text-yellow-500 hover:text-yellow-400 flex items-center font-bold">
          <i className="fas fa-arrow-left mr-2"></i> Volver al historial
        </button>
        
        <div className="bg-gray-700/50 p-4 rounded-xl mb-4 border border-gray-600">
           <h3 className="text-xl font-bold text-white mb-1">{summary?.name_workout || 'Entrenamiento'}</h3>
           <p className="text-gray-400 text-sm">{summary?.date} - {summary?.time}</p>
        </div>

        <div className="space-y-4">
          {details.map((ex, i) => (
            <div key={i} className="bg-gray-800 p-4 rounded-xl border-l-4 border-yellow-500 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-white">{ex.exercise_name}</h4>
                {ex.personalRecord && (
                  <span className="bg-yellow-500 text-gray-900 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                    <i className="fas fa-trophy"></i> Récord
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {ex.sets_performed?.map((set: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm border-b border-gray-700/50 last:border-0 pb-1 last:pb-0">
                    <span className="text-gray-400">Serie {set.serie}</span>
                    <span className="font-mono text-yellow-400 font-bold">{set.kg}kg x {set.reps}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Historial">
      <div className="space-y-2">
        {sessions.map((session, idx) => {
           const dateInfo = formatDateSpanish(session.rawDate);
           const firstLog = logs.find(l => l.session_id === (session as any).exercises?.[0]?.session_id || l.raw_date === session.rawDate); 
           const sessionId = firstLog?.session_id;

           return (
            <div 
              key={idx} 
              onClick={() => sessionId && setSelectedSessionId(sessionId)}
              className="bg-gray-800 hover:bg-gray-750 p-4 rounded-xl border-l-4 border-yellow-500 flex items-center justify-between cursor-pointer transition shadow-lg mb-3 relative"
            >
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center justify-center bg-gray-700 rounded-lg p-2 min-w-[3.5rem]">
                  <span className="text-xs text-gray-400 uppercase font-bold">{dateInfo.dayName}</span>
                  <span className="text-xl text-white font-bold">{dateInfo.dayNum}</span>
                </div>
                <div>
                  <h4 className="font-bold text-white text-base leading-tight flex items-center gap-2">
                    {session.name}
                    {session.hasPR && <i className="fas fa-trophy text-yellow-400 text-sm animate-pulse"></i>}
                  </h4>
                  <p className="text-xs text-gray-400 mt-1">{dateInfo.monthName} {dateInfo.year} • {session.time}</p>
                </div>
              </div>
              <div className="text-yellow-500">
                <i className="fas fa-chevron-right"></i>
              </div>
            </div>
           );
        })}
        {sessions.length === 0 && <p className="text-center text-gray-500 mt-8">No hay registros.</p>}
      </div>
    </Modal>
  );
};

export const ExerciseProgressModal: React.FC<HistoryViewProps> = ({ logs, onClose, initialExercise }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<string | null>(initialExercise || null);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<any>(null);

  const uniqueExercises = useMemo(() => {
    const names = new Set(logs.map(l => l.exercise_name).filter(n => n !== 'Workout Session Summary' && n !== 'Extra Activity'));
    return Array.from(names).sort();
  }, [logs]);

  const filteredExercises = uniqueExercises.filter(name => 
    name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (selectedExercise && chartRef.current && window.Chart) {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const history = logs
        .filter(l => l.exercise_name === selectedExercise)
        .sort((a, b) => new Date(a.raw_date).getTime() - new Date(b.raw_date).getTime());

      const dataPoints = history.map(entry => {
        let maxRM = 0;
        entry.sets_performed?.forEach((s: any) => {
           const rm = calculate1RM(parseFloat(s.kg), parseFloat(s.reps));
           if (rm > maxRM) maxRM = rm;
        });
        return { x: entry.date, y: maxRM };
      });

      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        chartInstance.current = new window.Chart(ctx, {
          type: 'line',
          data: {
            labels: dataPoints.map(d => d.x),
            datasets: [{
              label: '1RM Estimado (kg)',
              data: dataPoints.map(d => d.y),
              borderColor: '#facc15',
              backgroundColor: 'rgba(250, 204, 21, 0.1)',
              borderWidth: 2,
              tension: 0.3,
              pointBackgroundColor: '#fff',
              pointRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { 
                mode: 'index', 
                intersect: false,
                backgroundColor: 'rgba(31, 41, 55, 0.9)',
                titleColor: '#facc15'
              }
            },
            scales: {
              y: {
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                ticks: { color: '#9ca3af' }
              },
              x: {
                grid: { display: false },
                ticks: { color: '#9ca3af', maxRotation: 45, minRotation: 45 }
              }
            }
          }
        });
      }
    }
    return () => {
      if (chartInstance.current) chartInstance.current.destroy();
    };
  }, [selectedExercise, logs]);

  if (selectedExercise) {
    return (
      <Modal isOpen={true} onClose={() => setSelectedExercise(null)} title={selectedExercise}>
        <button onClick={() => setSelectedExercise(null)} className="mb-4 text-sm text-yellow-500 hover:text-yellow-400 flex items-center font-bold">
          <i className="fas fa-arrow-left mr-2"></i> Volver a lista
        </button>
        
        <div className="bg-gray-900 rounded-xl p-4 mb-4 h-64 border border-gray-700">
           <canvas ref={chartRef}></canvas>
        </div>

        <div className="space-y-2">
          <h4 className="text-gray-400 uppercase text-xs font-bold tracking-wider mb-2">Registros Recientes</h4>
          {logs
            .filter(l => l.exercise_name === selectedExercise)
            .sort((a, b) => new Date(b.raw_date).getTime() - new Date(a.raw_date).getTime())
            .map((entry, idx) => (
            <div key={idx} className="bg-gray-700/30 p-3 rounded-lg border-l-2 border-gray-600">
              <div className="flex justify-between mb-1">
                <span className="font-bold text-gray-200">{entry.date}</span>
                {entry.personalRecord && (
                  <span className="text-yellow-500 text-xs font-bold"><i className="fas fa-trophy"></i> PR: {entry.personalRecord}kg</span>
                )}
              </div>
              <div className="text-sm text-gray-400">
                {entry.sets_performed?.map((s: any) => `${s.kg}x${s.reps}`).join(', ')}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Progreso">
      <div className="mb-4 relative">
        <i className="fas fa-search absolute left-3 top-3.5 text-gray-500"></i>
        <input 
          type="text" 
          placeholder="Buscar ejercicio..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-gray-700 text-white pl-10 p-3 rounded-xl border border-gray-600 focus:border-yellow-500 outline-none"
        />
      </div>
      <div className="space-y-2">
        {filteredExercises.map(ex => (
          <button 
            key={ex} 
            onClick={() => setSelectedExercise(ex)}
            className="w-full text-left p-4 bg-gray-700 hover:bg-gray-600 rounded-xl transition flex justify-between items-center group"
          >
            <span className="font-medium text-gray-200 group-hover:text-yellow-400 transition-colors">{ex}</span>
            <i className="fas fa-chart-line text-gray-500 group-hover:text-yellow-400"></i>
          </button>
        ))}
      </div>
    </Modal>
  );
};