import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';

const execFile = promisify(execFileCallback);
const integrationEnabled = process.env.RUN_SUPABASE_FIXED_PLAN_SNAPSHOT_INTEGRATION === '1';

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
  const email = `snap-archive-${label}-${userId.slice(0, 8)}@yorimi.local`;
  const password = 'LocalSnapArchive!2026';

  await localSql(`
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous)
    values ('00000000-0000-0000-0000-000000000000'::uuid, '${userId}'::uuid, 'authenticated', 'authenticated', '${email}', extensions.crypt('${password}', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"sub":"${userId}"}'::jsonb, now(), now(), false, false);
    update public.users set account_status = 'active', onboarding_status = 'completed' where id = '${userId}'::uuid;
    insert into public.profiles (user_id, nickname, age_range, gender, avatar_url, tags, profile_status)
    values ('${userId}'::uuid, 'Snap ${label}', '25-34', 'prefer_not_to_say', '', array['散歩', 'カフェ']::text[], 'active');
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

test('Codex Prompt 3 — Fixed Plan Snapshot + Archive Lifecycle Integration Test', {
  skip: !integrationEnabled,
}, async (t) => {
  const config = localConfiguration();
  const service = client(config.url, config.serviceRoleKey);

  const userA = await createTestUser(config, service, 'userA');
  const userB = await createTestUser(config, service, 'userB');

  const userA_id = userA.userId;
  const userB_id = userB.userId;

  const planA1_id = crypto.randomUUID();
  const planB1_id = crypto.randomUUID();

  assert.ifError((await service.from('fixed_plans').insert(createPlanDraft({ planId: planA1_id, userId: userA_id, placeName: '行船公園', start: '08:00:00' }))).error);
  assert.ifError((await service.from('fixed_plans').insert(createPlanDraft({ planId: planB1_id, userId: userB_id, placeName: '宇喜田公園', start: '08:15:00' }))).error);

  let invitation1_id;

  await t.test('1. Invite created -> snapshot equals current plan', async () => {
    const inviteRes = await userA.authenticated.rpc('create_fixed_schedule_invitation', {
      p_fixed_plan_id: planA1_id,
      p_receiver_fixed_plan_id: planB1_id,
      p_receiver_id: userB_id,
    });
    assert.ifError(inviteRes.error);
    invitation1_id = inviteRes.data.invitation_id;

    const { data: pair, error: pairErr } = await service
      .from('invitation_plan_pairs')
      .select('sender_plan_snapshot, receiver_plan_snapshot')
      .eq('invitation_id', invitation1_id)
      .single();

    assert.ifError(pairErr);
    assert.ok(pair.sender_plan_snapshot, 'sender_plan_snapshot must exist');
    assert.ok(pair.receiver_plan_snapshot, 'receiver_plan_snapshot must exist');

    assert.equal(pair.sender_plan_snapshot.place_name, '行船公園');
    assert.equal(pair.sender_plan_snapshot.activity_type, 'walking');
    assert.deepEqual(pair.sender_plan_snapshot.days_of_week, ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
    assert.equal(pair.sender_plan_snapshot.start_time, '08:00:00');
    assert.equal(pair.receiver_plan_snapshot.place_name, '宇喜田公園');
    assert.equal(pair.receiver_plan_snapshot.activity_type, 'walking');
    assert.equal(pair.receiver_plan_snapshot.start_time, '08:15:00');
  });

  await t.test('1a. Event-only decline and cancel RPCs cannot mutate a Fixed Plan invitation', async () => {
    const decline = await userB.authenticated.rpc('decline_event_invitation', {
      p_invitation_id: invitation1_id,
    });
    assert.ifError(decline.error);
    assert.equal(decline.data, false);

    const cancel = await userA.authenticated.rpc('cancel_event_invitation', {
      p_invitation_id: invitation1_id,
    });
    assert.ifError(cancel.error);
    assert.equal(cancel.data, false);

    const { data: invitation } = await service.from('invitations')
      .select('invitation_status').eq('invitation_id', invitation1_id).single();
    assert.equal(invitation.invitation_status, 'pending');
  });

  await t.test('2. Sender edits plan -> old invitation snapshot remains unchanged', async () => {
    // Sender edits every user-visible field on planA1.
    const updateRes = await service
      .from('fixed_plans')
      .update({
        activity_type: 'other',
        custom_activity_name: '新しい趣味',
        days_of_week: ['sat'],
        place_name: '葛西臨海公園',
        start_time: '19:00:00',
        updated_at: new Date().toISOString(),
      })
      .eq('fixed_plan_id', planA1_id);
    assert.ifError(updateRes.error);

    const { data: pair } = await service
      .from('invitation_plan_pairs')
      .select('sender_plan_snapshot')
      .eq('invitation_id', invitation1_id)
      .single();

    assert.equal(pair.sender_plan_snapshot.place_name, '行船公園', 'Snapshot place_name must remain original 行船公園');

    const detailRes = await userA.authenticated.rpc('get_fixed_plan_invitation_suggested_place', {
      p_invitation_id: invitation1_id,
    });
    assert.ifError(detailRes.error);
    assert.equal(detailRes.data[0].sender_area_name, '行船公園', 'Display RPC must return snapshot place name 行船公園');

    const displayRes = await userA.authenticated.rpc('get_fixed_plan_invitation_display', {
      p_invitation_id: invitation1_id,
    });
    assert.ifError(displayRes.error);
    assert.equal(displayRes.data[0].sender_activity_type, 'walking');
    assert.equal(displayRes.data[0].sender_custom_activity_name, null);
    assert.deepEqual(displayRes.data[0].sender_days_of_week, ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
    assert.equal(displayRes.data[0].sender_start_time, '08:00:00');
    assert.equal(displayRes.data[0].sender_place_name, '行船公園');
  });

  await t.test('3. Receiver edits plan -> old invitation snapshot remains unchanged', async () => {
    // Receiver edits every user-visible field on planB1.
    const updateRes = await service
      .from('fixed_plans')
      .update({
        activity_type: 'sports',
        days_of_week: ['sun'],
        place_name: '総合レクリエーション公園',
        start_time: '20:00:00',
        updated_at: new Date().toISOString(),
      })
      .eq('fixed_plan_id', planB1_id);
    assert.ifError(updateRes.error);

    const { data: pair } = await service
      .from('invitation_plan_pairs')
      .select('receiver_plan_snapshot')
      .eq('invitation_id', invitation1_id)
      .single();

    assert.equal(pair.receiver_plan_snapshot.place_name, '宇喜田公園', 'Receiver snapshot place_name must remain original 宇喜田公園');

    const detailRes = await userB.authenticated.rpc('get_fixed_plan_invitation_suggested_place', {
      p_invitation_id: invitation1_id,
    });
    assert.ifError(detailRes.error);
    assert.equal(detailRes.data[0].receiver_area_name, '宇喜田公園', 'Display RPC must return snapshot place name 宇喜田公園');

    const displayRes = await userB.authenticated.rpc('get_fixed_plan_invitation_display', {
      p_invitation_id: invitation1_id,
    });
    assert.ifError(displayRes.error);
    assert.equal(displayRes.data[0].receiver_activity_type, 'walking');
    assert.deepEqual(displayRes.data[0].receiver_days_of_week, ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
    assert.equal(displayRes.data[0].receiver_start_time, '08:15:00');
    assert.equal(displayRes.data[0].receiver_place_name, '宇喜田公園');
  });

  await t.test('4. Sender archives plan while invite pending -> invite cancelled & conversation closed', async () => {
    // Create new pending invitation
    const planA2_id = crypto.randomUUID();
    const planB2_id = crypto.randomUUID();
    assert.ifError((await service.from('fixed_plans').insert(createPlanDraft({ planId: planA2_id, userId: userA_id }))).error);
    assert.ifError((await service.from('fixed_plans').insert(createPlanDraft({ planId: planB2_id, userId: userB_id }))).error);

    const inviteRes = await userA.authenticated.rpc('create_fixed_schedule_invitation', {
      p_fixed_plan_id: planA2_id,
      p_receiver_fixed_plan_id: planB2_id,
      p_receiver_id: userB_id,
    });
    assert.ifError(inviteRes.error);
    const invId = inviteRes.data.invitation_id;
    const convId = inviteRes.data.conversation_id;

    // Sender archives planA2
    const archiveRes = await userA.authenticated.rpc('archive_fixed_plan', {
      p_fixed_plan_id: planA2_id,
    });
    assert.ifError(archiveRes.error);

    const { data: inv } = await service.from('invitations').select('invitation_status').eq('invitation_id', invId).single();
    assert.equal(inv.invitation_status, 'cancelled', 'Pending invitation must be cancelled when sender archives plan');

    const { data: conv } = await service.from('conversations').select('conversation_status').eq('conversation_id', convId).single();
    assert.equal(conv.conversation_status, 'closed', 'Linked conversation must be closed');
  });

  await t.test('5. Receiver archives plan while invite pending -> invite cancelled & conversation closed', async () => {
    // Create new pending invitation
    const planA3_id = crypto.randomUUID();
    const planB3_id = crypto.randomUUID();
    assert.ifError((await service.from('fixed_plans').insert(createPlanDraft({ planId: planA3_id, userId: userA_id }))).error);
    assert.ifError((await service.from('fixed_plans').insert(createPlanDraft({ planId: planB3_id, userId: userB_id }))).error);

    const inviteRes = await userA.authenticated.rpc('create_fixed_schedule_invitation', {
      p_fixed_plan_id: planA3_id,
      p_receiver_fixed_plan_id: planB3_id,
      p_receiver_id: userB_id,
    });
    assert.ifError(inviteRes.error);
    const invId = inviteRes.data.invitation_id;
    const convId = inviteRes.data.conversation_id;

    // Receiver archives planB3
    const archiveRes = await userB.authenticated.rpc('archive_fixed_plan', {
      p_fixed_plan_id: planB3_id,
    });
    assert.ifError(archiveRes.error);

    const { data: inv } = await service.from('invitations').select('invitation_status').eq('invitation_id', invId).single();
    assert.equal(inv.invitation_status, 'cancelled', 'Pending invitation must be cancelled when receiver archives plan');

    const { data: conv } = await service.from('conversations').select('conversation_status').eq('conversation_id', convId).single();
    assert.equal(conv.conversation_status, 'closed', 'Linked conversation must be closed');
  });

  await t.test('6. Accepted invite + sender archives plan -> accepted relationship preserved', async () => {
    const planA4_id = crypto.randomUUID();
    const planB4_id = crypto.randomUUID();
    assert.ifError((await service.from('fixed_plans').insert(createPlanDraft({ planId: planA4_id, userId: userA_id }))).error);
    assert.ifError((await service.from('fixed_plans').insert(createPlanDraft({ planId: planB4_id, userId: userB_id }))).error);

    const inviteRes = await userA.authenticated.rpc('create_fixed_schedule_invitation', {
      p_fixed_plan_id: planA4_id,
      p_receiver_fixed_plan_id: planB4_id,
      p_receiver_id: userB_id,
    });
    assert.ifError(inviteRes.error);
    const invId = inviteRes.data.invitation_id;

    // Accept invitation
    assert.ifError((await userB.authenticated.rpc('accept_fixed_schedule_invitation', { p_invitation_id: invId })).error);

    // Sender archives planA4
    assert.ifError((await userA.authenticated.rpc('archive_fixed_plan', { p_fixed_plan_id: planA4_id })).error);

    const { data: inv } = await service.from('invitations').select('invitation_status').eq('invitation_id', invId).single();
    assert.equal(inv.invitation_status, 'accepted', 'Accepted invitation MUST NOT be cancelled by archiving sender plan');
  });

  await t.test('7. Accepted invite + receiver archives plan -> accepted relationship preserved', async () => {
    const planA5_id = crypto.randomUUID();
    const planB5_id = crypto.randomUUID();
    assert.ifError((await service.from('fixed_plans').insert(createPlanDraft({ planId: planA5_id, userId: userA_id }))).error);
    assert.ifError((await service.from('fixed_plans').insert(createPlanDraft({ planId: planB5_id, userId: userB_id }))).error);

    const inviteRes = await userA.authenticated.rpc('create_fixed_schedule_invitation', {
      p_fixed_plan_id: planA5_id,
      p_receiver_fixed_plan_id: planB5_id,
      p_receiver_id: userB_id,
    });
    assert.ifError(inviteRes.error);
    const invId = inviteRes.data.invitation_id;

    // Accept invitation
    assert.ifError((await userB.authenticated.rpc('accept_fixed_schedule_invitation', { p_invitation_id: invId })).error);

    // Receiver archives planB5
    assert.ifError((await userB.authenticated.rpc('archive_fixed_plan', { p_fixed_plan_id: planB5_id })).error);

    const { data: inv } = await service.from('invitations').select('invitation_status').eq('invitation_id', invId).single();
    assert.equal(inv.invitation_status, 'accepted', 'Accepted invitation MUST NOT be cancelled by archiving receiver plan');
  });

  await t.test('8. Archived Plan no longer appears in matching', async () => {
    const planA6_id = crypto.randomUUID();
    const planB6_id = crypto.randomUUID();
    assert.ifError((await service.from('fixed_plans').insert(createPlanDraft({ planId: planA6_id, userId: userA_id, placeName: '新小岩公園' }))).error);
    assert.ifError((await service.from('fixed_plans').insert(createPlanDraft({ planId: planB6_id, userId: userB_id, placeName: '新小岩公園' }))).error);

    // Archive planB6
    assert.ifError((await userB.authenticated.rpc('archive_fixed_plan', { p_fixed_plan_id: planB6_id })).error);

    const recRes = await userA.authenticated.rpc('get_discover_recommendations', {
      p_my_plan_id: planA6_id,
    });
    assert.ifError(recRes.error);
    const foundB = recRes.data?.some((c) => c.match?.candidatePlanId === planB6_id);
    assert.equal(foundB, false, 'Archived planB6 MUST NOT appear in Discover recommendations');
  });

  await t.test('9. Snapshot survives future plan edits', async () => {
    const planA7_id = crypto.randomUUID();
    const planB7_id = crypto.randomUUID();
    assert.ifError((await service.from('fixed_plans').insert(createPlanDraft({ planId: planA7_id, userId: userA_id, placeName: '一之江名主屋敷' }))).error);
    assert.ifError((await service.from('fixed_plans').insert(createPlanDraft({ planId: planB7_id, userId: userB_id, placeName: '一之江名主屋敷' }))).error);

    const inviteRes = await userA.authenticated.rpc('create_fixed_schedule_invitation', {
      p_fixed_plan_id: planA7_id,
      p_receiver_fixed_plan_id: planB7_id,
      p_receiver_id: userB_id,
    });
    assert.ifError(inviteRes.error);
    const invId = inviteRes.data.invitation_id;

    // Mutate plan A7 multiple times
    await service.from('fixed_plans').update({ place_name: 'Edit 1' }).eq('fixed_plan_id', planA7_id);
    await service.from('fixed_plans').update({ place_name: 'Edit 2' }).eq('fixed_plan_id', planA7_id);
    await service.from('fixed_plans').update({ place_name: 'Edit 3' }).eq('fixed_plan_id', planA7_id);

    const { data: pair } = await service.from('invitation_plan_pairs').select('sender_plan_snapshot').eq('invitation_id', invId).single();
    assert.equal(pair.sender_plan_snapshot.place_name, '一之江名主屋敷', 'Snapshot must survive multiple plan edits');
  });

  await t.test('10. Historical UI/query safely falls back to live Plan for legacy data when snapshot is null', async () => {
    const planA8_id = crypto.randomUUID();
    const planB8_id = crypto.randomUUID();
    assert.ifError((await service.from('fixed_plans').insert(createPlanDraft({ planId: planA8_id, userId: userA_id, placeName: 'Legacy Plan A' }))).error);
    assert.ifError((await service.from('fixed_plans').insert(createPlanDraft({ planId: planB8_id, userId: userB_id, placeName: 'Legacy Plan B' }))).error);

    const invId = crypto.randomUUID();
    assert.ifError((await service.from('invitations').insert({
      invitation_id: invId,
      sender_user_id: userA_id,
      receiver_user_id: userB_id,
      invitation_type: 'fixed_plan',
      fixed_plan_id: planA8_id,
      invitation_status: 'accepted',
    })).error);

    // Insert legacy pair row with null snapshots
    assert.ifError((await service.from('invitation_plan_pairs').insert({
      invitation_id: invId,
      sender_fixed_plan_id: planA8_id,
      receiver_fixed_plan_id: planB8_id,
      sender_plan_snapshot: null,
      receiver_plan_snapshot: null,
    })).error);

    const detailRes = await userA.authenticated.rpc('get_fixed_plan_invitation_suggested_place', {
      p_invitation_id: invId,
    });
    assert.ifError(detailRes.error);
    assert.equal(detailRes.data[0].sender_area_name, 'Legacy Plan A', 'Legacy query must fall back to live fixed_plan place name');
    assert.equal(detailRes.data[0].receiver_area_name, 'Legacy Plan B', 'Legacy query must fall back to live fixed_plan place name');
  });
});
