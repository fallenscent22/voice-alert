package com.sassycoders.vocalreminder

import android.content.Intent
import android.net.Uri
import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AudioServiceModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "AndroidService"

    @ReactMethod
    fun startService() {
        val intent = Intent(reactApplicationContext, AudioService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            reactApplicationContext.startForegroundService(intent)
        } else {
            reactApplicationContext.startService(intent)
        }
    }

    @ReactMethod
    fun stopService() {
        val intent = Intent(reactApplicationContext, AudioService::class.java)
        reactApplicationContext.stopService(intent)
    }

    @ReactMethod
    fun playSound(soundUri: String) {
    val validUri = when {
        soundUri.startsWith("content://") -> soundUri
        soundUri.startsWith("file://") -> soundUri
        else -> "file://$soundUri"
    }
    
    val intent = Intent(reactApplicationContext, AudioService::class.java).apply {
        putExtra("SOUND_URI", validUri)
        action = "PLAY_SOUND"
    }
    
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        reactApplicationContext.startForegroundService(intent)
    } else {
        reactApplicationContext.startService(intent)
    }
   }
}