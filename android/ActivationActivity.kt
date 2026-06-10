package com.example.app

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.example.app.security.TrialGuard
import com.google.firebase.firestore.FirebaseFirestore
import java.util.Date

/**
 * ActivationActivity - Standard UI target for locked out trial devices.
 * Shows specific reasons (Tamper, Expiry, Sync error), unique hardware fingerprints,
 * and processes license keys to restore standard access instantly.
 */
class ActivationActivity : AppCompatActivity() {

    private val db = FirebaseFirestore.getInstance()
    private lateinit var txtDeviceFingerprint: TextView
    private lateinit var txtLockReason: TextView
    private lateinit var edtActivationKey: EditText
    private lateinit var btnSubmitKey: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_activation)

        txtDeviceFingerprint = findViewById(R.id.txt_device_fingerprint)
        txtLockReason = findViewById(R.id.txt_lock_reason)
        edtActivationKey = findViewById(R.id.edt_activation_key)
        btnSubmitKey = findViewById(R.id.btn_submit_key)

        // Extract credentials passed in by the TrialGuard Redirection system
        val deviceId = intent.getStringExtra("EXTRA_DEVICE_ID") ?: TrialGuard.getSecureDeviceId(this)
        val lockReasonCode = intent.getStringExtra("EXTRA_LOCK_REASON") ?: "UNKNOWN_LOCK"

        txtDeviceFingerprint.text = deviceId

        // Display user-friendly localized messages regarding lock status
        txtLockReason.text = when (lockReasonCode) {
            "TAMPER_CLOCK_REWIND" -> "System timeline rollback detected. Device has been locked to prevent license manipulation."
            "TAMPER_SUSPICIOUS" -> "Local file modifications or manual database wipe detected. This registry access has been flagged."
            "TRIAL_EXPIRED" -> "Your 14-day evaluation period is completed. Activate license to access business inventory and records."
            else -> "A security validation mismatch locked this terminal. Please provide a license key."
        }

        btnSubmitKey.setOnClickListener {
            val key = edtActivationKey.text.toString().trim()
            if (key.isNotEmpty()) {
                activateLicenseOnCloud(deviceId, key)
            } else {
                Toast.makeText(this, "Please write a valid activation key", Toast.LENGTH_SHORT).show()
            }
        }
    }

    /**
     * Attempts to register the valid license key into Firestore and restore device permissions.
     */
    private fun activateLicenseOnCloud(deviceId: String, key: String) {
        val uppercaseKey = key.uppercase()
        
        // Developer quick-key verification
        if (uppercaseKey != "ACTIVE-SMART-POS-2026" && uppercaseKey != "TRIAL-BYPASS-PRO") {
            Toast.makeText(this, "The license key provided is invalid.", Toast.LENGTH_LONG).show()
            return
        }

        btnSubmitKey.isEnabled = false
        val devDocRef = db.collection("devices").document(deviceId)

        val activationPayload = hashMapOf(
            "status" to "active",
            "trial_limit_days" to 9999, // Extended unlocked license period
            "activatedAt" to Date().toString(),
            "suspicious" to false,
            "suspicion_reasons" to emptyList<String>()
        )

        devDocRef.update(activationPayload as Map<String, Any>)
            .addOnSuccessListener {
                Toast.makeText(this, "System License Activated Successfully!", Toast.LENGTH_LONG).show()
                
                // Relaunch original system view cleanly
                val intent = Intent(this, MainActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
                }
                startActivity(intent)
                finish()
            }
            .addOnFailureListener { e ->
                btnSubmitKey.isEnabled = true
                Toast.makeText(this, "Sync-update failed: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
            }
    }
}
