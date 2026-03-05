import { supabase } from '@/src/lib/supabase';

export async function getActiveOffersForMaster(masterId: string) {
  const { data, error } = await supabase
    .from('offers')
    .select('id, lead_id, master_id, status, created_at, leads(title, description, lat, lng)')
    .eq('master_id', masterId)
    .eq('status', 'sent')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function acceptOffer(offerId: string, masterId: string) {
  const { data, error } = await supabase.rpc('accept_offer', {
    p_offer_id: offerId,
    p_master_id: masterId,
  });

  if (error) throw error;
  return data;
}

export function subscribeToMasterOffers(
  masterId: string,
  onOffer: (offer: unknown) => void,
) {
  return supabase
    .channel(`master-offers:${masterId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'offers',
        filter: `master_id=eq.${masterId}`,
      },
      payload => {
        const next = payload.new as { status?: string };
        if (next.status === 'sent') onOffer(payload.new);
      },
    )
    .subscribe();
}
