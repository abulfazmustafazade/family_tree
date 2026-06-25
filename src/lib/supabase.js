import { createClient } from '@supabase/supabase-js';


const url = 'https://xfjiypgvvfwlzlrpguhl.supabase.co';
const anonKey = 'sb_publishable_aVNo7P6LtlhJFVHHgp2msQ_f1N4oPU8';

export const isConfigured =
  url && anonKey && !url.includes('your-project') && !anonKey.includes('your-anon');

export const supabase = isConfigured ? createClient(url, anonKey) : null;
