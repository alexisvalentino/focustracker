'use client';
import { IonApp, setupIonicReact } from '@ionic/react';

import FocusTracker from './FocusTracker';

setupIonicReact({});

const AppShell = () => (
  <IonApp>
    <FocusTracker />
  </IonApp>
);

export default AppShell;
