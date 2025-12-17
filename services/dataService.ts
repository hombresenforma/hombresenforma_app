import { supabase } from './supabaseClient';
import { WorkoutData, WorkoutLogEntry } from '../types';

export const getUserIdentifier = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  const usuario = params.get('usuario');
  if (usuario) return usuario;
  
  const user = params.get('user');
  if (user) return user;

  const pathMatch = window.location.pathname.match(/\/app_([^/]+)/);
  if (pathMatch) return pathMatch[1];

  // Return null to indicate no user found in URL, prompting the login screen
  return null; 
};

// Fallback data in case the external file cannot be fetched (e.g. CORS, 404)
const FALLBACK_WORKOUT_DATA: WorkoutData = {
  "demo_fallback": {
    "name": "Entrenamiento Demo",
    "exercises": [
      {
        "order": 1,
        "name": "Sentadillas (Demo)",
        "reps": "12",
        "sets": 3,
        "rest": "60s",
        "notes": "Este es un entrenamiento de ejemplo porque no se pudo cargar tu perfil personalizado."
      },
      {
        "order": 2,
        "name": "Flexiones",
        "reps": "15",
        "sets": 3,
        "rest": "45s"
      },
      {
        "order": 3,
        "name": "Plancha Abdominal",
        "reps": "45s",
        "sets": 3,
        "rest": "30s"
      }
    ]
  }
};

export const fetchWorkoutData = async (userId: string): Promise<WorkoutData> => {
  try {
    // Try to fetch specific user data from GitHub using the provided pattern
    const url = `https://raw.githubusercontent.com/hombresenforma/ivan-data/main/${userId}.js?v=${Date.now()}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn(`Failed to fetch workout data for ${userId} (Status: ${response.status}). Using fallback data.`);
      // We throw here so the UI can show a specific error message if needed, or catch it in App.tsx
      throw new Error(`Usuario '${userId}' no encontrado o sin plan asignado.`);
    }
    
    const text = await response.text();
    
    // Validate that the text looks like the expected JS format
    const match = text.match(/const workoutData = ({[\s\S]*?});/);
    if (!match) {
      console.warn('Invalid data format in fetched file.');
      throw new Error('Formato de datos incorrecto en el servidor.');
    }
    
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const getData = new Function(`return ${match[1]}`);
    return getData() as WorkoutData;
  } catch (error) {
    console.error('Error loading workout data:', error);
    throw error;
  }
};

export const fetchLogs = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('client_id', userId)
      .order('raw_date', { ascending: false });

    if (error) {
      console.error('Error fetching logs:', error);
      return [];
    }
    return data || [];
  } catch (e) {
    console.error('Unexpected error fetching logs:', e);
    return [];
  }
};

export const saveSessionLog = async (userId: string, sessionData: any) => {
  // Save individual exercises
  const individualLogs = sessionData.logs.map((entry: WorkoutLogEntry) => ({
    client_id: userId,
    date: entry.date,
    time: entry.time,
    raw_date: entry.rawDate,
    day_key: entry.dayKey,
    exercise_name: entry.exerciseName,
    sets_performed: entry.setsPerformed,
    completion_state: entry.completionState,
    session_id: sessionData.sessionId
  }));

  if (individualLogs.length > 0) {
    const { error } = await supabase.from('workout_logs').insert(individualLogs);
    if(error) console.error("Error inserting individual logs:", error);
  }

  // Save session summary
  const summaryLog = {
    client_id: userId,
    date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    raw_date: new Date().toISOString(),
    exercise_name: "Workout Session Summary",
    name_workout: sessionData.workoutName,
    sets_performed: JSON.stringify(sessionData.logs),
    completion_state: "completed",
    session_id: sessionData.sessionId,
    total_time_session: sessionData.totalTime,
    total_volume_session: sessionData.totalVolume
  };

  const { error } = await supabase.from('workout_logs').insert([summaryLog]);
  if (error) throw error;
};