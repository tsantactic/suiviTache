#!/usr/bin/env node
// Usage: node scripts/create-admin.mjs admin@suivitache.com MonPass123!
// Nécessite SUPABASE_SERVICE_ROLE_KEY (Settings > API > service_role secret)
import ws from 'ws';
global.WebSocket = ws;
import { createClient } from '@supabase/supabase-js';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url) { console.error('NEXT_PUBLIC_SUPABASE_URL manquant'); process.exit(1); }
const email = process.argv[2];
const password = process.argv[3];
if (!email || !password) { console.error('Usage: node scripts/create-admin.mjs <email> <password>'); process.exit(1); }

if (serviceKey) {
  const supabase = createClient(url, serviceKey);
  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role: 'admin' } });
  if (error) { console.error('Erreur createUser:', error.message); process.exit(1); }
  console.log('User créé:', data.user.id, data.user.email);
  const { error: e2 } = await supabase.from('profiles').upsert({ id: data.user.id, email, role: 'admin' });
  if (e2) console.error('Erreur profiles:', e2.message); else console.log('Profil admin OK');
} else {
  console.log('Pas de SERVICE_ROLE_KEY -> fallback signUp anon (nécessitera promotion SQL si trigger non configuré)');
  const supabase = createClient(url, anonKey);
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) { console.error(error.message); process.exit(1); }
  console.log('SignUp OK, id:', data.user?.id, '- Vérifie ton email puis exécute: update profiles set role=\'admin\' where email=\''+email+'\';');
}
