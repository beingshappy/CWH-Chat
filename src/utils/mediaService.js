import { storage } from '../firebase/firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { uploadImage as uploadToImgBB } from './imageUpload';

/**
 * Unified media service.
 * Automatically routes images to ImgBB (free) and other files to Firebase Storage.
 */
export const uploadMedia = async (file) => {
  if (!file) return null;

  // 1. If it's an image, use ImgBB (Free/Unlimited)
  if (file.type.startsWith('image/')) {
    try {
      console.log('[MediaService] Uploading image to ImgBB...');
      return await uploadToImgBB(file);
    } catch (error) {
      console.warn('[MediaService] ImgBB upload failed, falling back to Firebase...', error);
      // Fallback to Firebase if ImgBB fails for some reason
    }
  }

  // 2. For non-images (PDF, Docs, ZIP, etc.) use Cloudinary (Professional/Stable Free Tier)
  // CLOUDINARY CONFIGURATION
  const CLOUD_NAME = "dtlgbbzba"; 
  const UPLOAD_PRESET = "v8q4hwxa"; 

  try {
    console.log('[MediaService] Uploading to Cloudinary...');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    // CRITICAL: For raw files, Cloudinary needs the extension in the public_id to preserve it in the URL
    const fileNameWithExt = file.name;
    const cleanId = `${Date.now()}_${fileNameWithExt.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    formData.append('public_id', cleanId);

    // For non-images, determine Cloudinary resource type
    const isAudio = file.type.startsWith('audio/');
    const resourceType = isAudio ? 'video' : 'raw';
    
    console.log(`[MediaService] Uploading to Cloudinary (${resourceType})...`);
    
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    
    if (result.secure_url) {
      return result.secure_url;
    } else {
      console.error('[MediaService] Cloudinary Error Details:', result);
      throw new Error(result.error?.message || 'Cloudinary upload failed');
    }
  } catch (error) {
    console.error('[MediaService] Cloudinary Upload Error:', error);
    throw new Error('File upload failed. Please ensure your Cloudinary Name and Preset are correct.');
  }
};
