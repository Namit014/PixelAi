/**
 * Generate a DiceBear Notionists avatar URL for a user
 * Uses user ID as seed for consistent, unique avatars
 */
export function getDefaultAvatarUrl(userId: string): string {
  return `https://api.dicebear.com/9.x/notionists/svg?seed=${userId}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

/**
 * Resolve avatar URL - returns custom URL or generates DiceBear avatar
 */
export function resolveAvatarUrl(
  avatarUrl: string | null | undefined,
  userId: string
): string {
  if (avatarUrl && avatarUrl.startsWith('http')) {
    return avatarUrl;
  }
  return getDefaultAvatarUrl(userId);
}
