import { onAuthStateChanged, type User } from '@react-native-firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { auth } from '@/services/firebase';
import { ensureUserProfile } from '@/services/households';

interface AuthState {
  user: User | null;
  initializing: boolean;
}

const AuthContext = createContext<AuthState>({ user: null, initializing: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, initializing: true });

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      if (user?.phoneNumber) {
        // Fire-and-forget: the profile listener in HouseholdProvider picks it up.
        ensureUserProfile(user.uid, user.phoneNumber).catch((e) => console.warn('ensureUserProfile', e));
      }
      setState({ user, initializing: false });
    });
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
