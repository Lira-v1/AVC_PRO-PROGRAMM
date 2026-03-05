import { sendPush } from '../push/sendPush';

interface OfferInsert {
  lead_id: string;
  master_id: string;
}

interface SupabaseLike {
  from: (table: string) => {
    insert: (values: OfferInsert[]) => Promise<{ error: Error | null }>;
    select: (columns: string) => {
      in: (column: string, values: string[]) => Promise<{ data: { expo_push_token: string | null }[] | null; error: Error | null }>;
    };
  };
}

interface CreateOffersParams {
  supabase: SupabaseLike;
  leadId: string;
  policyCode: string;
  addressText: string;
  masterIds: string[];
}

/**
 * Создает offers для мастеров и отправляет push-уведомления по Expo token.
 */
export async function createOffers({
  supabase,
  leadId,
  policyCode,
  addressText,
  masterIds,
}: CreateOffersParams): Promise<void> {
  if (!masterIds.length) {
    return;
  }

  const offers: OfferInsert[] = masterIds.map((masterId) => ({
    lead_id: leadId,
    master_id: masterId,
  }));

  const { error: insertError } = await supabase.from('offers').insert(offers);
  if (insertError) {
    throw insertError;
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('expo_push_token')
    .in('id', masterIds);

  if (profilesError) {
    throw profilesError;
  }

  const pushTokens = (profiles ?? [])
    .map((profile) => profile.expo_push_token)
    .filter((token): token is string => Boolean(token));

  await sendPush({
    pushTokens,
    data: {
      lead_id: leadId,
      policy_code: policyCode,
      address_text: addressText,
    },
  });
}
