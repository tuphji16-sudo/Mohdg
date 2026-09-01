import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aiplatform.ai',
  appName: 'منصة الذكاء الاصطناعي',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
    backgroundColor: '#0A0D14',
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0A0D14',
      androidSplashResourceName: 'splash',
      showSpinner: true,
      spinnerColor: '#3B82F6',
    },
    StatusBar: {
      backgroundColor: '#0A0D14',
      style: 'DARK',
    },
  },
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
};

export default config;
