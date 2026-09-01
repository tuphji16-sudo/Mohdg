import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Checks if running inside native Android / iOS Capacitor container
 */
export const isNative = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Converts a base64 or blob or remote URL into a base64 string
 */
export async function urlToBase64(url: string): Promise<string> {
  if (url.startsWith('data:')) {
    const parts = url.split(',');
    return parts[1] || '';
  }

  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1] || '';
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Native Android file saving into Documents / Downloads via Capacitor Filesystem
 */
export async function saveFileToNativeDevice(
  fileUrl: string,
  filename: string
): Promise<{ uri: string }> {
  try {
    const base64Data = await urlToBase64(fileUrl);
    const result = await Filesystem.writeFile({
      path: `Download/${filename}`,
      data: base64Data,
      directory: Directory.ExternalStorage,
      recursive: true,
    });
    return { uri: result.uri };
  } catch (err) {
    // Fallback to Documents directory if ExternalStorage fails
    console.warn('ExternalStorage write failed, fallback to Documents:', err);
    const base64Data = await urlToBase64(fileUrl);
    const result = await Filesystem.writeFile({
      path: filename,
      data: base64Data,
      directory: Directory.Documents,
      recursive: true,
    });
    return { uri: result.uri };
  }
}

/**
 * Native Android Share Sheet via @capacitor/share
 */
export async function shareNativeContent(options: {
  title?: string;
  text?: string;
  url?: string;
  files?: string[];
  dialogTitle?: string;
}): Promise<boolean> {
  try {
    if (isNative()) {
      await Share.share({
        title: options.title || 'مشاركة المحتوى',
        text: options.text,
        url: options.url,
        files: options.files,
        dialogTitle: options.dialogTitle || 'مشاركة عبر',
      });
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Native share failed or cancelled:', err);
    return false;
  }
}
