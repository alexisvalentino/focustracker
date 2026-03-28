import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonMenuButton,
} from '@ionic/react';
import Notifications from './Notifications';
import { useState } from 'react';
import { notificationsOutline, calendarOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';

import { BookingStore } from '../../store/BookingStore';

const Feed = () => {
  const [showNotifications, setShowNotifications] = useState(false);
  const history = useHistory();

  const handleBookNow = () => {
    BookingStore.update(s => {
      s.step = 2;
    });
    history.push('/booking-flow');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>TrustMop</IonTitle>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowNotifications(true)}>
              <IonIcon icon={notificationsOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding" fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">TrustMop</IonTitle>
          </IonToolbar>
        </IonHeader>
        
        <Notifications
          open={showNotifications}
          onDidDismiss={() => setShowNotifications(false)}
        />

        <div className="flex flex-col items-center justify-center h-full">
          <button 
            onClick={handleBookNow}
            className="w-full max-w-xs bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center space-x-3 shadow-lg transition-all active:scale-95"
          >
            <IonIcon icon={calendarOutline} className="text-2xl" />
            <span className="text-lg">Book Now</span>
          </button>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Feed;
