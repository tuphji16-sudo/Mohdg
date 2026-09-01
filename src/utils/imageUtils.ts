/**
 * Image Utilities for Nebras AI & Imagen / Gemini image generation
 * Provides download, blob conversion, Android-friendly saving, and sharing.
 */

import { isNative, saveFileToNativeDevice, shareNativeContent } from './nativeUtils';

export function generateImageFilename(extension = 'png'): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `AI_Image_${year}-${month}-${day}_${hours}-${minutes}-${seconds}.${extension}`;
}

/**
 * Downloads an image file to the user's device (Desktop / Android / iOS).
 */
export async function downloadImageFile(
  imageUrl: string,
  filename?: string
): Promise<void> {
  if (!imageUrl) {
    throw new Error('رابط الصورة غير متوفر للتنزيل');
  }

  const targetFilename = filename || generateImageFilename('png');

  // Native Android Capacitor Download
  if (isNative()) {
    try {
      await saveFileToNativeDevice(imageUrl, targetFilename);
      return;
    } catch (nativeErr) {
      console.warn('Native image download failed, falling back to web:', nativeErr);
    }
  }

  // Case 1: Data URL
  if (imageUrl.startsWith('data:')) {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const finalBlob = new Blob([blob], { type: blob.type || 'image/png' });
      triggerBlobDownload(finalBlob, targetFilename);
      return;
    } catch (e) {
      console.warn('Data URL fetch failed, falling back to anchor:', e);
      const a = document.createElement('a');
      a.href = imageUrl;
      a.download = targetFilename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => document.body.removeChild(a), 200);
      return;
    }
  }

  // Case 2: Blob URL
  if (imageUrl.startsWith('blob:')) {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = targetFilename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 200);
    return;
  }

  // Case 3: HTTP/HTTPS URL
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    triggerBlobDownload(blob, targetFilename);
  } catch (err) {
    console.warn('Direct image download failed, using standard anchor fallback:', err);
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = targetFilename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 200);
  }
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  }, 1500);
}

/**
 * Shares an image using Native Android Share Sheet / Web Share API / Clipboard
 */
export async function shareImage(
  imageUrl: string,
  title = 'صورة بالذكاء الاصطناعي',
  prompt = ''
): Promise<{ success: boolean; message: string }> {
  const filename = generateImageFilename('png');

  // 1. Native Android Share
  if (isNative()) {
    try {
      const { uri } = await saveFileToNativeDevice(imageUrl, filename);
      const shared = await shareNativeContent({
        title,
        text: prompt ? `✨ تم إنشاء هذه الصورة بالذكاء الاصطناعي:\n"${prompt}"` : title,
        files: [uri],
        dialogTitle: 'مشاركة الصورة',
      });
      if (shared) {
        return { success: true, message: '✓ تمت مشاركة الصورة بنجاح' };
      }
    } catch (nativeErr) {
      console.warn('Native image share failed:', nativeErr);
    }
  }

  // 2. Web Share API
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      let shareFile: File | null = null;
      try {
        if (imageUrl.startsWith('data:') || imageUrl.startsWith('http')) {
          const res = await fetch(imageUrl);
          if (res.ok) {
            const blob = await res.blob();
            shareFile = new File([blob], filename, { type: blob.type || 'image/png' });
          }
        }
      } catch (fileErr) {
        console.log('Could not create file for native share:', fileErr);
      }

      if (shareFile && navigator.canShare && navigator.canShare({ files: [shareFile] })) {
        await navigator.share({
          title,
          text: prompt ? `✨ تم إنشاء هذه الصورة بالذكاء الاصطناعي:\n"${prompt}"` : title,
          files: [shareFile],
        });
        return { success: true, message: '✓ تمت مشاركة الصورة بنجاح' };
      }

      // Share URL/Text
      await navigator.share({
        title,
        text: prompt ? `✨ تم إنشاء هذه الصورة بالذكاء الاصطناعي:\n"${prompt}"` : title,
        url: imageUrl.startsWith('data:') ? window.location.href : imageUrl,
      });
      return { success: true, message: '✓ تمت مشاركة الصورة بنجاح' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, message: 'تم إلغاء المشاركة' };
      }
      console.warn('Share error:', err);
    }
  }

  // Fallback to clipboard
  try {
    await navigator.clipboard.writeText(
      `${title}\n${prompt ? `الوصف: ${prompt}` : ''}\nتم الإنشاء بواسطة منصة الذكاء الاصطناعي`
    );
    return { success: true, message: '✓ تم نسخ وصف الصورة إلى الحافظة' };
  } catch {
    return { success: false, message: 'تعذر نسخ الوصف' };
  }
}
