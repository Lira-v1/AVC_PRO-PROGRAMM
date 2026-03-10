export type GeoLocation = {
  address: string;
  lat: number | null;
  lng: number | null;
};

export const EMPTY_LOCATION: GeoLocation = {
  address: '',
  lat: null,
  lng: null,
};
