/**
 * Video Utilities for Veo 3.1 & AI Video Studios
 * Handles MP4 file downloads, Blob creation, CORS fallbacks, and Web Share API.
 */

export function generateVideoFilename(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `AI_Video_${year}${month}${day}_${hours}${minutes}${seconds}.mp4`;
}

/**
 * Downloads a video file as an actual MP4 file to the user's device (Desktop / Android / iOS).
 * - Converts raw URLs or Google File URIs to Blobs when needed.
 * - Handles CORS by routing through server proxy if necessary.
 * - Ensures correct .mp4 extension and video/mp4 MIME type.
 */
export async function downloadVideoFile(
  videoUrl: string,
  filename?: string
): Promise<void> {
  if (!videoUrl) {
    throw new Error('رابط الفيديو غير متوفر للتنزيل');
  }

  const targetFilename = filename || generateVideoFilename();

  // Case 1: Data URL (Base64)
  if (videoUrl.startsWith('data:')) {
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const finalBlob = new Blob([blob], { type: 'video/mp4' });
      triggerBlobDownload(finalBlob, targetFilename);
      return;
    } catch (e) {
      console.warn('Data URL fetch failed, falling back to direct anchor:', e);
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = targetFilename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => document.body.removeChild(a), 200);
      return;
    }
  }

  // Case 2: Existing Blob URL
  if (videoUrl.startsWith('blob:')) {
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = targetFilename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 200);
    return;
  }

  // Case 3: HTTP/HTTPS URL
  try {
    // Attempt client-side fetch to convert to Blob for seamless background download
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }
    const rawBlob = await response.blob();
    const videoBlob = new Blob([rawBlob], { type: 'video/mp4' });
    triggerBlobDownload(videoBlob, targetFilename);
  } catch (clientErr) {
    console.warn('Client fetch failed (possible CORS/auth), routing through server download proxy:', clientErr);

    // Case 4: Server download proxy
    const proxyDownloadUrl = `/api/video-download?uri=${encodeURIComponent(videoUrl)}&filename=${encodeURIComponent(targetFilename)}`;
    
    // Create an invisible iframe or trigger anchor
    const a = document.createElement('a');
    a.href = proxyDownloadUrl;
    a.download = targetFilename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 300);
  }
}

/**
 * Triggers a download dialog using an in-memory Blob URL
 */
function triggerBlobDownload(blob: Blob, filename: string): void {
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  // Cleanup blob URL after download is dispatched
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  }, 1500);
}

/**
 * Shares video using Web Share API (with file attachments when supported)
 * or falls back to copying link/text.
 */
export async function shareVideo(
  videoUrl: string,
  title: string = 'فيديو مولّد بالذكاء الاصطناعي Veo 3.1',
  prompt: string = ''
): Promise<{ success: boolean; message: string }> {
  const filename = generateVideoFilename();

  // Try Web Share API with file first
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      let shareFile: File | null = null;

      try {
        if (!videoUrl.startsWith('blob:')) {
          const res = await fetch(videoUrl);
          if (res.ok) {
            const blob = await res.blob();
            shareFile = new File([blob], filename, { type: 'video/mp4' });
          }
        }
      } catch (fileErr) {
        console.log('Could not create file for native share, falling back to URL/text:', fileErr);
      }

      if (shareFile && navigator.canShare && navigator.canShare({ files: [shareFile] })) {
        await navigator.share({
          title,
          text: prompt ? `✨ تم إنشاء هذا الفيديو باستخدام Veo 3.1:\n"${prompt}"` : title,
          files: [shareFile],
        });
        return { success: true, message: '✓ تمت مشاركة الفيديو بنجاح' };
      }

      // Share via URL/Text
      const shareUrl = videoUrl.startsWith('data:') || videoUrl.startsWith('blob:') 
        ? window.location.href 
        : videoUrl;

      await navigator.share({
        title,
        text: prompt ? `✨ تم إنشاء هذا الفيديو باستخدام Veo 3.1:\n"${prompt}"` : title,
        url: shareUrl,
      });
      return { success: true, message: '✓ تمت مشاركة الفيديو بنجاح' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, message: 'تم إلغاء المشاركة' };
      }
      console.warn('Navigator share error:', err);
    }
  }

  // Fallback: Copy link or prompt to clipboard
  try {
    const textToCopy = videoUrl.startsWith('http') 
      ? videoUrl 
      : `${title}\n${prompt ? `الوصف: ${prompt}` : ''}\nتم الإنشاء بواسطة تطبيق نبراس (Google Veo 3.1)`;

    await navigator.clipboard.writeText(textToCopy);
    return { success: true, message: '✓ تم نسخ رابط وتفاصيل الفيديو إلى الحافظة' };
  } catch (clipErr) {
    console.error('Clipboard copy error:', clipErr);
    return { success: false, message: 'تعذر نسخ الرابط' };
  }
}
