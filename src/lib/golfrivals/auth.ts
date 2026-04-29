import { supabase } from '../supabaseClient';

function normalizeEmail(email?: string | null) {
  return (email || '').trim().toLowerCase();
}

export async function ensureProfileFromInvite() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) throw new Error('No user logged in');

  const email = normalizeEmail(user.email);
  if (!email) throw new Error('User email not found.');

  const { data: invites, error: inviteError } = await supabase
    .from('game_invites')
    .select('*')
    .ilike('email', email)
    .limit(1);

  if (inviteError) {
    throw new Error(`Could not check invitation: ${inviteError.message}`);
  }

  const invite = invites?.[0];
  if (!invite) {
    await supabase.auth.signOut();
    throw new Error(`You are not invited to this match. Logged in as ${email}.`);
  }

  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('*')
    .eq('id', invite.player_id)
    .maybeSingle();

  if (playerError) {
    throw new Error(`Could not load player: ${playerError.message}`);
  }

  if (!player) {
    throw new Error('Player not found for this invite.');
  }

  const profile = {
    id: user.id,
    email,
    display_name: player.name,
    player_id: invite.player_id,
    role: invite.role || 'player',
  };

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(profile, { onConflict: 'id' });

  if (profileError) {
    throw new Error(`Could not create profile: ${profileError.message}`);
  }

  return { ...profile, player, invite };
}
