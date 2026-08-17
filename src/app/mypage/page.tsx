import React from 'react';
import { createClient } from '@/infrastructure/auth/server';
import { getAuthDestination } from '@/features/auth/server/getAuthDestination';
import { redirect } from 'next/navigation';
import { MyPageView } from './MyPageView';

export default async function MyPage() {
  const destination = await getAuthDestination();
  
  if (destination === '/welcome' || destination === '/onboarding/schedules') {
    redirect(destination);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/welcome'); // Fallback
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (profileError) {
    if (profileError.code === 'PGRST116') {
      return (
        <div style={{ backgroundColor: '#FCFCFC', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
            プロフィールデータが見つかりません。<br/>
            （データ不整合）
          </div>
        </div>
      );
    }
    return (
      <div style={{ backgroundColor: '#FCFCFC', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
          データの取得に失敗しました。
        </div>
      </div>
    );
  }

  const { data: fixedPlans, error: plansError } = await supabase
    .from('fixed_plans')
    .select('*')
    .eq('user_id', user.id)
    .neq('plan_status', 'deleted');

  if (plansError) {
    return (
      <div style={{ backgroundColor: '#FCFCFC', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
          データの取得に失敗しました。
        </div>
      </div>
    );
  }

  // Fetch real connections (only 'active' rows from public.connections)
  const { data: connectionsAsA } = await supabase
    .from('connections')
    .select('connection_id, user_b_id, connected_at')
    .eq('user_a_id', user.id)
    .eq('connection_status', 'active')
    .order('connected_at', { ascending: true });

  const { data: connectionsAsB } = await supabase
    .from('connections')
    .select('connection_id, user_a_id, connected_at')
    .eq('user_b_id', user.id)
    .eq('connection_status', 'active')
    .order('connected_at', { ascending: true });

  const connectedUserIds = [
    ...(connectionsAsA || []).map((c) => c.user_b_id),
    ...(connectionsAsB || []).map((c) => c.user_a_id),
  ];

  const connectionCount = connectedUserIds.length;

  // Resolve connected user profiles (RLS allows reading active profiles)
  let connectedProfiles: { user_id: string; nickname: string; avatar_url: string }[] = [];
  if (connectedUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, nickname, avatar_url')
      .in('user_id', connectedUserIds)
      .eq('profile_status', 'active');
    const profilesByUserId = new Map(
      (profiles || []).map((connectedProfile) => [connectedProfile.user_id, connectedProfile]),
    );
    connectedProfiles = connectedUserIds.flatMap((connectedUserId) => {
      const connectedProfile = profilesByUserId.get(connectedUserId);
      return connectedProfile ? [connectedProfile] : [];
    });
  }

  const { count: attendedEventCount, error: attendedEventError } = await supabase
    .from('event_participations')
    .select('participation_id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('participation_status', 'attended');

  if (attendedEventError) {
    console.error('Failed to load attended event count:', attendedEventError);
  }

  return (
    <MyPageView
      profile={profile}
      fixedPlans={fixedPlans || []}
      attendedEventCount={attendedEventCount || 0}
      connectionCount={connectionCount}
      connectedProfiles={connectedProfiles}
    />
  );
}
