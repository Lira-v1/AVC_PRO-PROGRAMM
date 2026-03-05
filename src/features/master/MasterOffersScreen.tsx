import { useEffect, useState } from 'react';
import {
  acceptOffer,
  getActiveOffersForMaster,
  subscribeToMasterOffers,
} from './masterOffers';

type Props = { masterId: string };

export function MasterOffersScreen({ masterId }: Props) {
  const [offers, setOffers] = useState<any[]>([]);

  useEffect(() => {
    getActiveOffersForMaster(masterId).then(setOffers).catch(console.error);

    const channel = subscribeToMasterOffers(masterId, offer => {
      setOffers(prev => [offer, ...prev]);
    });

    return () => {
      channel.unsubscribe();
    };
  }, [masterId]);

  return (
    <div>
      {offers.map(offer => (
        <div key={offer.id}>
          <strong>{offer.leads?.title ?? 'Новая заявка'}</strong>
          <button onClick={() => acceptOffer(offer.id, masterId)}>Откликнуться</button>
        </div>
      ))}
    </div>
  );
}
