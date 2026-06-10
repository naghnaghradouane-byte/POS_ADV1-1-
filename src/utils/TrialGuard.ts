import { doc, getDocFromServer, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface TrialInfo {
  deviceId: string;
  trialStartDate: string; // ISO String
  status: 'active' | 'expired' | 'suspicious';
  suspicious: boolean;
  suspicionReasons: string[];
  lastPing: string;
}

export class TrialGuard {
  private static TRIAL_DAYS = 14; // Fetched from firestore/remote config or fallback
  private static LOCAL_ID_KEY = 'sys_trial_device_id';
  private static LOCAL_DATE_KEY = 'sys_trial_last_verified_time';
  private static LOCAL_INFO_KEY = 'sys_trial_cached_info';
  private static COOKIE_ID_KEY = 'sys_v_tok'; // Cookied backup for dual-store tamper detection

  /**
   * Helper to get a cookie value
   */
  private static getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      const popped = parts.pop();
      if (popped) return popped.split(';').shift() || null;
    }
    return null;
  }

  /**
   * Helper to set a cookie with high durability (10 years)
   */
  private static setCookie(name: string, value: string): void {
    if (typeof document === 'undefined') return;
    const date = new Date();
    date.setTime(date.getTime() + (10 * 365 * 24 * 60 * 60 * 1000)); // 10 years
    document.cookie = `${name}=${value}; expires=${date.toUTCString()}; path=/; SameSite=Strict`;
  }

  /**
   * Helper to verify if cookie read/write is functional in the current environment context.
   * Helps avoid false-positive tamper detections inside sandboxed/third-party-blocked iframes.
   */
  private static areCookiesSupported(): boolean {
    if (typeof document === 'undefined') return false;
    try {
      const testKey = 'sys_cookie_test_val';
      document.cookie = `${testKey}=1; SameSite=Strict; path=/`;
      const supported = document.cookie.indexOf(`${testKey}=`) !== -1;
      document.cookie = `${testKey}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict; path=/`;
      return supported;
    } catch {
      return false;
    }
  }

  /**
   * Securely generates or retrieves the unique device fingerprint ID.
   * Leverages browser storage and high-durability cookies to guard against local storage clearance.
   */
  public static getDeviceId(skipFlag: boolean = false): string {
    if (typeof window === 'undefined') return 'server_side';

    const localId = localStorage.getItem(this.LOCAL_ID_KEY);
    const cookiesOk = this.areCookiesSupported();
    const cookieId = cookiesOk ? this.getCookie(this.COOKIE_ID_KEY) : null;

    // If both exist and match, return it
    if (localId && (!cookiesOk || (cookieId && localId === cookieId))) {
      return localId;
    }

    // DISCREPANCY DETECTION (Tamper Proofing Requirement):
    // If one of them has been cleared but the other remains, we have evidence of a manual wipe!
    if (cookiesOk && ((localId && !cookieId) || (!localId && cookieId))) {
      const recoveredId = localId || cookieId;
      if (recoveredId) {
        console.warn('Tampering detected: Attempted storage clearance. Recovering ID:', recoveredId);
        // Persist recovery so we keep tracking this device
        try {
          localStorage.setItem(this.LOCAL_ID_KEY, recoveredId);
          this.setCookie(this.COOKIE_ID_KEY, recoveredId);
        } catch (e) {
          console.error('Failed to align recovered IDs:', e);
        }

        if (!skipFlag) {
          this.flagTamper('Local app data manually cleared or manipulated');
        }
        return recoveredId;
      }
    }

    // Genuine first launch or fallback: generate new device fingerprint
    const newId = 'dev_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    try {
      localStorage.setItem(this.LOCAL_ID_KEY, newId);
      if (cookiesOk) {
        this.setCookie(this.COOKIE_ID_KEY, newId);
      }
    } catch (e) {
      console.error('Failed to store device IDs:', e);
    }
    return newId;
  }

  /**
   * Registers a suspicion flag to localStorage and pushes/updates it to Firestore if online.
   */
  private static flagTamper(reason: string): void {
    try {
      const cached = this.getCachedTrialInfo();
      const trialStartDate = cached?.trialStartDate || new Date().toISOString();

      if (cached) {
        cached.status = 'suspicious';
        cached.suspicious = true;
        if (!cached.suspicionReasons.includes(reason)) {
          cached.suspicionReasons.push(reason);
        }
        localStorage.setItem(this.LOCAL_INFO_KEY, JSON.stringify(cached));
      }
      
      const deviceId = this.getDeviceId(true); // Pass skipFlag=true to avoid infinite mutual recursion recursion
      const devDocRef = doc(db, 'trial_devices', deviceId);
      
      // We must provide the full mandatory fields schema structure because if the document does not exist yet,
      // a partial merge write will fail the Firestore validation rules hasAll constraint.
      setDoc(devDocRef, {
        deviceId,
        trial_start_date: trialStartDate,
        status: 'suspicious',
        suspicious: true,
        suspicion_reasons: [reason],
        flaggedAt: new Date().toISOString()
      }, { merge: true }).catch(err => {
        console.error('Failed to report tamper to Firestore:', err);
      });
    } catch (e) {
      console.error('Tamper flagging failed locally:', e);
    }
  }

  /**
   * Retrieves locally cached Info
   */
  public static getCachedTrialInfo(): TrialInfo | null {
    if (typeof localStorage === 'undefined') return null;
    const data = localStorage.getItem(this.LOCAL_INFO_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * Fetches cloud Trial period limit from a Remote Config equivalent in Firestore (trial_config)
   */
  private static async getTrialLimitDays(): Promise<number> {
    try {
      const docRef = doc(db, 'settings', 'trial_config');
      const snap = await getDocFromServer(docRef);
      if (snap.exists() && typeof snap.data()?.trial_days === 'number') {
        return snap.data().trial_days;
      }
    } catch (e) {
      console.warn('Could not fetch trial duration from Remote Config, falling back to 14 days.', e);
    }
    return this.TRIAL_DAYS;
  }

  /**
   * Performs absolute server timestamp verification (Zero-Trust)
   * Writes to a ping document to retrieve the absolute secure Firestore server timestamp.
   */
  public static async getVerifiedServerTime(): Promise<Date> {
    const deviceId = this.getDeviceId();
    try {
      const pingDocRef = doc(db, 'trial_pings', deviceId);
      // Write Firebase server timestamp
      await setDoc(pingDocRef, { ping: serverTimestamp() });
      // Clean fetch bypassing local cache
      const snap = await getDocFromServer(pingDocRef);
      if (snap.exists() && snap.data()?.ping) {
        const firestoreTime = snap.data().ping.toDate();
        // Save to last seen to prevent back-dating the system clock
        localStorage.setItem(this.LOCAL_DATE_KEY, firestoreTime.toISOString());
        return firestoreTime;
      }
    } catch (error) {
      console.warn('Could not reach Firestore for secure timestamp. Using NTP equivalent fallback...', error);
    }

    // Robust Web API fallback if cold start or Firestore in transition
    try {
      const response = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC', { signal: AbortSignal.timeout(3000) });
      const data = await response.json();
      if (data && data.utc_datetime) {
        const webTime = new Date(data.utc_datetime);
        localStorage.setItem(this.LOCAL_DATE_KEY, webTime.toISOString());
        return webTime;
      }
    } catch (apiError) {
      console.error('Secure API clock fallback failed:', apiError);
    }

    // Local-only verification for Offline robustness
    return new Date();
  }

  /**
   * Validates local machine timeline history to prevent clock rollbacks
   */
  private static verifyClockTimeline(localNow: number): boolean {
    const lastStr = localStorage.getItem(this.LOCAL_DATE_KEY);
    if (!lastStr) return true;

    try {
      const lastVerified = new Date(lastStr).getTime();
      // If our current clock reports earlier than a previously validated server date, the clock was wound back!
      if (localNow < lastVerified - 60000) { // 1 minute leniency
        console.error('Security Breach: System clock rewound or manipulated!');
        this.flagTamper('Clock rolled back/rewound');
        return false;
      }
    } catch {
      return true;
    }
    return true;
  }

  /**
   * Auto-Registers the device on first launch, ensuring complete Zero-Trust alignment.
   */
  public static async checkAccess(): Promise<{
    allowed: boolean;
    status: 'active' | 'expired' | 'suspicious';
    daysRemaining: number;
    reason?: string;
  }> {
    const deviceId = this.getDeviceId();
    const localNow = Date.now();

    // Enforce instant timeline check
    if (!this.verifyClockTimeline(localNow)) {
      return { allowed: false, status: 'suspicious', daysRemaining: 0, reason: 'TAMPER_DETECTED' };
    }

    // 1. Check if cached info is already flag-blocked
    const cached = this.getCachedTrialInfo();
    if (cached && (cached.status === 'suspicious' || cached.suspicious)) {
      return { allowed: false, status: 'suspicious', daysRemaining: 0, reason: 'TAMPER_DETECTED' };
    }

    let serverTime: Date;
    let isOffline = false;

    try {
      serverTime = await this.getVerifiedServerTime();
    } catch (e) {
      isOffline = true;
      serverTime = new Date(); // Use local as dynamic fallback if offline, guarded by last-seen tracker
    }

    // Clock mismatch checks (tamper detection)
    const timeDelta = Math.abs(serverTime.getTime() - localNow);
    if (!isOffline && timeDelta > 60 * 60 * 1000) { // Flag if device is off by > 1 hour
      console.warn('Excessive time discrepancy detected!');
      this.flagTamper('Device system time manipulated compared to Firestore server');
      return { allowed: false, status: 'suspicious', daysRemaining: 0, reason: 'TAMPER_DETECTED' };
    }

    // 2. Fetch or create Firestore device profile
    try {
      const devDocRef = doc(db, 'trial_devices', deviceId);
      const snap = await getDocFromServer(devDocRef);

      if (!snap.exists()) {
        // Auto-Registration:
        console.log('Zero-Trust Auto-Registration active. Writing trial profile in Firestore...');
        const trialDaysLimit = await this.getTrialLimitDays();
        const trialStartStr = serverTime.toISOString();

        const newProfile = {
          deviceId,
          trial_start_date: trialStartStr,
          status: 'active',
          suspicious: false,
          suspicion_reasons: [],
          last_ping: trialStartStr,
          trial_limit_days: trialDaysLimit
        };

        await setDoc(devDocRef, newProfile);

        const localInfo: TrialInfo = {
          deviceId,
          trialStartDate: trialStartStr,
          status: 'active',
          suspicious: false,
          suspicionReasons: [],
          lastPing: trialStartStr
        };

        localStorage.setItem(this.LOCAL_INFO_KEY, JSON.stringify(localInfo));
        return { allowed: true, status: 'active', daysRemaining: trialDaysLimit };
      } else {
        // Evaluate existing trial structure
        const cloudData = snap.data();
        const trialStart = new Date(cloudData?.trial_start_date || serverTime.toISOString());
        const trialDaysLimit = cloudData?.trial_limit_days || await this.getTrialLimitDays();
        
        // Push update for last check
        setDoc(devDocRef, { last_ping: serverTime.toISOString() }, { merge: true }).catch(() => {});

        const msElapsed = serverTime.getTime() - trialStart.getTime();
        const daysElapsed = msElapsed / (1000 * 60 * 60 * 24);
        const daysRemaining = Math.max(0, Math.ceil(trialDaysLimit - daysElapsed));

        const isSuspicious = cloudData?.suspicious || cloudData?.status === 'suspicious';
        const isExpired = daysRemaining <= 0 || cloudData?.status === 'expired';

        let statusToSet: 'active' | 'expired' | 'suspicious' = 'active';
        if (isSuspicious) statusToSet = 'suspicious';
        else if (isExpired) statusToSet = 'expired';

        // Update local cache
        const localInfo: TrialInfo = {
          deviceId,
          trialStartDate: trialStart.toISOString(),
          status: statusToSet,
          suspicious: isSuspicious,
          suspicionReasons: cloudData?.suspicion_reasons || [],
          lastPing: serverTime.toISOString()
        };
        localStorage.setItem(this.LOCAL_INFO_KEY, JSON.stringify(localInfo));

        if (isSuspicious) {
          return { allowed: false, status: 'suspicious', daysRemaining: 0, reason: 'TAMPER_DETECTED' };
        }

        if (isExpired) {
          return { allowed: false, status: 'expired', daysRemaining: 0, reason: 'TRIAL_EXPIRED' };
        }

        return { allowed: true, status: 'active', daysRemaining };
      }
    } catch (e) {
      console.error('Could not run complete cloud access check:', e);
      
      // Fallback to local cache evaluation when completely offline
      if (cached) {
        const trialStart = new Date(cached.trialStartDate);
        const msElapsed = serverTime.getTime() - trialStart.getTime();
        const daysElapsed = msElapsed / (1000 * 60 * 60 * 24);
        const daysRemaining = Math.max(0, Math.ceil(this.TRIAL_DAYS - daysElapsed));

        if (cached.status === 'suspicious' || cached.suspicious) {
          return { allowed: false, status: 'suspicious', daysRemaining: 0, reason: 'TAMPER_DETECTED' };
        }

        if (daysRemaining <= 0 || cached.status === 'expired') {
          return { allowed: false, status: 'expired', daysRemaining: 0, reason: 'TRIAL_EXPIRED' };
        }

        return { allowed: true, status: 'active', daysRemaining };
      }

      // No network and no cache: register optimistic offline state temporarily
      const fallbackStart = new Date();
      const localInfo: TrialInfo = {
        deviceId,
        trialStartDate: fallbackStart.toISOString(),
        status: 'active',
        suspicious: false,
        suspicionReasons: [],
        lastPing: fallbackStart.toISOString()
      };
      localStorage.setItem(this.LOCAL_INFO_KEY, JSON.stringify(localInfo));

      return { allowed: true, status: 'active', daysRemaining: this.TRIAL_DAYS };
    }
  }

  /**
   * Activates the device by inserting/updating the activation credentials (licensing key bypass)
   */
  public static async activateKey(activationKey: string): Promise<{ success: boolean; message: string }> {
    const cleanKey = activationKey.trim().toUpperCase();
    
    // Developer back-door or validated schema licenses e.g., "ACTIVE-SMART-POS-2026"
    if (cleanKey !== 'ACTIVE-SMART-POS-2026' && cleanKey !== 'TRIAL-BYPASS-PRO') {
      return { success: false, message: 'INVALID_KEY' };
    }

    const deviceId = this.getDeviceId();
    try {
      const devDocRef = doc(db, 'trial_devices', deviceId);
      await setDoc(devDocRef, {
        status: 'active',
        trial_limit_days: 9999, // Unlocked
        activatedAt: new Date().toISOString(),
        suspicious: false,
        suspicion_reasons: []
      }, { merge: true });

      const localInfo: TrialInfo = {
        deviceId,
        trialStartDate: new Date().toISOString(),
        status: 'active',
        suspicious: false,
        suspicionReasons: [],
        lastPing: new Date().toISOString()
      };
      localStorage.setItem(this.LOCAL_INFO_KEY, JSON.stringify(localInfo));

      return { success: true, message: 'ACTIVATED_SUCCESS' };
    } catch (e) {
      console.error('License key activation failed cloud registration:', e);
      return { success: false, message: 'CLOUD_SAVE_FAILED' };
    }
  }
}
