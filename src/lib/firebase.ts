import { initializeApp, getApps, getApp, deleteApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithRedirect, signInWithPopup, getRedirectResult, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Default fallback configuration provided by the client
const fallbackConfig = {
  apiKey: "AIzaSyCoig0Yz-ypNjU7ieEqc5aZGHXKZctEAWY",
  authDomain: "myshopdata-92a61.firebaseapp.com",
  projectId: "myshopdata-92a61",
  appId: "1:878983949145:web:bf005c8920cf42081a7a48"
};

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
  // Fall back to the real project's auto-generated config if available
  if (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId) {
    return firebaseConfig;
  }
  return fallbackConfig;
}

let activeConfig = fallbackConfig;
try {
  activeConfig = getActiveFirebaseConfig();
} catch (e) {
  console.error('Error loading active Firebase configuration:', e);
}

// Safely initialize App and Services to prevent app-wide crashes
let app;
export let firebaseInitError: string | null = null;

try {
  app = getApps().length === 0 ? initializeApp(activeConfig) : getApp();
} catch (error: any) {
  const errMsg = error?.message || String(error);
  console.error("Failed to initialize Firebase with active config, falling back to default:", error);
  firebaseInitError = errMsg;
  try {
    app = getApps().length === 0 ? initializeApp(fallbackConfig) : getApp();
  } catch (fallbackError) {
    console.error("Failed to initialize Firebase with fallback config:", fallbackError);
  }
}

// Initialize Services with backup options
let dbInstance;
try {
  const customDbId = (activeConfig as any).firestoreDatabaseId;
  dbInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  }, customDbId);
} catch (e) {
  console.error("Failed to initialize Firestore with settings, falling back to getFirestore:", e);
  try {
    const customDbId = (activeConfig as any).firestoreDatabaseId;
    dbInstance = customDbId 
      ? getFirestore(app, customDbId) 
      : getFirestore(app);
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

// Google redirect and popup authorization
export const loginWithGoogle = async () => {
  if (!auth) throw new Error('Auth instance is not initialized.');
  
  // Detect Capacitor or Cordova or native context
  const isNativeApp = typeof window !== 'undefined' && (
    (window as any).Capacitor || 
    (window as any).Cordova || 
    window.location.protocol === 'file:' || 
    (window.location.hostname === 'localhost' && !window.location.port)
  );

  if (isNativeApp) {
    console.log('Native app environment detected. Using signInWithRedirect.');
    try {
      await signInWithRedirect(auth, googleProvider);
      return null;
    } catch (error) {
      console.error('Google Auth Redirect Error:', error);
      throw error;
    }
  } else {
    // Web/Preview environment: Prefer signInWithPopup
    console.log('Web environment detected. Supporting signInWithPopup first.');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (popupError: any) {
      console.warn('signInWithPopup blocked or failed, checking if we can attempt fallback to signInWithRedirect:', popupError);
      
      const isUnauthorizedDomain = 
        popupError?.code === 'auth/unauthorized-domain' || 
        (popupError?.message && popupError?.message.includes('unauthorized-domain'));
        
      if (isUnauthorizedDomain) {
        // If it failed due to an unauthorized domain, let's propagate early so the custom prompt shows
        throw popupError;
      }
      
      console.log('Error was not auth/unauthorized-domain. Attempting graceful fallback to signInWithRedirect...');
      try {
        await signInWithRedirect(auth, googleProvider);
        return null; // signInWithRedirect will trigger a page reload and we'll capture it in getGoogleRedirectResult
      } catch (redirectError) {
        console.error('Unified Google Auth Error (both popup and redirect failed):', redirectError);
        throw redirectError;
      }
    }
  }
};

// Check Google sign-in redirect result on page load
export const getGoogleRedirectResult = async () => {
  try {
    if (!auth) return null;
    const result = await getRedirectResult(auth);
    return result ? result.user : null;
  } catch (error) {
    console.error('Google Auth Redirect Result Error:', error);
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

// Direct connection pre-testing utility to verify a custom Firebase config on paste
export async function testFirebaseConfigDirect(config: any): Promise<{ success: boolean; message: string; details?: string }> {
  const tempAppName = `temp-test-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  let tempApp;
  try {
    tempApp = initializeApp(config, tempAppName);
    const tempDb = initializeFirestore(tempApp, {
      experimentalForceLongPolling: true,
    }, config.firestoreDatabaseId);
    
    // Attempt a live fetch bypasses local cache and hits the server directly
    const docRef = doc(tempDb, 'customers', 'connection_probe_test_id');
    await getDocFromServer(docRef);
    
    return {
      success: true,
      message: 'connection_ok',
    };
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    const errorCode = error?.code || '';
    
    // An error code of 'permission-denied' is actually a successful connect response,
    // because it means Firestore is up, the API key and project ID are correct,
    // and the project exists on Google Cloud! (It is just telling us we aren't signed in)
    if (errorCode === 'permission-denied' || errorMsg.toLowerCase().includes('permission') || errorMsg.toLowerCase().includes('insufficient')) {
      return {
        success: true,
        message: 'connection_ok_auth_required',
        details: errorMsg,
      };
    }
    
    return {
      success: false,
      message: 'connection_failed',
      details: `${errorCode ? `[${errorCode}] ` : ''}${errorMsg}`,
    };
  } finally {
    if (tempApp) {
      try {
        await deleteApp(tempApp);
      } catch (err) {
        console.error('Error deleting temp app:', err);
      }
    }
  }
}

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
