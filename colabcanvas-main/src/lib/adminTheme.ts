// Polar.sh inspired theme for admin dashboard
export const POLAR_THEME = {
  sidebar: {
    bg: 'bg-black',
    width: 'w-60',
    border: 'border-r border-zinc-900',
  },
  content: {
    bg: 'bg-zinc-950',
    padding: 'px-8 py-6',
  },
  card: {
    bg: 'bg-zinc-900',
    border: 'border border-zinc-800',
    radius: 'rounded-2xl',
    padding: 'p-6',
  },
  button: {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300',
  },
  text: {
    title: 'text-zinc-50 font-bold',
    body: 'text-zinc-400',
    muted: 'text-zinc-500',
  },
  active: {
    indicator: 'border-l-2 border-blue-500 bg-zinc-900/50',
  },
};

// Log admin action to database
export async function logAdminAction(
  supabase: any,
  adminId: string,
  actionType: string,
  targetUserId: string | null,
  details: any
) {
  try {
    await supabase.from('admin_actions').insert({
      admin_id: adminId,
      action_type: actionType,
      target_user_id: targetUserId,
      details,
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
}
