import assert from 'node:assert/strict';
import test from 'node:test';

import { createClient } from '@supabase/supabase-js';

const integrationEnabled = process.env.RUN_SUPABASE_EVENT_RECOMMENDATION_INTEGRATION === '1';

function localConfiguration() {
  const urlValue = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
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

function tokyoDateParts(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function futureTokyoIso(daysFromNow, time) {
  const date = new Date(Date.now() + daysFromNow * 86_400_000);
  const parts = tokyoDateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}T${time}:00+09:00`;
}

const weekdayCodes = { Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', Sat: 'sat', Sun: 'sun' };

test('local event recommendation prioritizes valid events, validates selection, and preserves invitation semantics', {
  skip: !integrationEnabled,
  timeout: 60_000,
}, async () => {
  const config = localConfiguration();
  const service = client(config.url, config.serviceRoleKey);
  const sender = client(config.url, config.anonKey);
  const receiver = client(config.url, config.anonKey);
  const suffix = crypto.randomUUID();
  const password = 'LocalIntegration!2026';
  const createdUserIds = [];
  const planIds = [crypto.randomUUID(), crypto.randomUUID()];
  const placeIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
  const eventIds = [
    crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID(),
    crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID(),
  ];
  let invitationId = null;
  let conversationId = null;

  try {
    for (const role of ['sender', 'receiver']) {
      const created = await service.auth.admin.createUser({
        email: `event-${role}-${suffix}@yorimi.local`,
        password,
        email_confirm: true,
      });
      assert.ifError(created.error);
      createdUserIds.push(created.data.user.id);
    }

    assert.ifError((await service.from('users').update({
      account_status: 'active', onboarding_status: 'completed',
    }).in('id', createdUserIds)).error);
    assert.ifError((await service.from('profiles').insert([
      {
        user_id: createdUserIds[0], nickname: 'Event Sender', gender: 'prefer_not_to_say',
        age_range: '25-34', avatar_url: '', tags: ['local_event', 'exhibition'], profile_status: 'active',
      },
      {
        user_id: createdUserIds[1], nickname: 'Event Receiver', gender: 'prefer_not_to_say',
        age_range: '25-34', avatar_url: '', tags: ['local_event'], profile_status: 'active',
      },
    ])).error);

    const eligibleParts = tokyoDateParts(new Date(Date.now() + 8 * 86_400_000));
    const eligibleDay = weekdayCodes[eligibleParts.weekday];
    assert.ok(eligibleDay);
    assert.ifError((await service.from('fixed_plans').insert([
      {
        fixed_plan_id: planIds[0], user_id: createdUserIds[0], activity_type: 'event',
        custom_activity_name: null, days_of_week: [eligibleDay], start_time: '10:00',
        place_id: null, place_name: '葛西', latitude: 35.6635, longitude: 139.8726, plan_status: 'active',
      },
      {
        fixed_plan_id: planIds[1], user_id: createdUserIds[1], activity_type: 'event',
        custom_activity_name: null, days_of_week: [eligibleDay], start_time: '10:00',
        place_id: null, place_name: '西葛西', latitude: 35.6659, longitude: 139.8593, plan_status: 'active',
      },
    ])).error);

    assert.ifError((await service.from('public_places').insert([
      {
        public_place_id: placeIds[0], source_dataset_id: 'integration_event_recommendations', source_place_id: `${suffix}-venue`,
        source_name: '江戸川区', name: 'Integration文化会館', category: 'cultural_facility',
        address: '江戸川区葛西1丁目', latitude: 35.6645, longitude: 139.8670,
        official_url: 'https://example.test/venue', attributes: { media: { image_url: 'https://example.test/venue.jpg' } },
        last_checked_at: new Date().toISOString(),
      },
      {
        public_place_id: placeIds[1], source_dataset_id: 'integration_event_recommendations', source_place_id: `${suffix}-fallback-1`,
        source_name: '江戸川区', name: 'Integration文化施設A', category: 'cultural_facility',
        address: '江戸川区西葛西1丁目', latitude: 35.6650, longitude: 139.8650,
        official_url: 'https://example.test/facility-a', attributes: {}, last_checked_at: new Date().toISOString(),
      },
      {
        public_place_id: placeIds[2], source_dataset_id: 'integration_event_recommendations', source_place_id: `${suffix}-fallback-2`,
        source_name: '江戸川区', name: 'Integration文化施設B', category: 'cultural_facility',
        address: '江戸川区中葛西1丁目', latitude: 35.6660, longitude: 139.8660,
        official_url: 'https://example.test/facility-b', attributes: {}, last_checked_at: new Date().toISOString(),
      },
      {
        public_place_id: placeIds[3], source_dataset_id: 'integration_event_recommendations', source_place_id: `${suffix}-far`,
        source_name: '江戸川区', name: 'Integration遠方会場', category: 'cultural_facility',
        address: '江戸川区小岩1丁目', latitude: 35.7330, longitude: 139.8830,
        official_url: 'https://example.test/far', attributes: {}, last_checked_at: new Date().toISOString(),
      },
    ])).error);

    const baseEvent = {
      event_type: 'official', source_dataset_id: 'integration_event_recommendations', source_name: '江戸川区',
      title: 'Integration アートフェア', description: null, end_at: null, place_id: null,
      place_name: 'Integration文化会館', address: '江戸川区葛西1丁目', latitude: null, longitude: null,
      registration_required: false, registration_status: 'not_required', event_status: 'scheduled',
      official_url: 'https://example.test/event', recommendation_tags: ['art_exhibition'],
      venue_public_place_id: placeIds[0], last_checked_at: new Date().toISOString(),
    };
    assert.ifError((await service.from('events').insert([
      { ...baseEvent, event_id: eventIds[0], source_event_id: `${suffix}-eligible`, start_at: futureTokyoIso(8, '18:30') },
      { ...baseEvent, event_id: eventIds[1], source_event_id: `${suffix}-closed`, title: 'Closed event', start_at: futureTokyoIso(8, '10:00'), registration_status: 'closed' },
      { ...baseEvent, event_id: eventIds[2], source_event_id: `${suffix}-too-late`, title: 'Too late event', start_at: futureTokyoIso(61, '10:00') },
      { ...baseEvent, event_id: eventIds[3], source_event_id: `${suffix}-unsupported-category`, title: 'Unsupported category', start_at: futureTokyoIso(8, '12:01'), recommendation_tags: [] },
      { ...baseEvent, event_id: eventIds[4], source_event_id: `${suffix}-too-far`, title: 'Far event', start_at: futureTokyoIso(8, '10:00'), venue_public_place_id: placeIds[3], place_name: 'Integration遠方会場' },
      { ...baseEvent, event_id: eventIds[5], source_event_id: `${suffix}-wrong-day`, title: 'Wrong weekday event', start_at: futureTokyoIso(9, '10:00') },
      { ...baseEvent, event_id: eventIds[6], source_event_id: `${suffix}-full`, title: 'Full event', start_at: futureTokyoIso(8, '10:00'), registration_status: 'full' },
    ])).error);

    assert.ifError((await sender.auth.signInWithPassword({
      email: `event-sender-${suffix}@yorimi.local`, password,
    })).error);
    assert.ifError((await receiver.auth.signInWithPassword({
      email: `event-receiver-${suffix}@yorimi.local`, password,
    })).error);

    const recommendations = await sender.rpc('get_fixed_plan_event_recommendations', {
      p_sender_fixed_plan_id: planIds[0], p_receiver_fixed_plan_id: planIds[1], p_limit: 3,
    });
    assert.ifError(recommendations.error);
    assert.equal(recommendations.data.length, 3);
    assert.equal(recommendations.data[0].recommendation_kind, 'event');
    assert.equal(recommendations.data[0].event_id, eventIds[0]);
    assert.equal(recommendations.data[1].recommendation_kind, 'event');
    assert.equal(recommendations.data[1].event_id, eventIds[4]);
    assert.ok(
      recommendations.data[1].sender_distance_meters > 5000
        || recommendations.data[1].receiver_distance_meters > 5000,
      'Edogawa events must not be removed by the former 5km destination filter.',
    );
    assert.ok(['event', 'cultural_facility'].includes(recommendations.data[2].recommendation_kind));

    const spoofed = await sender.rpc('create_fixed_schedule_invitation', {
      p_fixed_plan_id: planIds[0], p_receiver_id: createdUserIds[1], p_receiver_fixed_plan_id: planIds[1],
      p_suggested_event_id: eventIds[1],
    });
    assert.ok(spoofed.error);

    const selected = await sender.rpc('create_fixed_schedule_invitation', {
      p_fixed_plan_id: planIds[0], p_receiver_id: createdUserIds[1], p_receiver_fixed_plan_id: planIds[1],
      p_suggested_event_id: eventIds[0],
    });
    assert.ifError(selected.error);
    invitationId = selected.data.invitation_id;
    conversationId = selected.data.conversation_id;
    assert.equal(selected.data.suggested_event_id, eventIds[0]);

    const duplicateWithoutRecommendation = await sender.rpc('create_fixed_schedule_invitation', {
      p_fixed_plan_id: planIds[0], p_receiver_id: createdUserIds[1], p_receiver_fixed_plan_id: planIds[1],
    });
    assert.ifError(duplicateWithoutRecommendation.error);
    assert.equal(duplicateWithoutRecommendation.data.invitation_id, invitationId);
    assert.equal(
      duplicateWithoutRecommendation.data.suggested_event_id,
      eventIds[0],
      'Idempotent retries must not replace or clear the frozen recommendation.',
    );

    const beforeAcceptance = await sender.rpc('get_fixed_plan_invitation_recommendation', {
      p_invitation_id: invitationId,
    }).single();
    assert.ifError(beforeAcceptance.error);
    assert.equal(beforeAcceptance.data.place_address, null);
    assert.equal(beforeAcceptance.data.place_latitude, null);
    assert.equal(beforeAcceptance.data.official_url, null);

    assert.ifError((await receiver.rpc('accept_fixed_schedule_invitation', {
      p_invitation_id: invitationId,
    })).error);
    const afterAcceptance = await receiver.rpc('get_fixed_plan_invitation_recommendation', {
      p_invitation_id: invitationId,
    }).single();
    assert.ifError(afterAcceptance.error);
    assert.equal(afterAcceptance.data.place_address, '江戸川区葛西1丁目');
    assert.equal(afterAcceptance.data.official_url, 'https://example.test/event');

    const participations = await service.from('event_participations').select('participation_id', { count: 'exact' })
      .eq('event_id', eventIds[0]).in('user_id', createdUserIds);
    assert.ifError(participations.error);
    assert.equal(participations.count, 0);

    assert.ifError((await service.from('events').update({ event_status: 'cancelled' }).eq('event_id', eventIds[0])).error);
    const changed = await receiver.rpc('get_fixed_plan_invitation_recommendation', {
      p_invitation_id: invitationId,
    }).single();
    assert.ifError(changed.error);
    assert.equal(changed.data.suggested_event_id, eventIds[0]);
    assert.equal(changed.data.event_status, 'cancelled');
  } finally {
    if (conversationId) {
      await service.from('conversation_members').delete().eq('conversation_id', conversationId);
      await service.from('messages').delete().eq('conversation_id', conversationId);
      await service.from('conversations').delete().eq('conversation_id', conversationId);
    }
    if (invitationId) await service.from('invitations').delete().eq('invitation_id', invitationId);
    await service.from('event_participations').delete().in('event_id', eventIds);
    await service.from('events').delete().in('event_id', eventIds);
    await service.from('fixed_plans').delete().in('fixed_plan_id', planIds);
    await service.from('public_places').delete().in('public_place_id', placeIds);
    await service.from('profiles').delete().in('user_id', createdUserIds);
    for (const userId of createdUserIds) await service.auth.admin.deleteUser(userId);
  }
});
