export const calculate1RM = (weight: number, reps: number): number => {
  if (reps === 1) return weight;
  if (weight === 0 || reps === 0) return 0;
  // Epley Formula
  return Math.round(weight * (1 + reps / 30));
};

export const getTargetRepsForSet = (repsString: string | number, setNumber: number): string => {
  const str = String(repsString);
  if (!str.includes(',')) return str.trim();
  
  const parts = str.split(',').map(s => s.trim());
  // Use the set index (0-based) or the last available if we exceed
  const index = setNumber - 1;
  if (index < parts.length) return parts[index];
  return parts[parts.length - 1]; // Fallback to last known rep target
};

export const formatDateSpanish = (dateStr: string) => {
  const date = new Date(dateStr);
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return {
    dayName: days[date.getDay()],
    dayNum: date.getDate(),
    monthName: months[date.getMonth()],
    year: date.getFullYear()
  };
};

export const getMaxHistorical1RM = (exerciseName: string, allLogs: any[]): number => {
  let maxRM = 0;
  // Filter logs for this exercise
  const exerciseLogs = allLogs.filter(l => l.exercise_name === exerciseName && l.exercise_name !== 'Workout Session Summary');
  
  exerciseLogs.forEach(log => {
    if (log.sets_performed && Array.isArray(log.sets_performed)) {
      log.sets_performed.forEach((set: any) => {
        const w = parseFloat(set.kg);
        const r = parseFloat(set.reps);
        if (!isNaN(w) && !isNaN(r)) {
          const rm = calculate1RM(w, r);
          if (rm > maxRM) maxRM = rm;
        }
      });
    }
  });
  
  return maxRM;
};

export const parseDurationToSeconds = (durationStr: string | number): number => {
  if (typeof durationStr === 'number') return durationStr;
  const str = String(durationStr).toLowerCase().trim();
  
  // Match "30s", "30 s", "30"
  const secondsMatch = str.match(/^(\d+)\s*s?$/);
  if (secondsMatch) return parseInt(secondsMatch[1], 10);
  
  // Match "1:30" (mm:ss)
  const timeMatch = str.match(/^(\d+):(\d+)$/);
  if (timeMatch) return parseInt(timeMatch[1], 10) * 60 + parseInt(timeMatch[2], 10);

  return 0;
};