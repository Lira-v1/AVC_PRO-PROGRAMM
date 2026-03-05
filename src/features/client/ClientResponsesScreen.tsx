import { useEffect, useState } from 'react';
import { assignMasterToLead, getAcceptedMastersForLead } from './clientResponses';

type Props = {
  leadId: string;
  clientId: string;
};

export function ClientResponsesScreen({ leadId, clientId }: Props) {
  const [responses, setResponses] = useState<any[]>([]);

  useEffect(() => {
    getAcceptedMastersForLead(leadId).then(setResponses).catch(console.error);
  }, [leadId]);

  return (
    <div>
      {responses.map(offer => (
        <div key={offer.id}>
          <span>Мастер: {offer.master_id}</span>
          <button onClick={() => assignMasterToLead(leadId, clientId, offer.master_id)}>
            Выбрать мастера
          </button>
        </div>
      ))}
    </div>
  );
}
