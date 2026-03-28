import React, { useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonItem,
  IonList,
  IonSelect,
  IonSelectOption,
  IonDatetime,
  IonModal,
  IonFooter,
} from '@ionic/react';
import { 
  appsOutline, 
  snowOutline, 
  shirtOutline, 
  flameOutline,
  chevronForwardOutline,
  checkmarkCircle,
  calendarOutline,
  timeOutline
} from 'ionicons/icons';
import { BookingStore, ApartmentSize, Duration, calculatePrice } from '../../store/BookingStore';
import { useHistory } from 'react-router-dom';
import classNames from 'classnames';

const BookingFlow: React.FC = () => {
  const history = useHistory();
  const booking = BookingStore.useState();
  const [showSuccess, setShowSuccess] = useState(false);

  const updateBooking = (updates: Partial<typeof booking>) => {
    BookingStore.update(s => {
      Object.assign(s, updates);
    });
  };

  const nextStep = () => {
    if (booking.step < 3) {
      updateBooking({ step: booking.step + 1 });
    }
  };

  const prevStep = () => {
    if (booking.step > 2) {
      updateBooking({ step: booking.step - 1 });
    } else {
      history.push('/home');
    }
  };

  const handleComplete = () => {
    setShowSuccess(true);
    // Add notification to global store
    const Store = require('../../store').default;
    Store.update((s: any) => {
      s.notifications = [
        { id: Date.now(), title: 'Booking Confirmed!', when: 'Just now' },
        ...s.notifications
      ];
    });
  };

  const goToMyBookings = () => {
    setShowSuccess(false);
    updateBooking({ step: 1 }); // Reset for next time
    history.push('/bookings');
  };

  const AddOnCard = ({ icon, name, price }: { icon: string, name: string, price: number }) => {
    const isSelected = booking.addons.includes(name);
    return (
      <div 
        onClick={() => {
          const newAddons = isSelected 
            ? booking.addons.filter(a => a !== name)
            : [...booking.addons, name];
          updateBooking({ addons: newAddons });
        }}
        className={classNames(
          "relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all cursor-pointer",
          isSelected ? "border-blue-500 bg-blue-50" : "border-gray-100 bg-white"
        )}
      >
        <div className={classNames(
          "w-12 h-12 rounded-full flex items-center justify-center mb-2",
          isSelected ? "bg-blue-100 text-blue-500" : "bg-gray-50 text-gray-400"
        )}>
          <IonIcon icon={icon} className="text-2xl" />
        </div>
        <span className="font-semibold text-gray-800">{name}</span>
        <span className="text-blue-500 text-sm font-bold">+${price}</span>
        {isSelected && (
          <IonIcon icon={checkmarkCircle} className="absolute top-2 right-2 text-blue-500 text-xl" />
        )}
      </div>
    );
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={prevStep}>
              <IonBackButton defaultHref="/home" />
            </IonButton>
          </IonButtons>
          <IonTitle className="font-bold">Book a Cleaning</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding bg-white">
        {booking.step === 2 && (
          <div className="space-y-6">
            <section>
              <h3 className="font-bold text-xl mb-3">Apartment Size</h3>
              <div className="flex space-x-2 overflow-x-auto pb-2 no-scrollbar">
                {(['Studio', '1 Bed', '2 Beds', '3+ Beds'] as ApartmentSize[]).map(size => (
                  <button
                    key={size}
                    onClick={() => updateBooking({ apartmentSize: size })}
                    className={classNames(
                      "px-6 py-3 rounded-xl border-2 font-semibold transition-all whitespace-nowrap",
                      booking.apartmentSize === size 
                        ? "border-blue-500 bg-blue-50 text-blue-500" 
                        : "border-gray-100 bg-white text-gray-700"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-xl">Duration</h3>
                <span className="text-blue-500 font-bold">$35/hr</span>
              </div>
              <div className="flex space-x-2 bg-gray-50 p-1 rounded-xl">
                {(['2 Hours', '3 Hours', '4 Hours'] as Duration[]).map(dur => (
                  <button
                    key={dur}
                    onClick={() => updateBooking({ duration: dur })}
                    className={classNames(
                      "flex-1 py-3 rounded-lg font-semibold transition-all",
                      booking.duration === dur 
                        ? "bg-white shadow-sm text-blue-600" 
                        : "text-gray-500"
                    )}
                  >
                    {dur}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3 className="font-bold text-xl mb-3">Date & Time</h3>
              <div className="space-y-3">
                <div className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-gray-400 text-xs block uppercase font-bold">Date</span>
                    <span className="font-semibold">{booking.date}</span>
                  </div>
                  <IonIcon icon={calendarOutline} className="text-blue-500" />
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-gray-400 text-xs block uppercase font-bold">Start Time</span>
                    <span className="font-semibold">{booking.startTime}</span>
                  </div>
                  <IonIcon icon={timeOutline} className="text-blue-500" />
                </div>
              </div>
            </section>

            <section>
              <h3 className="font-bold text-xl mb-3">Popular Add-ons</h3>
              <div className="grid grid-cols-2 gap-4">
                <AddOnCard icon={appsOutline} name="Windows" price={25} />
                <AddOnCard icon={snowOutline} name="Fridge" price={15} />
                <AddOnCard icon={flameOutline} name="Oven" price={20} />
                <AddOnCard icon={shirtOutline} name="Laundry" price={30} />
              </div>
            </section>
          </div>
        )}

        {booking.step === 3 && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <section>
              <h3 className="font-bold text-2xl mb-4">Booking Summary</h3>
              <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Service</span>
                  <span className="font-semibold">Deep Cleaning</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Apartment</span>
                  <span className="font-semibold">{booking.apartmentSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Duration</span>
                  <span className="font-semibold">{booking.duration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date</span>
                  <span className="font-semibold">{booking.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Time</span>
                  <span className="font-semibold">{booking.startTime}</span>
                </div>
                {booking.addons.length > 0 && (
                  <div className="pt-2 border-t border-gray-200">
                    <span className="text-gray-500 block mb-2">Add-ons</span>
                    <div className="flex flex-wrap gap-2">
                      {booking.addons.map(a => (
                        <span key={a} className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section>
              <h3 className="font-bold text-2xl mb-4">Price Breakdown</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-gray-600">
                  <span>Base Rate</span>
                  <span>$105.00</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Add-ons</span>
                  <span>${booking.addons.length * 20}.00</span>
                </div>
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Promo (CLEAN15)</span>
                  <span>-$15.00</span>
                </div>
                <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-xl font-bold">Total</span>
                  <span className="text-3xl font-black text-blue-500">${booking.totalPrice}.00</span>
                </div>
              </div>
            </section>
          </div>
        )}
      </IonContent>

      <IonFooter className="ion-no-border p-4 bg-white">
        <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex flex-col">
                <span className="text-xs text-gray-400 font-bold uppercase">{booking.duration} {booking.apartmentSize} + {booking.addons.length} Add-ons</span>
                <span className="text-2xl font-black text-gray-900">${booking.totalPrice}.00 <span className="text-sm text-gray-300 line-through font-normal">$135.00</span></span>
            </div>
            <div className="text-right">
                <span className="text-green-500 font-bold text-xs block">Promo: CLEAN15</span>
                <span className="text-gray-400 text-xs">Taxes & fees included</span>
            </div>
        </div>
        <button 
          onClick={booking.step === 2 ? nextStep : handleComplete}
          className="w-full bg-blue-500 text-white font-bold py-5 rounded-2xl flex items-center justify-center space-x-2 shadow-lg active:bg-blue-600 transition-colors"
        >
          <span>{booking.step === 2 ? 'Confirm Booking' : 'Checkout'}</span>
          <IonIcon icon={chevronForwardOutline} />
        </button>
      </IonFooter>

      <IonModal isOpen={showSuccess} className="success-modal">
        <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-6">
          <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center">
            <IonIcon icon={checkmarkCircle} className="text-6xl" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900 mb-2">Booking Confirmed!</h2>
            <p className="text-gray-500">Your cleaner is scheduled for {booking.date} at {booking.startTime}.</p>
          </div>
          <button 
            onClick={goToMyBookings}
            className="w-full bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg"
          >
            My Bookings
          </button>
        </div>
      </IonModal>
    </IonPage>
  );
};

export default BookingFlow;
