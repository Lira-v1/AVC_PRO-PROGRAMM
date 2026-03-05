import { supabase } from '@/src/lib/supabase';

export type LeadItemInput = {
  service_id?: string;
  service_name: string;
  qty?: number;
  price?: number;
};

export type CreateLeadInput = {
  clientId: string;
  title?: string;
  description?: string;
  lat: number;
  lng: number;
  items: LeadItemInput[];
};

export async function createLeadAndDispatch(input: CreateLeadInput) {
  const { data, error } = await supabase.rpc('create_lead_and_dispatch', {
    p_client_id: input.clientId,
    p_title: input.title ?? null,
    p_description: input.description ?? null,
    p_lat: input.lat,
    p_lng: input.lng,
    p_items: input.items,
    p_radius_km: 5,
    p_max_masters: 10,
  });

  if (error) throw error;
  return data as string;
}
