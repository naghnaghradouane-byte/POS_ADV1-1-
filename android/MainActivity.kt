package com.example.app

import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.example.app.security.TrialGuard

/**
 * MainActivity - The main launch screen of the application.
 * Integrated with the TrialGuard hard-lock mechanism in onCreate before loading any UI content.
 */
class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // SECURE INSTANT CHECK: Always call TrialGuard before setting any content views or loading layout binds.
        // If the trial is expired or system state tampering is flagged, checkTrialStatus() triggers 
        // a hard lock, launching ActivationActivity and running activity.finish() immediately.
        TrialGuard.getInstance(this).checkTrialStatus(this) { daysRemaining ->
            // Safe Zone: This block is ONLY invoked if TrialGuard validates device integrity,
            // server-synchronized timestamp alignment, and active license parameters successfully.
            runOnUiThread {
                setContentView(R.layout.activity_main)
                
                // Present transient trial info to end-user as confirmation of clearance
                Toast.makeText(
                    this, 
                    "Trial period verified. $daysRemaining days remaining of active evaluation.", 
                    Toast.LENGTH_LONG
                ).show()

                // Safe to run full application and controller loading from here on
                loadApplicationModules()
            }
        }
    }

    private fun loadApplicationModules() {
        // Safe context: App database, sync configurations, Bluetooth POS printers can load here
    }
}
