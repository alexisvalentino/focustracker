import { Store as PullStateStore } from 'pullstate';

export type ApartmentSize = 'Studio' | '1 Bed' | '2 Beds' | '3+ Beds';
export type Duration = '2 Hours' | '3 Hours' | '4 Hours';

export type BookingState = {
  step: number;
  apartmentSize: ApartmentSize;
  duration: Duration;
  date: string;
  startTime: string;
  addons: string[];
  totalPrice: number;
  promoApplied: string;
};

export const BookingStore = new PullStateStore<BookingState>({
  step: 1,
  apartmentSize: 'Studio',
  duration: '3 Hours',
  date: 'Thursday, Oct 24', // Default from sample
  startTime: '10:00 AM',
  addons: ['Fridge'], // Default from sample
  totalPrice: 120.00,
  promoApplied: 'CLEAN15',
});

// Helper to calculate price (for demo purposes)
export const calculatePrice = (size: ApartmentSize, duration: Duration, addons: string[]) => {
  let base = 35; // $/hr as per sample
  let hours = parseInt(duration);
  let sizeMult = size === 'Studio' ? 1 : size === '1 Bed' ? 1.2 : 1.5;
  
  let addonPrice = addons.length * 20; // Simplified
  return (base * hours * sizeMult) + addonPrice;
};
