# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Keep MediaPlayer components
-keep class android.media.MediaPlayer { *; }
-keepclassmembers class android.media.MediaPlayer { *; }
-keep class com.sassycoders.vocalreminder.AudioService { *; }

# Keep notification classes
-keep class android.app.Notification { *; }
-keep class android.app.NotificationChannel { *; }
-keep class android.app.NotificationManager { *; }

# Keep service components
-keep public class * extends android.app.Service
-keepclassmembers class * extends android.app.Service {
    public <init>();
    public void on*();
}
# Add any project specific keep options here:
