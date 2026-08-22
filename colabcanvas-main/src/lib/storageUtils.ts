import { supabase } from '@/integrations/supabase/client';

/**
 * Get a signed URL for a file in the design-assets bucket
 * @param filePath - Path to the file in storage
 * @param expiresIn - Expiry time in seconds (default: 1 hour)
 * @returns Signed URL or null on error
 */
export async function getSignedAssetUrl(
  filePath: string, 
  expiresIn: number = 86400 // FIX 4: Default to 24 hours instead of 1 hour
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('design-assets')
      .createSignedUrl(filePath, expiresIn);

    if (error || !data?.signedUrl) {
      console.error('Failed to generate signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return null;
  }
}

/**
 * Check if a signed URL has expired
 * @param url - Signed URL to check
 * @returns True if expired or invalid
 */
export function isSignedUrlExpired(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const token = urlObj.searchParams.get('token');
    
    if (!token) return false; // Not a signed URL
    
    // Decode JWT token (format: header.payload.signature)
    const parts = token.split('.');
    if (parts.length !== 3) return true; // Invalid JWT
    
    // Decode base64url payload (replace URL-safe chars)
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    
    // Check expiry (exp is in seconds, convert to milliseconds)
    const expiryTime = payload.exp * 1000;
    const isExpired = Date.now() > expiryTime;
    
    console.log('🔍 URL expiry check:', {
      expiryTime: new Date(expiryTime).toISOString(),
      now: new Date().toISOString(),
      isExpired
    });
    
    return isExpired;
  } catch (error) {
    console.error('❌ Failed to parse signed URL:', error);
    return true; // Invalid URL, treat as expired
  }
}

/**
 * Extract the storage file path from a Supabase signed URL
 * @param signedUrl - The signed URL to parse
 * @returns The file path or null if not a Supabase signed URL
 */
export function extractFilePathFromSignedUrl(signedUrl: string): string | null {
  try {
    // Pattern: https://xxx.supabase.co/storage/v1/object/sign/BUCKET/FILE_PATH?token=...
    const urlObj = new URL(signedUrl);
    const pathParts = urlObj.pathname.split('/');
    
    // Find index of 'sign' and extract everything after bucket name
    const signIndex = pathParts.indexOf('sign');
    if (signIndex === -1 || signIndex >= pathParts.length - 2) {
      return null;
    }
    
    // Skip 'sign', then 'bucket-name', then join the rest as file path
    // pathParts: ['', 'storage', 'v1', 'object', 'sign', 'design-assets', 'user-id', 'filename.png']
    const bucketIndex = signIndex + 1;
    const filePath = pathParts.slice(bucketIndex + 1).join('/');
    
    if (!filePath) return null;
    
    // Decode URL-encoded characters
    return decodeURIComponent(filePath);
  } catch (error) {
    console.error('❌ Failed to extract file path from signed URL:', error);
    return null;
  }
}

/**
 * Refresh expired signed URLs
 * @param imageUrl - Current image URL
 * @param filePath - Original file path
 * @returns Refreshed URL or original if not expired
 */
export async function refreshSignedUrlIfNeeded(
  imageUrl: string,
  filePath: string
): Promise<string> {
  if (!isSignedUrlExpired(imageUrl)) {
    return imageUrl; // Still valid
  }

  console.log('🔄 Refreshing expired signed URL for:', filePath);
  const newUrl = await getSignedAssetUrl(filePath);
  return newUrl || imageUrl; // Fallback to old URL if refresh fails
}
