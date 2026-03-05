import { supabase } from '@/src/lib/supabase';

export async function getAcceptedMastersForLead(leadId: string) {
  const { data, error } = await supabase
    .from('offers')
    .select('id, lead_id, master_id, status, created_at')
    .eq('lead_id', leadId)
    .eq('status', 'accepted')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function assignMasterToLead(
  leadId: string,
  clientId: string,
  masterId: string,
) {
  const { data, error } = await supabase.rpc('assign_master_to_lead', {
    p_lead_id: leadId,
    p_client_id: clientId,
    p_master_id: masterId,
  });

  if (error) throw error;
  return data;
}
