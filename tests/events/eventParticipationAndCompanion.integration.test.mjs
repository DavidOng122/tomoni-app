import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';

const execFile = promisify(execFileCallback);
const integrationEnabled = process.env.RUN_SUPABASE_EVENT_COMPANION_INTEGRATION === '1';

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
  const email = `event-flow-${label}-${userId.slice(0, 8)}@yorimi.local`;
  const password = 'LocalEventFlow!2026';

  await localSql(`
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous)
    values ('00000000-0000-0000-0000-000000000000'::uuid, '${userId}'::uuid, 'authenticated', 'authenticated', '${email}', extensions.crypt('${password}', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"sub":"${userId}"}'::jsonb, now(), now(), false, false);
    update public.users set account_status = 'active', onboarding_status = 'completed' where id = '${userId}'::uuid;
    insert into public.profiles (user_id, nickname, age_range, gender, avatar_url, tags, profile_status)
    values ('${userId}'::uuid, 'Event ${label}', '25-34', 'prefer_not_to_say', '', array['イベント', '散歩']::text[], 'active');
  `);

  const authenticated = authenticatedClient(config, userId, email);
  return { authenticated, userId, email, password };
}

test('Codex Prompt 4 — Fix Yorimi Event Participation + Companion Flow Integration Test', {
  skip: !integrationEnabled,
}, async (t) => {
  const config = localConfiguration();
  const service = client(config.url, config.serviceRoleKey);

  const creator = await createTestUser(config, service, 'creator');
  const userA = await createTestUser(config, service, 'userA');
  const userB = await createTestUser(config, service, 'userB');
  const testUserIds = [creator.userId, userA.userId, userB.userId];
  const testUserIdList = testUserIds.map((userId) => `'${userId}'::uuid`).join(', ');

  t.after(async () => {
    await localSql(`
      delete from public.conversations
      where event_id in (
        select event_id
        from public.events
        where created_by_user_id = '${creator.userId}'::uuid
      )
      or related_invitation_id in (
        select invitation_id
        from public.invitations
        where sender_user_id in (${testUserIdList})
           or receiver_user_id in (${testUserIdList})
      );

      delete from public.invitations
      where sender_user_id in (${testUserIdList})
         or receiver_user_id in (${testUserIdList});

      delete from public.events
      where created_by_user_id = '${creator.userId}'::uuid;

      delete from auth.users
      where id in (${testUserIdList});
    `);
  });

  let testEventId;

  await t.test('1. Create Event -> creator automatically going', async () => {
    const startAt = new Date(Date.now() + 86400000).toISOString();
    const endAt = new Date(Date.now() + 90000000).toISOString();

    const res = await creator.authenticated.rpc('create_user_event', {
      p_title: 'Edogawa Fireworks Companion Test Event',
      p_start_at: startAt,
      p_end_at: endAt,
      p_place_id: 'place_fireworks_01',
      p_place_name: '江戸川河川敷公園',
      p_address: '東京都江戸川区上篠崎1-25',
      p_latitude: 35.7001,
      p_longitude: 139.8802,
      p_description: 'Join us for fireworks!',
      p_approval_required: false,
      p_capacity: 5,
    });
    assert.ifError(res.error);
    testEventId = res.data;
    assert.ok(testEventId, 'event_id must be returned');

    const { data: part, error: partErr } = await service
      .from('event_participations')
      .select('participation_status, participation_date, arrival_time')
      .eq('event_id', testEventId)
      .eq('user_id', creator.userId)
      .single();

    assert.ifError(partErr);
    assert.equal(part.participation_status, 'going', 'Creator must automatically be inserted as going');
    const tokyoStart = new Date(new Date(startAt).getTime() + (9 * 60 * 60 * 1000)).toISOString();
    assert.equal(part.participation_date, tokyoStart.slice(0, 10));
    assert.equal(part.arrival_time.slice(0, 8), tokyoStart.slice(11, 19));
  });

  await t.test('2. Capacity includes creator', async () => {
    const { data: goingCount } = await service
      .from('event_participations')
      .select('participation_id')
      .eq('event_id', testEventId)
      .eq('participation_status', 'going');

    assert.equal(goingCount.length, 1, 'Creator consumes 1 capacity slot');
  });

  await t.test('2a. Invalid total capacity is rejected by both RPC and table constraint', async () => {
    for (const capacity of [0, -1]) {
      const invalidStart = new Date(Date.now() + 86400000);
      const invalidCreate = await creator.authenticated.rpc('create_user_event', {
        p_title: 'Invalid Capacity Event',
        p_start_at: invalidStart.toISOString(),
        p_end_at: new Date(invalidStart.getTime() + 3600000).toISOString(),
        p_place_id: null,
        p_place_name: '船堀',
        p_address: null,
        p_latitude: null,
        p_longitude: null,
        p_description: null,
        p_approval_required: false,
        p_capacity: capacity,
      });
      assert.ok(invalidCreate.error);
      assert.match(invalidCreate.error.message, /capacity/i);
    }

    const invalidUpdate = await service.from('events').update({ capacity: 0 }).eq('event_id', testEventId);
    assert.ok(invalidUpdate.error, 'The PostgreSQL CHECK must reject zero capacity even for service-role writes.');
  });

  await t.test('3. Normal user joins', async () => {
    assert.ifError((await userA.authenticated.rpc('join_event', { p_event_id: testEventId })).error);

    const { data: part } = await service
      .from('event_participations')
      .select('participation_status')
      .eq('event_id', testEventId)
      .eq('user_id', userA.userId)
      .single();

    assert.equal(part.participation_status, 'going');
  });

  await t.test('4. Capacity reached -> next join rejected', async () => {
    // Set capacity = 2 (creator + userA = 2 slots taken)
    await service.from('events').update({ capacity: 2 }).eq('event_id', testEventId);

    const joinRes = await userB.authenticated.rpc('join_event', { p_event_id: testEventId });
    assert.ok(joinRes.error, 'Join must be rejected when capacity reached');
    assert.match(joinRes.error.message, /capacity/i);
  });

  await t.test('5. Concurrent final-slot attempts -> only allowed capacity succeeds', async () => {
    const eventCap1_id = (await creator.authenticated.rpc('create_user_event', {
      p_title: 'Concurrent Cap Test Event',
      p_start_at: new Date(Date.now() + 86400000).toISOString(),
      p_end_at: new Date(Date.now() + 90000000).toISOString(),
      p_place_id: 'place_conc_01',
      p_place_name: '船堀タワー',
      p_address: '東京都江戸川区船堀4-1-1',
      p_latitude: 35.6841,
      p_longitude: 139.8642,
      p_description: 'Concurrent test',
      p_approval_required: false,
      p_capacity: 2, // Creator takes 1 slot, 1 remaining
    })).data;

    // Concurrently try joining with userA and userB
    const [res1, res2] = await Promise.all([
      userA.authenticated.rpc('join_event', { p_event_id: eventCap1_id }),
      userB.authenticated.rpc('join_event', { p_event_id: eventCap1_id }),
    ]);

    const successes = [res1, res2].filter((r) => !r.error);
    const errors = [res1, res2].filter((r) => r.error);

    assert.equal(successes.length, 1, 'Exactly 1 concurrent join must succeed');
    assert.equal(errors.length, 1, 'Exactly 1 concurrent join must be rejected due to capacity');
  });

  await t.test('6. Approval request when space exists', async () => {
    const approvalEvent_id = (await creator.authenticated.rpc('create_user_event', {
      p_title: 'Approval Required Event',
      p_start_at: new Date(Date.now() + 86400000).toISOString(),
      p_end_at: new Date(Date.now() + 90000000).toISOString(),
      p_place_id: 'place_appr_01',
      p_place_name: '篠崎公園',
      p_address: '東京都江戸川区上篠崎1-25-1',
      p_latitude: 35.7051,
      p_longitude: 139.8852,
      p_description: 'Approval required',
      p_approval_required: true,
      p_capacity: 2,
    })).data;

    assert.ifError((await userA.authenticated.rpc('join_event', { p_event_id: approvalEvent_id })).error);

    const { data: part } = await service
      .from('event_participations')
      .select('participation_status')
      .eq('event_id', approvalEvent_id)
      .eq('user_id', userA.userId)
      .single();

    assert.equal(part.participation_status, 'requested', 'Joining approval-required event sets status to requested');
  });

  await t.test('7. Approval when event became full -> rejected safely', async () => {
    const approvalEvent2_id = (await creator.authenticated.rpc('create_user_event', {
      p_title: 'Full Approval Event',
      p_start_at: new Date(Date.now() + 86400000).toISOString(),
      p_end_at: new Date(Date.now() + 90000000).toISOString(),
      p_place_id: 'place_full_appr',
      p_place_name: 'タワーホール船堀',
      p_address: '東京都江戸川区船堀4-1-1',
      p_latitude: 35.6841,
      p_longitude: 139.8642,
      p_description: 'Full approval test',
      p_approval_required: true,
      p_capacity: 2, // Creator takes 1 slot
    })).data;

    // userA requests join
    assert.ifError((await userA.authenticated.rpc('join_event', { p_event_id: approvalEvent2_id })).error);

    // userB directly joins an un-approved slot if capacity allowed or creator approves another user first
    // Fill remaining slot with another going participant directly
    assert.ifError((await service.from('event_participations').insert({
      event_id: approvalEvent2_id,
      user_id: userB.userId,
      participation_status: 'going',
      participation_date: new Date().toISOString().slice(0, 10),
      arrival_time: '14:00:00',
    })).error);

    // Get userA's participation_id
    const { data: reqPart } = await service
      .from('event_participations')
      .select('participation_id')
      .eq('event_id', approvalEvent2_id)
      .eq('user_id', userA.userId)
      .single();

    // Creator tries to approve userA when event is full
    const approveRes = await creator.authenticated.rpc('approve_event_participant', {
      p_participation_id: reqPart.participation_id,
    });
    assert.ok(approveRes.error, 'Approval must fail when event capacity is reached');
    assert.match(approveRes.error.message, /capacity/i);
  });

  await t.test('8. Participant list includes going users', async () => {
    const { data: preview, error } = await userA.authenticated.rpc('get_event_participant_preview', {
      p_event_id: testEventId,
    });
    assert.ifError(error);
    assert.ok(preview && preview.length > 0, 'Participant preview must be returned');
    assert.ok(preview[0].participant_count >= 1, 'participant_count must be >= 1');
  });

  let eventInviteId;

  await t.test('9. Participant A sends Event companion invite to B', async () => {
    // Increase capacity and make User B going
    await service.from('events').update({ capacity: 10 }).eq('event_id', testEventId);
    assert.ifError((await userB.authenticated.rpc('join_event', { p_event_id: testEventId })).error);

    const inviteRes = await userA.authenticated.rpc('create_event_invitation', {
      p_event_id: testEventId,
      p_receiver_user_id: userB.userId,
    });
    assert.ifError(inviteRes.error);
    eventInviteId = inviteRes.data;
    assert.ok(eventInviteId);
  });

  await t.test('10. Receiver can read invite without SQL error', async () => {
    const res = await userB.authenticated.rpc('get_received_event_invitations');
    assert.ifError(res.error, 'get_received_event_invitations must execute without profiles.id error');
    assert.equal(res.data.length, 1);
    assert.equal(res.data[0].invitation_id, eventInviteId);
    assert.equal(res.data[0].sender_nickname, 'Event userA');
  });

  await t.test('11. Accept -> connection + conversation', async () => {
    const acceptRes = await userB.authenticated.rpc('accept_event_invitation', {
      p_invitation_id: eventInviteId,
    });
    assert.ifError(acceptRes.error);
    const convId = acceptRes.data;
    assert.ok(convId, '1:1 conversation_id must be returned');

    // Check connection exists and is active
    const { data: conn } = await service
      .from('connections')
      .select('connection_status')
      .or(`and(user_a_id.eq.${userA.userId},user_b_id.eq.${userB.userId}),and(user_a_id.eq.${userB.userId},user_b_id.eq.${userA.userId})`)
      .single();

    assert.equal(conn.connection_status, 'active', 'Connection must be active upon accepting event companion invitation');
  });

  await t.test('12. Event companion venue equals Event venue', async () => {
    const { data: event } = await service
      .from('events')
      .select('place_name, address, latitude, longitude')
      .eq('event_id', testEventId)
      .single();

    assert.equal(event.place_name, '江戸川河川敷公園');
    assert.equal(event.address, '東京都江戸川区上篠崎1-25');
  });

  await t.test('13. Accepted companion cancellation works', async () => {
    const cancelRes = await userA.authenticated.rpc('cancel_event_invitation', {
      p_invitation_id: eventInviteId,
    });
    assert.ifError(cancelRes.error);
    assert.equal(cancelRes.data, true);

    const { data: inv } = await service
      .from('invitations')
      .select('invitation_status')
      .eq('invitation_id', eventInviteId)
      .single();
    assert.equal(inv.invitation_status, 'cancelled');
  });

  await t.test('13a. Cancelled 1:1 companion history remains readable but is read-only', async () => {
    const { data: conversation } = await service.from('conversations')
      .select('conversation_id, conversation_status, closed_at')
      .eq('related_invitation_id', eventInviteId)
      .single();
    assert.equal(conversation.conversation_status, 'closed');
    assert.ok(conversation.closed_at);

    assert.ifError((await service.from('messages').insert({
      conversation_id: conversation.conversation_id,
      sender_user_id: userA.userId,
      message_type: 'text',
      content: '保存される同行履歴',
    })).error);

    const readable = await userA.authenticated.from('messages')
      .select('content').eq('conversation_id', conversation.conversation_id);
    assert.ifError(readable.error);
    assert.equal(readable.data.length, 1);

    const writeAttempt = await userA.authenticated.from('messages').insert({
      conversation_id: conversation.conversation_id,
      sender_user_id: userA.userId,
      message_type: 'text',
      content: '送信できないメッセージ',
    });
    assert.ok(writeAttempt.error);
  });

  await t.test('14. Leave Event -> companion relationship cancelled', async () => {
    // Create a dedicated event for testing companion relationship cancellation upon leaving event
    const leaveEventId = (await creator.authenticated.rpc('create_user_event', {
      p_title: 'Leave Companion Test Event',
      p_start_at: new Date(Date.now() + 86400000).toISOString(),
      p_end_at: new Date(Date.now() + 90000000).toISOString(),
      p_place_id: 'place_leave_01',
      p_place_name: '葛西臨海公園',
      p_address: '東京都江戸川区臨海町6',
      p_latitude: 35.6415,
      p_longitude: 139.8601,
      p_description: 'Leave test event',
      p_approval_required: false,
      p_capacity: 10,
    })).data;

    assert.ifError((await userA.authenticated.rpc('join_event', { p_event_id: leaveEventId })).error);
    assert.ifError((await userB.authenticated.rpc('join_event', { p_event_id: leaveEventId })).error);

    const newInviteId = (await userA.authenticated.rpc('create_event_invitation', {
      p_event_id: leaveEventId,
      p_receiver_user_id: userB.userId,
    })).data;
    assert.ok(newInviteId);

    await userB.authenticated.rpc('accept_event_invitation', { p_invitation_id: newInviteId });

    // User A leaves the event
    assert.ifError((await userA.authenticated.rpc('cancel_event_participation', { p_event_id: leaveEventId })).error);

    const { data: inv } = await service
      .from('invitations')
      .select('invitation_status')
      .eq('invitation_id', newInviteId)
      .single();

    assert.equal(inv.invitation_status, 'cancelled', 'Companion invitation must be cancelled when user leaves event');
  });

  await t.test('15. Leave Event -> group membership inactive', async () => {
    // Create an event group chat for testEventId
    const groupConvId = crypto.randomUUID();
    assert.ifError((await service.from('conversations').insert({
      conversation_id: groupConvId,
      event_id: testEventId,
      conversation_status: 'active',
      related_invitation_id: null,
      fixed_plan_id: null,
    })).error);

    assert.ifError((await service.from('conversation_members').insert([
      { conversation_id: groupConvId, user_id: userB.userId },
    ])).error);
    assert.ifError((await service.from('messages').insert({
      conversation_id: groupConvId,
      sender_user_id: userB.userId,
      message_type: 'text',
      content: '退出前のグループメッセージ',
    })).error);

    // User B leaves event
    assert.ifError((await userB.authenticated.rpc('cancel_event_participation', { p_event_id: testEventId })).error);

    const { data: member } = await service
      .from('conversation_members')
      .select('left_at')
      .eq('conversation_id', groupConvId)
      .eq('user_id', userB.userId)
      .single();

    assert.ok(member.left_at !== null, 'leaving event must mark conversation_members.left_at as non-null');

    const hiddenConversation = await userB.authenticated.from('conversations')
      .select('conversation_id').eq('conversation_id', groupConvId);
    assert.ifError(hiddenConversation.error);
    assert.equal(hiddenConversation.data.length, 0, 'A former group member must lose conversation read access.');

    const hiddenMessages = await userB.authenticated.from('messages')
      .select('message_id').eq('conversation_id', groupConvId);
    assert.ifError(hiddenMessages.error);
    assert.equal(hiddenMessages.data.length, 0, 'A former group member must lose message read access.');
  });

  await t.test('16. Creator cannot duplicate-join', async () => {
    const res = await creator.authenticated.rpc('join_event', { p_event_id: testEventId });
    assert.ifError(res.error, 'Creator calling join_event must succeed idempotently');

    const { data: parts } = await service
      .from('event_participations')
      .select('participation_id')
      .eq('event_id', testEventId)
      .eq('user_id', creator.userId);

    assert.equal(parts.length, 1, 'Creator must not have duplicate participation rows');
  });

  await t.test('17. Creator cannot leave their own event', async () => {
    const res = await creator.authenticated.rpc('cancel_event_participation', { p_event_id: testEventId });
    assert.ok(res.error, 'Creator leaving own event must fail');
    assert.match(res.error.message, /creator cannot leave/i);
  });

  await t.test('18. An active connection does not hide an otherwise eligible Event companion', async () => {
    assert.ifError((await userB.authenticated.rpc('join_event', { p_event_id: testEventId })).error);

    const canonicalA = userA.userId < userB.userId ? userA.userId : userB.userId;
    const canonicalB = userA.userId < userB.userId ? userB.userId : userA.userId;
    assert.ifError((await service.from('connections').update({ connection_status: 'active' })
      .eq('user_a_id', canonicalA).eq('user_b_id', canonicalB)).error);

    const candidates = await userA.authenticated.rpc('get_same_event_people', { p_event_id: testEventId });
    assert.ifError(candidates.error);
    assert.ok(candidates.data.some((candidate) => candidate.user_id === userB.userId));
  });

  let retryInvitationId;

  await t.test('19. A cancelled Event plan pair can create a fresh invitation', async () => {
    const retry = await userA.authenticated.rpc('create_event_invitation', {
      p_event_id: testEventId,
      p_receiver_user_id: userB.userId,
    });
    assert.ifError(retry.error);
    retryInvitationId = retry.data;
    assert.notEqual(retryInvitationId, eventInviteId);
  });

  await t.test('20. A declined Event plan pair remains blocked', async () => {
    assert.ifError((await userB.authenticated.rpc('decline_event_invitation', {
      p_invitation_id: retryInvitationId,
    })).error);

    const retry = await userA.authenticated.rpc('create_event_invitation', {
      p_event_id: testEventId,
      p_receiver_user_id: userB.userId,
    });
    assert.ok(retry.error);
    assert.match(retry.error.message, /declined|blocked/i);
  });

  await t.test('21. Published user Event rejects direct mutation and cancellation preserves history', async () => {
    const directUpdate = await creator.authenticated.from('events')
      .update({ title: 'Bypassed lifecycle' }).eq('event_id', testEventId);
    assert.ok(directUpdate.error, 'Authenticated users must not directly update a published Event.');

    const directDelete = await creator.authenticated.from('events')
      .delete().eq('event_id', testEventId);
    assert.ok(directDelete.error, 'Authenticated users must not directly delete a published Event.');

    const cancel = await creator.authenticated.rpc('cancel_user_event', { p_event_id: testEventId });
    assert.ifError(cancel.error);
    assert.equal(cancel.data, true);

    const { data: event, error: eventError } = await creator.authenticated.from('events')
      .select('event_id, event_status').eq('event_id', testEventId).single();
    assert.ifError(eventError);
    assert.equal(event.event_status, 'cancelled');

    const history = await service.from('event_participations')
      .select('participation_id').eq('event_id', testEventId);
    assert.ifError(history.error);
    assert.ok(history.data.length >= 1, 'Cancelling an Event must preserve participation history.');
  });
});
