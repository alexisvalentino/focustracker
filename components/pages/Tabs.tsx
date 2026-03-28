import { Redirect, Route, Switch } from 'react-router-dom';
import {
  IonRouterOutlet,
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
} from '@ionic/react';
import { home, calendar, chatbubble, person } from 'ionicons/icons';

import Home from './Feed';
import Bookings from './Lists';
import Support from './Settings'; // Placeholder for Support
import Profile from './Settings'; // Placeholder for Profile
import BookingFlow from './BookingFlow';

const Tabs = () => {
  return (
    <IonTabs>
      <IonRouterOutlet>
        <Switch>
          <Route path="/home" render={() => <Home />} exact={true} />
          <Route path="/bookings" render={() => <Bookings />} exact={true} />
          <Route path="/support" render={() => <Support />} exact={true} />
          <Route path="/profile" render={() => <Profile />} exact={true} />
          <Route path="/booking-flow" render={() => <BookingFlow />} exact={true} />
          <Route path="" render={() => <Redirect to="/home" />} exact={true} />
        </Switch>
      </IonRouterOutlet>
      <IonTabBar slot="bottom">
        <IonTabButton tab="home" href="/home">
          <IonIcon icon={home} />
          <IonLabel>HOME</IonLabel>
        </IonTabButton>
        <IonTabButton tab="bookings" href="/bookings">
          <IonIcon icon={calendar} />
          <IonLabel>BOOKINGS</IonLabel>
        </IonTabButton>
        <IonTabButton tab="support" href="/support">
          <IonIcon icon={chatbubble} />
          <IonLabel>SUPPORT</IonLabel>
        </IonTabButton>
        <IonTabButton tab="profile" href="/profile">
          <IonIcon icon={person} />
          <IonLabel>PROFILE</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  );
};

export default Tabs;
