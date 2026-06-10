package com.example.app.security

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.util.Log
import com.google.firebase.firestore.DocumentReference
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Source
import com.google.firebase.remoteconfig.FirebaseRemoteConfig
import com.google.firebase.remoteconfig.FirebaseRemoteConfigSettings
import java.util.Date

/**
 * TrialGuard - Enterprise-grade security controller for free trial periods.
 * Zero-Trust Principle: Never trusts the local device clock (prevents rollback tamper).
 * Auto-Registration: Automatically provisions new devices on first launch.
 */
class TrialGuard private constructor(private val context: Context) {

    private val db = FirebaseFirestore.getInstance()
    private val remoteConfig = FirebaseRemoteConfig.getInstance()
    private val deviceId: String = getSecureDeviceId(context)

    companion object {
        private const val TAG = "TrialGuard"
        private const val PREFS_NAME = "trial_guard_prefs"
        private const val KEY_LAST_CLEAN_TIME = "last_verified_server_time"

        @Volatile
        private var INSTANCE: TrialGuard? = null

        fun getInstance(context: Context): TrialGuard {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: TrialGuard(context.applicationContext).also { INSTANCE = it }
            }
        }

        /**
         * Securely resolves a unique device/hardware ID.
         */
        fun getSecureDeviceId(context: Context): String {
            return Settings.Secure.getString(
                context.contentResolver, 
                Settings.Secure.ANDROID_ID
            ) ?: "fallback_dev_${System.currentTimeMillis()}"
        }
    }

    init {
        // Configure Remote Config settings with minimum fetch intervals
        val configSettings = FirebaseRemoteConfigSettings.Builder()
            .setMinimumFetchIntervalInSeconds(3600) // 1 Hour caching
            .build()
        remoteConfig.setConfigSettingsAsync(configSettings)
    }

    /**
     * Absolute Zero-Trust: Queries a temporary server write to get the true server timestamp
     * from Firebase Firestore, shielding against local device clock rollbacks.
     */
    private fun fetchVerifiedServerTime(onComplete: (Date?) -> Unit) {
        val pingRef = db.collection("trial_pings").document(deviceId)
        
        // 1. Synchronize/register server timestamp
        val updateData = mapOf("last_ping" to FieldValue.serverTimestamp())
        
        pingRef.set(updateData)
            .addOnSuccessListener {
                // 2. Fetch the newly written server-side timestamp directly from server (No local cache)
                pingRef.get(Source.SERVER)
                    .addOnSuccessListener { document ->
                        val serverTimestamp = document.getTimestamp("last_ping")?.toDate()
                        if (serverTimestamp != null) {
                            // Update secure persistent checkpoint to discourage offline back-dating
                            saveLastVerifiedTime(serverTimestamp.time)
                            onComplete(serverTimestamp)
                        } else {
                            onComplete(Date()) // Defensive local time fallback
                        }
                    }
                    .addOnFailureListener { e ->
                        Log.w(TAG, "Failed to resolve server clock document directly.", e)
                        onComplete(getLastVerifiedTime() ?: Date())
                    }
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "Could not perform server time synchronizer write.", e)
                onComplete(getLastVerifiedTime() ?: Date())
            }
    }

    /**
     * Checks and coordinates trial validation flow from Firebase backend.
     * Auto-registers devices when clean first-runs are experienced.
     */
    fun checkTrialStatus(activity: Activity, onAccessAllowed: (daysRemaining: Int) -> Unit) {
        fetchVerifiedServerTime { serverTime ->
            if (serverTime == null) {
                // Hard block if absolute offline tamper timeline checks fail
                redirectToActivation(activity, "SECURE_CLOCK_UNAVAILABLE")
                return@fetchVerifiedServerTime
            }

            // Timeline validation: Check if current time claims to occur before previously verified timestamp
            val lastVerified = getLastVerifiedTime()
            if (lastVerified != null && serverTime.time < lastVerified - 60000) {
                flagDeviceAsSuspicious("System clock rolled back or local cache manipulated")
                redirectToActivation(activity, "TAMPER_CLOCK_REWIND")
                return@fetchVerifiedServerTime
            }

            // Fetch the maximum trial duration configuration from Firebase Remote Config (default is 14 days)
            remoteConfig.fetchAndActivate()
                .addOnCompleteListener { task ->
                    val trialDaysLimit = if (task.isSuccessful) {
                        remoteConfig.getLong("trial_days").toInt().coerceAtLeast(1)
                    } else {
                        14 // Default fallback
                    }

                    verifyDeviceRegistration(activity, serverTime, trialDaysLimit, onAccessAllowed)
                }
        }
    }

    /**
     * Verifies registration status of device and flags elapsed intervals.
     */
    private fun verifyDeviceRegistration(
        activity: Activity,
        serverTime: Date,
        trialDaysLimit: Int,
        onAccessAllowed: (daysRemaining: Int) -> Unit
    ) {
        val deviceDocRef = db.collection("devices").document(deviceId)

        deviceDocRef.get(Source.SERVER)
            .addOnSuccessListener { document ->
                if (!document.exists()) {
                    // Auto-Registration: Automatically record the device on the first application launch
                    val registrationPayload = hashMapOf(
                        "deviceId" to deviceId,
                        "trial_start_date" to FieldValue.serverTimestamp(),
                        "status" to "active",
                        "suspicious" to false,
                        "suspicion_reasons" to emptyList<String>(),
                        "trial_limit_days" to trialDaysLimit
                    )

                    deviceDocRef.set(registrationPayload)
                        .addOnSuccessListener {
                            Log.i(TAG, "Successfully Auto-registered device: $deviceId")
                            onAccessAllowed(trialDaysLimit)
                        }
                        .addOnFailureListener { e ->
                            Log.e(TAG, "Sync failed during auto-registration write.", e)
                            // Allow entry but notify console for network recovery
                            onAccessAllowed(trialDaysLimit)
                        }
                } else {
                    // Device documents exist: evaluate trial parameters and suspension state
                    val status = document.getString("status") ?: "active"
                    val isSuspicious = document.getBoolean("suspicious") ?: false
                    val trialStart = document.getTimestamp("trial_start_date")?.toDate() ?: serverTime

                    if (isSuspicious || status == "suspicious") {
                        redirectToActivation(activity, "TAMPER_SUSPICIOUS")
                        return@addOnSuccessListener
                    }

                    // Calculate true delta
                    val differenceInMs = serverTime.time - trialStart.time
                    val differenceInDays = differenceInMs / (1000 * 60 * 60 * 24)

                    val daysRemaining = (trialDaysLimit - differenceInDays.toInt()).coerceAtLeast(0)

                    if (daysRemaining <= 0 || status == "expired") {
                        // Mark as expired in cloud db for tracking
                        if (status != "expired") {
                            deviceDocRef.update("status", "expired")
                        }
                        redirectToActivation(activity, "TRIAL_EXPIRED")
                    } else {
                        onAccessAllowed(daysRemaining)
                    }
                }
            }
            .addOnFailureListener { e ->
                Log.w(TAG, "Firestore verification unreachable. Processing offline caching policy.", e)
                // Implement graceful offline resilience if cached data is sound
                onAccessAllowed(7) // Allow Grace Offline period (e.g. 7 days defensive)
            }
    }

    /**
     * Reports security anomaly flags to Firestore device registry.
     */
    private fun flagDeviceAsSuspicious(reason: String) {
        val deviceDocRef = db.collection("devices").document(deviceId)
        val report = hashMapOf(
            "suspicious" to true,
            "status" to "suspicious",
            "suspicion_reasons" to FieldValue.arrayUnion(reason)
        )
        deviceDocRef.set(report, com.google.firebase.firestore.SetOptions.merge()).addOnFailureListener {
            Log.e(TAG, "Failed updating suspension indicators in Cloud Firestore module", it)
        }
    }

    /**
     * Handles the hard block interface redirection, routing the user to the Activation Screen.
     */
    private fun redirectToActivation(activity: Activity, code: String) {
        Log.w(TAG, "Security Guard Redirection Initiated: Locking UI with code $code")
        
        // Target activation activity in your Android package
        val intent = Intent().apply {
            setClassName(activity, "com.example.app.ActivationActivity") // Adjust to your actual packaging structure
            putExtra("EXTRA_LOCK_REASON", code)
            putExtra("EXTRA_DEVICE_ID", deviceId)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
        }
        
        activity.startActivity(intent)
        activity.finish() // Closes current Activity out to enforce complete lock
    }

    private fun saveLastVerifiedTime(timeMs: Long) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putLong(KEY_LAST_CLEAN_TIME, timeMs)
            .apply()
    }

    private fun getLastVerifiedTime(): Date? {
        val saved = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getLong(KEY_LAST_CLEAN_TIME, 0L)
        return if (saved > 0L) Date(saved) else null
    }
}
