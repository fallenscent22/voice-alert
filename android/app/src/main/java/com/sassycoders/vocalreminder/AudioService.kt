package com.sassycoders.vocalreminder

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import android.util.Log
import android.content.ContentResolver

class AudioService : Service() {
    private val CHANNEL_ID = "audio_service_channel"
    private val NOTIFICATION_ID = 1
    private var mediaPlayer: MediaPlayer? = null
    private var audioManager: AudioManager? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var audioFocusRequest: AudioFocusRequest? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        setupAudioFocus()
        acquireWakeLock()
        initializeMediaPlayer()
    }

    private fun initializeMediaPlayer() {
        try {
            mediaPlayer = MediaPlayer.create(this, R.raw.alert).apply {
                isLooping = true
                setOnErrorListener { _, _, _ -> false }
                setOnPreparedListener { start() }
                setVolume(1.0f, 1.0f)
            }
        } catch (e: Exception) {
            stopSelf()
        }
    }

    private fun setupAudioFocus() {
        audioManager = getSystemService(AUDIO_SERVICE) as AudioManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            audioFocusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN).run {
                setAudioAttributes(
                    AudioAttributes.Builder().run {
                        setUsage(AudioAttributes.USAGE_ALARM)
                        setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        build()
                    }
                )
                setAcceptsDelayedFocus(false)
                setOnAudioFocusChangeListener { }
                build()
            }
            audioManager?.requestAudioFocus(audioFocusRequest!!)
        } else {
            audioManager?.requestAudioFocus(
                null,
                AudioManager.STREAM_ALARM,
                AudioManager.AUDIOFOCUS_GAIN
            )
        }
    }

    private fun acquireWakeLock() {
        val powerManager = getSystemService(POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "VocalReminder::WakeLock"
        ).apply {
            acquire(10 * 60 * 1000L)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        intent?.let {
        when(it.action) {
            "PLAY_SOUND" -> handlePlaySound(it)
            else -> startDefaultSound()
        }
    } ?: startDefaultSound()
        startForeground(NOTIFICATION_ID, createNotification())
        mediaPlayer?.start()
        return START_STICKY
    }

    override fun onDestroy() {
        releaseResources()
        super.onDestroy()
    }

    private fun releaseResources() {
        mediaPlayer?.run {
            stop()
            release()
        }
        wakeLock?.release()
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            audioFocusRequest?.let { audioManager?.abandonAudioFocusRequest(it) }
        } else {
            audioManager?.abandonAudioFocus(null)
        }
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Reminder Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Active reminder alerts"
                setSound(null, null)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }
    
    private fun startDefaultSound() {
    try {
        mediaPlayer?.release()
        mediaPlayer = MediaPlayer.create(this, R.raw.alert).apply {
            isLooping = true
            start()
        }
    } catch (e: Exception) {
        Log.e("AudioService", "Default sound error: ${e.message}")
        stopSelf()
    }
}
    private fun createNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Voice Alert")
            .setContentText("Playing reminder sound...")
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setSound(null)
            .build()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}