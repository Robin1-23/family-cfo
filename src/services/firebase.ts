import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';
import { getStorage } from '@react-native-firebase/storage';

/**
 * Native Firebase instances. Config comes from google-services.json /
 * GoogleService-Info.plist at build time (see README), so no keys live in code.
 */
export const auth = getAuth();
export const db = getFirestore();
export const storage = getStorage();
