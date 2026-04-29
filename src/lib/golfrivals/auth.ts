import { supabase } from '../supabaseClient';

export async function ensureProfileFromInvite() {
  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('No user logged in');

  // Look for invite
  const { data: invite, error: inviteError } = await supabase
    .from('game_invites')
    .select('*')
    .eq('email', user.email)
    .single();
  if (inviteError || !invite) {
    await supabase.auth.signOut();
    throw new Error('You are not invited to this match.');
  }

  // Get player info
  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('*')
    .eq('id', invite.player_id)
    .single();
  if (playerError || !player) throw new Error('Player not found.');

  // Upsert profile
  const profile = {
    id: user.id,
    email: user.email,
    display_name: player.name,
    player_id: invite.player_id,
    role: invite.role,
  };
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert([profile], { onConflict: ['id'] });
  if (profileError) throw new Error('Could not create profile.');

  return { ...profile, player };
}
