import AsyncStorage from '@react-native-async-storage/async-storage';
import { Offer, RequestOrder } from '../types';
import { EMPTY_LOCATION, type GeoLocation } from '../types/location';

const KEYS = {
  requests: 'avc.requests',
  offers: 'avc.offers',
  masterOnline: 'avc.master.online',
  userRegistered: 'avc.user.registered',
  registrationPromptSeen: 'avc.registration.prompt.seen',
  userLocation: 'avc.user.location',
};

const parse = async <T>(key: string, fallback: T): Promise<T> => {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const storageService = {
  getRequests: () => parse<RequestOrder[]>(KEYS.requests, []),
  saveRequests: (requests: RequestOrder[]) => AsyncStorage.setItem(KEYS.requests, JSON.stringify(requests)),

  getOffers: () => parse<Offer[]>(KEYS.offers, []),
  saveOffers: (offers: Offer[]) => AsyncStorage.setItem(KEYS.offers, JSON.stringify(offers)),

  getMasterOnline: async () => (await parse<boolean>(KEYS.masterOnline, false)),
  saveMasterOnline: (online: boolean) => AsyncStorage.setItem(KEYS.masterOnline, JSON.stringify(online)),

  getUserRegistered: async () => (await parse<boolean>(KEYS.userRegistered, false)),
  saveUserRegistered: (registered: boolean) => AsyncStorage.setItem(KEYS.userRegistered, JSON.stringify(registered)),

  getRegistrationPromptSeen: async () => (await parse<boolean>(KEYS.registrationPromptSeen, false)),
  saveRegistrationPromptSeen: (seen: boolean) => AsyncStorage.setItem(KEYS.registrationPromptSeen, JSON.stringify(seen)),

  getUserLocation: () => parse<GeoLocation>(KEYS.userLocation, EMPTY_LOCATION),
  saveUserLocation: (location: GeoLocation) => AsyncStorage.setItem(KEYS.userLocation, JSON.stringify(location)),
};
