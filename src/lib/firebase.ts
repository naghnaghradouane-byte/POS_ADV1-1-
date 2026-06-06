import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Helper to check if a custom firebase config is configured
export function getActiveFirebaseConfig() {
  try {
    const saved = localStorage.getItem('CUSTOM_FIREBASE_CONFIG');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading custom Firebase config from localStorage:', e);
  }
  return firebaseConfig;
}

let activeConfig = firebaseConfig;
try {
  activeConfig = getActiveFirebaseConfig();
} catch (e) {
  console.error('Error loading active Firebase configuration:', e);
}

// Safely initialize App and Services to prevent app-wide crashes
let app;
try {
  app = getApps().length === 0 ? initializeApp(activeConfig) : getApp();
} catch (error) {
  console.error("Failed to initialize Firebase with active config, falling back to default:", error);
  try {
    localStorage.removeItem('CUSTOM_FIREBASE_CONFIG'); // remove broken config
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  } catch (fallbackError) {
    console.error("Failed to initialize Firebase with fallback config:", fallbackError);
  }
}

// Initialize Services with backup options
let dbInstance;
try {
  dbInstance = activeConfig.firestoreDatabaseId 
    ? getFirestore(app, activeConfig.firestoreDatabaseId) 
    : getFirestore(app);
} catch (e) {
  console.error("Failed to initialize Firestore database:", e);
  try {
    dbInstance = getFirestore(app);
  } catch (err) {
    console.error("Critical Firestore failure:", err);
  }
}

let authInstance;
try {
  authInstance = getAuth(app);
} catch (e) {
  console.error("Failed to initialize Auth instance:", e);
}

export const db = dbInstance;
export const auth = authInstance;
export const googleProvider = new GoogleAuthProvider();

// Google popup authorization
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google Auth Error:', error);
    throw error;
  }
};

// Email & Password login wrapper for mobile/APK compatibility
export const loginWithEmail = async (email: string, pass: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error) {
    console.error('Email Sign-in Error:', error);
    throw error;
  }
};

// Email & Password register wrapper for mobile/APK compatibility
export const registerWithEmail = async (email: string, pass: string, name: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    if (result.user) {
      await updateProfile(result.user, { displayName: name });
    }
    return result.user;
  } catch (error) {
    console.error('Email Registration Error:', error);
    throw error;
  }
};

export const logoutUser = async () => {
  await signOut(auth);
};

// --- Standard Firestore Error Handling Wrapper ---
// Mandatory Error-Handling Object and Types from Phase 3 of firebase-integration guidelines

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
