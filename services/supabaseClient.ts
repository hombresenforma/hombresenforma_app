import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://izocmtacvdforxywfxgr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6b2NtdGFjdmRmb3J4eXdmeGdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MTQzNDQsImV4cCI6MjA2NDI5MDM0NH0.aPqF71fIUas99K3TY2heedNdj-X2MflrndmYjtCOgNU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
