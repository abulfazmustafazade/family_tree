import { supabase } from './supabase.js';

const rowToPerson = (r) => ({
  id: r.id,
  firstName: r.first_name || '',
  lastName: r.last_name || '',
  maidenName: r.maiden_name || '',
  gender: r.gender || 'male',
  birthDate: r.birth_date || '',
  deathDate: r.death_date || '',
  isAlive: r.is_alive ?? true,
  birthPlace: r.birth_place || '',
  fatherId: r.father_id || null,
  motherId: r.mother_id || null,
  spouseId: r.spouse_id || null,
  notes: r.notes || '',
});

const personToRow = (p) => ({
  id: p.id,
  first_name: p.firstName,
  last_name: p.lastName || null,
  maiden_name: p.maidenName || null,
  gender: p.gender,
  birth_date: p.birthDate || null,
  death_date: p.deathDate || null,
  is_alive: p.isAlive,
  birth_place: p.birthPlace || null,
  father_id: p.fatherId || null,
  mother_id: p.motherId || null,
  spouse_id: p.spouseId || null,
  notes: p.notes || null,
  updated_at: new Date().toISOString(),
});

export const db = {
  async getConfig() {
    const { data, error } = await supabase
      .from('family_config')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async setConfig(adminPassword) {
    const { error } = await supabase
      .from('family_config')
      .upsert({ id: 1, admin_password: adminPassword });
    if (error) throw error;
  },

  async listPeople() {
    const { data, error } = await supabase
      .from('family_people')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(rowToPerson);
  },

  async upsertPerson(p) {
    const { error } = await supabase.from('family_people').upsert(personToRow(p));
    if (error) throw error;
  },

  async updatePersonSpouse(id, spouseId) {
    const { error } = await supabase
      .from('family_people')
      .update({ spouse_id: spouseId, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async deletePerson(id) {
    await supabase.from('family_people').update({ father_id: null }).eq('father_id', id);
    await supabase.from('family_people').update({ mother_id: null }).eq('mother_id', id);
    await supabase.from('family_people').update({ spouse_id: null }).eq('spouse_id', id);
    const { error } = await supabase.from('family_people').delete().eq('id', id);
    if (error) throw error;
  },

  async listPending() {
    const { data, error } = await supabase
      .from('family_pending')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((r) => ({
      id: r.id,
      type: r.type,
      targetId: r.target_id,
      data: r.data,
      submittedBy: r.submitted_by,
      timestamp: r.created_at,
    }));
  },

  async addPending(req) {
    const { error } = await supabase.from('family_pending').insert({
      id: req.id,
      type: req.type,
      target_id: req.targetId,
      data: req.data,
      submitted_by: req.submittedBy,
    });
    if (error) throw error;
  },

  async deletePending(id) {
    const { error } = await supabase.from('family_pending').delete().eq('id', id);
    if (error) throw error;
  },
};
