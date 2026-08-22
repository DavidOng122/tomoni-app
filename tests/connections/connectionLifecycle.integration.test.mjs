import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';

const execFile = promisify(execFileCallback);
const integrationEnabled = process.env.RUN_SUPABASE_CONNECTION_LIFECYCLE_INTEGRATION === '1';

function localConfiguration() {
  const urlValue = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.ok(urlValue, 'A local SUPABASE_URL is required.');
  assert.ok(anonKey, 'A local SUPABASE_ANON_KEY is required.');
  assert.ok(serviceRoleKey, 'A local SUPABASE_SERVICE_ROLE_KEY is required.');
  const url = new URL(urlValue);
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname), 'Refusing non-local Supabase URL.');
  return { url: url.toString(), anonKey, serviceRoleKey };
}

function client(url, key) {
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function signTestJwt(userId, email) {
  const secret = process.env.SUPABASE_JWT_SECRET;
  assert.ok(secret, 'A local SUPABASE_JWT_SECRET is required.');
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    aud: 'authenticated',
    role: 'authenticated',
    email,
    exp: Math.floor(Date.now() / 1000) + 3600 * 24,
  })).toString('base64url');

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

function authenticatedClient(config, userId, email) {
  const jwt = signTestJwt(userId, email);
  return createClient(config.url, config.anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function localSql(sql) {
  const container = process.env.SUPABASE_DB_CONTAINER ?? 'supabase_db_tomoni-app';
  const { stdout } = await execFile('docker', [
    'exec', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1', '-c', sql,
  ]);
  return stdout.trim();
}

async function createTestUser(config, service, label) {
  const userId = crypto.randomUUID();
  const email = `conn-lifecycle-${label}-${userId.slice(0, 8)}@yorimi.local`;
  const password = 'LocalConnLifecycle!2026';

  await localSql(`
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous)
    values ('00000000-0000-0000-0000-000000000000'::uuid, '${userId}'::uuid, 'authenticated', 'authenticated', '${email}', extensions.crypt('${password}', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"sub":"${userId}"}'::jsonb, now(), now(), false, false);
    update public.users set account_status = 'active', onboarding_status = 'completed' where id = '${userId}'::uuid;
    insert into public.profiles (user_id, nickname, age_range, gender, avatar_url, tags, profile_status)
    values ('${userId}'::uuid, 'Conn ${label}', '25-34', 'prefer_not_to_say', '', array['散歩', 'カフェ']::text[], 'active');
  `);

  const authenticated = authenticatedClient(config, userId, email);
  return { authenticated, userId, email, password };
}

function createPlanDraft({ planId, userId, activityType = 'walking', days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], start = '08:00', lat = 35.6601, lng = 139.8654, placeName = '行船公園' }) {
  return {
    fixed_plan_id: planId,
    user_id: userId,
    activity_type: activityType,
    days_of_week: days,
    start_time: start,
    latitude: lat,
    longitude: lng,
    place_name: placeName,
    plan_status: 'active',
  };
}

test('Yorimi Connection / Tsunagari Lifecycle Integration Test', {
  skip: !integrationEnabled,
}, async (t) => {
  const config = localConfiguration();
  const service = client(config.url, config.serviceRoleKey);

  const userA = await createTestUser(config, service, 'userA');
  const userB = await createTestUser(config, service, 'userB');
  const testUserIds = [userA.userId, userB.userId];
  const testEventIds = [];

  t.after(async () => {
    const testUserIdList = testUserIds.map((userId) => `'${userId}'::uuid`).join(', ');
    const testEventIdList = testEventIds.map((eventId) => `'${eventId}'::uuid`).join(', ');
    const eventPredicate = testEventIds.length > 0
      ? `event_id in (${testEventIdList}) or`
      : '';

    await localSql(`
      delete from public.conversations
      where ${eventPredicate}
        related_invitation_id in (
          select invitation_id
          from public.invitations
          where sender_user_id in (${testUserIdList})
             or receiver_user_id in (${testUserIdList})
        )
        or exists (
          select 1
          from public.conversation_members member
          where member.conversation_id = conversations.conversation_id
            and member.user_id in (${testUserIdList})
        );

      delete from public.invitations
      where sender_user_id in (${testUserIdList})
         or receiver_user_id in (${testUserIdList});

      ${testEventIds.length > 0 ? `delete from public.events where event_id in (${testEventIdList});` : ''}

      delete from auth.users
      where id in (${testUserIdList});
    `);
  });

  const userA_id = userA.userId;
  const userB_id = userB.userId;

  const canonicalUserA = userA_id < userB_id ? userA_id : userB_id;
  const canonicalUserB = userA_id < userB_id ? userB_id : userA_id;

  const planA1_id = crypto.randomUUID();
  const planB1_id = crypto.randomUUID();

  assert.ifError((await service.from('fixed_plans').insert(createPlanDraft({ planId: planA1_id, userId: userA_id }))).error);
  assert.ifError((await service.from('fixed_plans').insert(createPlanDraft({ planId: planB1_id, userId: userB_id }))).error);

  let invitation1_id;
  let originalConnectedAt;
  let originalSourceInvitationId;

  await t.test('1. Accept Fixed Plan invite -> connection created (status = active)', async () => {
    const inviteRes = await userA.authenticated.rpc('create_fixed_schedule_invitation', {
      p_fixed_plan_id: planA1_id,
      p_receiver_fixed_plan_id: planB1_id,
      p_receiver_id: userB_id,
    });
    assert.ifError(inviteRes.error);
    invitation1_id = inviteRes.data.invitation_id;

    const acceptRes = await userB.authenticated.rpc('accept_fixed_schedule_invitation', {
      p_invitation_id: invitation1_id,
    });
    assert.ifError(acceptRes.error);
    assert.ok(acceptRes.data.conversation_id);

    const { data: connections, error: connErr } = await service
      .from('connections')
      .select('*')
      .eq('user_a_id', canonicalUserA)
      .eq('user_b_id', canonicalUserB);

    assert.ifError(connErr);
    assert.equal(connections.length, 1);
    assert.equal(connections[0].connection_status, 'active');
    originalConnectedAt = connections[0].connected_at;
    originalSourceInvitationId = connections[0].source_invitation_id;
    assert.ok(originalConnectedAt, 'connected_at must be populated');
    assert.equal(originalSourceInvitationId, invitation1_id);
  });

  await t.test('2. Accept Event invite -> connection created (status = active)', async () => {
    const userC = await createTestUser(config, service, 'userC');
    const userD = await createTestUser(config, service, 'userD');
    testUserIds.push(userC.userId, userD.userId);

    const eventId = crypto.randomUUID();
    testEventIds.push(eventId);
    assert.ifError((await service.from('events').insert({
      event_id: eventId,
      event_type: 'official',
      title: 'テストイベント',
      place_name: '篠崎公園',
      start_at: new Date(Date.now() + 86400000).toISOString(),
      end_at: new Date(Date.now() + 172800000).toISOString(),
      event_status: 'scheduled',
    })).error);

    const todayDate = new Date().toISOString().slice(0, 10);
    assert.ifError((await service.from('event_participations').insert({
      event_id: eventId,
      user_id: userC.userId,
      participation_status: 'going',
      participation_date: todayDate,
      arrival_time: '10:00:00',
    })).error);

    assert.ifError((await service.from('event_participations').insert({
      event_id: eventId,
      user_id: userD.userId,
      participation_status: 'going',
      participation_date: todayDate,
      arrival_time: '10:15:00',
    })).error);

    const eventInvId = crypto.randomUUID();
    assert.ifError((await service.from('invitations').insert({
      invitation_id: eventInvId,
      sender_user_id: userC.userId,
      receiver_user_id: userD.userId,
      invitation_type: 'event',
      event_id: eventId,
      invitation_status: 'pending',
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    })).error);

    const acceptRes = await userD.authenticated.rpc('accept_event_invitation', {
      p_invitation_id: eventInvId,
    });
    assert.ifError(acceptRes.error);

    const canonicalC = userC.userId < userD.userId ? userC.userId : userD.userId;
    const canonicalD = userC.userId < userD.userId ? userD.userId : userC.userId;

    const { data: conn } = await service
      .from('connections')
      .select('*')
      .eq('user_a_id', canonicalC)
      .eq('user_b_id', canonicalD);

    assert.equal(conn.length, 1);
    assert.equal(conn[0].connection_status, 'active');
  });

  let invitation2_id;
  const planA2_id = crypto.randomUUID();
  const planB2_id = crypto.randomUUID();

  await t.test('3. Accept another invitation between same users -> no duplicate connection', async () => {
    assert.ifError((await service.from('fixed_plans').insert(createPlanDraft({ planId: planA2_id, userId: userA_id, activityType: 'dog_walking', placeName: '喜多公園' }))).error);
    assert.ifError((await service.from('fixed_plans').insert(createPlanDraft({ planId: planB2_id, userId: userB_id, activityType: 'dog_walking', placeName: '喜多公園' }))).error);

    const inviteRes2 = await userA.authenticated.rpc('create_fixed_schedule_invitation', {
      p_fixed_plan_id: planA2_id,
      p_receiver_fixed_plan_id: planB2_id,
      p_receiver_id: userB_id,
    });
    assert.ifError(inviteRes2.error);
    invitation2_id = inviteRes2.data.invitation_id;

    const acceptRes2 = await userB.authenticated.rpc('accept_fixed_schedule_invitation', {
      p_invitation_id: invitation2_id,
    });
    assert.ifError(acceptRes2.error);

    const { data: connections } = await service
      .from('connections')
      .select('*')
      .eq('user_a_id', canonicalUserA)
      .eq('user_b_id', canonicalUserB);

    assert.equal(connections.length, 1, 'Connection row count must remain exactly 1 for canonical user pair');
    assert.equal(connections[0].connection_status, 'active');
    assert.equal(
      connections[0].source_invitation_id,
      originalSourceInvitationId,
      'Accepting another relationship while active must not rewrite provenance.',
    );
  });

  await t.test('4. Cancel 1 of 2 active companion relationships -> connection remains active', async () => {
    const cancelRes = await userB.authenticated.rpc('cancel_fixed_schedule_invitation', {
      p_invitation_id: invitation1_id,
    });
    assert.ifError(cancelRes.error);

    const { data: connections } = await service
      .from('connections')
      .select('*')
      .eq('user_a_id', canonicalUserA)
      .eq('user_b_id', canonicalUserB);

    assert.equal(connections.length, 1);
    assert.equal(connections[0].connection_status, 'active', 'Connection must remain active because invitation #2 is still accepted');
  });

  await t.test('5. Cancel final active companion relationship -> connection removed', async () => {
    const cancelRes = await userB.authenticated.rpc('cancel_fixed_schedule_invitation', {
      p_invitation_id: invitation2_id,
    });
    assert.ifError(cancelRes.error);

    const { data: connections } = await service
      .from('connections')
      .select('*')
      .eq('user_a_id', canonicalUserA)
      .eq('user_b_id', canonicalUserB);

    assert.equal(connections.length, 1);
    assert.equal(connections[0].connection_status, 'removed', 'Connection must become removed after cancelling all active accepted invitations');
  });

  let invitation3_id;

  await t.test('6. Removed connection reactivated -> preserves original connected_at timestamp', async () => {
    const planA3_id = crypto.randomUUID();
    const planB3_id = crypto.randomUUID();

    assert.ifError((await service.from('fixed_plans').insert(createPlanDraft({ planId: planA3_id, userId: userA_id, activityType: 'sports', start: '18:00' }))).error);
    assert.ifError((await service.from('fixed_plans').insert(createPlanDraft({ planId: planB3_id, userId: userB_id, activityType: 'sports', start: '18:00' }))).error);

    const inviteRes3 = await userA.authenticated.rpc('create_fixed_schedule_invitation', {
      p_fixed_plan_id: planA3_id,
      p_receiver_fixed_plan_id: planB3_id,
      p_receiver_id: userB_id,
    });
    assert.ifError(inviteRes3.error);
    invitation3_id = inviteRes3.data.invitation_id;

    const acceptRes3 = await userB.authenticated.rpc('accept_fixed_schedule_invitation', {
      p_invitation_id: invitation3_id,
    });
    assert.ifError(acceptRes3.error);

    const { data: connections } = await service
      .from('connections')
      .select('*')
      .eq('user_a_id', canonicalUserA)
      .eq('user_b_id', canonicalUserB);

    assert.equal(connections.length, 1);
    assert.equal(connections[0].connection_status, 'active', 'Removed connection must be reactivated to active state');
    assert.equal(
      new Date(connections[0].connected_at).toISOString(),
      new Date(originalConnectedAt).toISOString(),
      'Reactivating connection MUST NOT overwrite the original connected_at timestamp'
    );
    assert.equal(
      connections[0].source_invitation_id,
      invitation3_id,
      'A removed connection must record the invitation that reactivated it.',
    );
  });

  await t.test('7. Active connection does not prevent matching via another eligible Plan Pair', async () => {
    const planA4_id = crypto.randomUUID();
    const planB4_id = crypto.randomUUID();

    assert.ifError((await service.from('fixed_plans').insert(createPlanDraft({ planId: planA4_id, userId: userA_id, activityType: 'walking', start: '08:00', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] }))).error);
    assert.ifError((await service.from('fixed_plans').insert(createPlanDraft({ planId: planB4_id, userId: userB_id, activityType: 'walking', start: '08:00', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] }))).error);

    const recRes = await userA.authenticated.rpc('get_discover_recommendations', {
      p_my_plan_id: planA4_id,
    });
    assert.ifError(recRes.error);
    assert.ok(recRes.data);

    const foundB = recRes.data?.some((c) => c.candidateId === userB_id);
    assert.ok(foundB, 'User B must still be recommended as a candidate despite an active connection');
  });

  await t.test('8. Repeated accept call is idempotent or safely handled', async () => {
    const acceptRepeat = await userB.authenticated.rpc('accept_fixed_schedule_invitation', {
      p_invitation_id: invitation3_id,
    });
    assert.ifError(acceptRepeat.error);
    assert.ok(acceptRepeat.data.conversation_id);
  });

  await t.test('9. Two users cannot produce duplicate canonical connection rows', async () => {
    const directInsertInverted = await service.from('connections').insert({
      user_a_id: canonicalUserB,
      user_b_id: canonicalUserA,
      connection_status: 'active',
    });
    assert.ok(directInsertInverted.error, 'Direct inverted insert (user_a > user_b) must be rejected by check constraint');
  });

  await t.test('10. Archiving Fixed Plan preserves accepted invitations and active connections', async () => {
    const planA5_id = crypto.randomUUID();
    const planB5_id = crypto.randomUUID();

    assert.ifError((await service.from('fixed_plans').insert(createPlanDraft({ planId: planA5_id, userId: userA_id, activityType: 'study_reading' }))).error);
    assert.ifError((await service.from('fixed_plans').insert(createPlanDraft({ planId: planB5_id, userId: userB_id, activityType: 'study_reading' }))).error);

    const inviteRes = await userA.authenticated.rpc('create_fixed_schedule_invitation', {
      p_fixed_plan_id: planA5_id,
      p_receiver_fixed_plan_id: planB5_id,
      p_receiver_id: userB_id,
    });
    assert.ifError(inviteRes.error);
    const acceptedInvId = inviteRes.data.invitation_id;

    assert.ifError((await userB.authenticated.rpc('accept_fixed_schedule_invitation', {
      p_invitation_id: acceptedInvId,
    })).error);

    // Now archive planA5
    const archiveRes = await userA.authenticated.rpc('archive_fixed_plan', {
      p_fixed_plan_id: planA5_id,
    });
    assert.ifError(archiveRes.error);

    // Verify invitation status remains accepted
    const { data: inv } = await service
      .from('invitations')
      .select('*')
      .eq('invitation_id', acceptedInvId)
      .single();

    assert.equal(inv.invitation_status, 'accepted', 'Accepted invitation MUST NOT be cancelled by archiving a fixed plan');

    // Verify connection remains active
    const { data: conn } = await service
      .from('connections')
      .select('*')
      .eq('user_a_id', canonicalUserA)
      .eq('user_b_id', canonicalUserB);

    assert.equal(conn[0].connection_status, 'active', 'Connection MUST remain active after archiving fixed plan');
  });
});
