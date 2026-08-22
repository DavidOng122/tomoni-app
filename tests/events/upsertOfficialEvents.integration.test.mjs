import assert from 'node:assert/strict';
import test from 'node:test';

import { createClient } from '@supabase/supabase-js';

import { upsertOfficialEvents } from '../../src/infrastructure/events/upsertOfficialEvents.ts';

const integrationEnabled = process.env.RUN_SUPABASE_EVENT_IMPORT_INTEGRATION === '1';

function localSupabaseConfiguration() {
  const urlValue = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.ok(urlValue, 'A local SUPABASE_URL is required.');
  assert.ok(serviceRoleKey, 'A local SUPABASE_SERVICE_ROLE_KEY is required.');

  const url = new URL(urlValue);
  assert.ok(
    ['127.0.0.1', 'localhost'].includes(url.hostname),
    'The integration test refuses to run against a non-local Supabase URL.',
  );
  return { url: url.toString(), serviceRoleKey };
}

function normalizedEvent(sourceEventId, title) {
  return {
    sourceDatasetId: 'edogawa_event_calendar',
    sourceEventId,
    sourceName: '江戸川区',
    title,
    description: null,
    startAt: '2026-09-01T10:00:00+09:00',
    endAt: '2026-09-01T12:00:00+09:00',
    placeName: 'integration test venue',
    address: null,
    registrationRequired: false,
    registrationStatus: 'not_required',
    registrationDeadline: null,
    registrationUrl: null,
    capacity: null,
    officialUrl: 'https://www.city.edogawa.tokyo.jp/event/integration-test.html',
    sourceUpdatedAt: null,
    eventStatus: 'scheduled',
    statusMessage: null,
    recommendationTags: [],
  };
}

test('local database preserves identity, foreign keys, and user-created behavior', {
  skip: !integrationEnabled,
}, async () => {
  const configuration = localSupabaseConfiguration();
  const client = createClient(configuration.url, configuration.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const suffix = crypto.randomUUID();
  const sourceEventId = `integration-${suffix}`;
  const authUserIds = [];
  let officialEventId = null;
  const userCreatedEventIds = [];
  let conversationId = null;

  try {
    const first = await upsertOfficialEvents(client, [
      normalizedEvent(sourceEventId, 'first title'),
    ]);
    officialEventId = first.events[0].eventId;
    assert.match(
      officialEventId,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu,
    );

    for (const index of [1, 2]) {
      const { data: authData, error: authError } = await client.auth.admin.createUser({
        email: `event-import-${index}-${suffix}@example.test`,
        email_confirm: true,
      });
      assert.ifError(authError);
      authUserIds.push(authData.user.id);
    }

    const { error: participationError } = await client
      .from('event_participations')
      .insert({
        event_id: officialEventId,
        user_id: authUserIds[0],
        participation_status: 'going',
      });
    assert.ifError(participationError);

    const { data: invitation, error: invitationError } = await client
      .from('invitations')
      .insert({
        sender_user_id: authUserIds[0],
        receiver_user_id: authUserIds[1],
        invitation_type: 'event',
        event_id: officialEventId,
        invitation_status: 'pending',
      })
      .select('invitation_id,event_id')
      .single();
    assert.ifError(invitationError);

    const { data: conversation, error: conversationError } = await client
      .from('conversations')
      .insert({
        related_invitation_id: invitation.invitation_id,
        event_id: officialEventId,
        conversation_status: 'active',
      })
      .select('conversation_id,event_id')
      .single();
    assert.ifError(conversationError);
    conversationId = conversation.conversation_id;

    const second = await upsertOfficialEvents(client, [
      normalizedEvent(sourceEventId, 'updated title'),
    ]);
    assert.equal(second.events[0].eventId, officialEventId);

    const [
      { data: updatedEvent, error: updatedEventError },
      { data: participation, error: participationReadError },
      { data: attachedInvitation, error: invitationReadError },
      { data: attachedConversation, error: conversationReadError },
    ] = await Promise.all([
      client
        .from('events')
        .select('event_id,title')
        .eq('event_id', officialEventId)
        .single(),
      client
        .from('event_participations')
        .select('event_id')
        .eq('event_id', officialEventId)
        .single(),
      client
        .from('invitations')
        .select('event_id')
        .eq('invitation_id', invitation.invitation_id)
        .single(),
      client
        .from('conversations')
        .select('event_id')
        .eq('conversation_id', conversationId)
        .single(),
    ]);
    assert.ifError(updatedEventError);
    assert.equal(updatedEvent.event_id, officialEventId);
    assert.equal(updatedEvent.title, 'updated title');
    assert.ifError(participationReadError);
    assert.equal(participation.event_id, officialEventId);
    assert.ifError(invitationReadError);
    assert.equal(attachedInvitation.event_id, officialEventId);
    assert.ifError(conversationReadError);
    assert.equal(attachedConversation.event_id, officialEventId);

    const { data: userCreated, error: userCreatedError } = await client
      .from('events')
      .insert([1, 2].map((index) => ({
        event_type: 'user_created',
        title: `user event ${index}`,
        start_at: `2026-09-0${index + 1}T10:00:00+09:00`,
        place_name: 'user venue',
        event_status: 'scheduled',
      })))
      .select('event_id,source_dataset_id,source_event_id');
    assert.ifError(userCreatedError);
    assert.equal(userCreated.length, 2);
    for (const event of userCreated) {
      userCreatedEventIds.push(event.event_id);
      assert.equal(event.source_dataset_id, null);
      assert.equal(event.source_event_id, null);
    }

    const { error: rejectedIdentityError } = await client.from('events').insert({
      event_type: 'user_created',
      source_dataset_id: 'not_allowed',
      source_event_id: '1',
      title: 'invalid user event',
      start_at: '2026-09-03T10:00:00+09:00',
      place_name: 'user venue',
      event_status: 'scheduled',
    });
    assert.ok(rejectedIdentityError);

    for (const [index, identity] of [
      ['dataset-only', { source_dataset_id: 'edogawa_event_calendar' }],
      ['event-only', { source_event_id: '99901' }],
      ['blank-dataset', { source_dataset_id: '', source_event_id: '99902' }],
      ['blank-event', { source_dataset_id: 'edogawa_event_calendar', source_event_id: '' }],
      ['spaced-dataset', { source_dataset_id: ' edogawa_event_calendar', source_event_id: '99903' }],
      ['spaced-event', { source_dataset_id: 'edogawa_event_calendar', source_event_id: ' 99904 ' }],
    ]) {
      const { error: invalidIdentityError } = await client.from('events').insert({
        event_type: 'official',
        title: `invalid identity ${index}`,
        start_at: '2026-09-03T10:00:00+09:00',
        place_name: 'official venue',
        event_status: 'scheduled',
        ...identity,
      });
      assert.ok(invalidIdentityError, `${index} should violate a source identity check`);
    }

    const { error: duplicateError } = await client.from('events').insert({
      event_type: 'official',
      source_dataset_id: 'edogawa_event_calendar',
      source_event_id: sourceEventId,
      title: 'duplicate official event',
      start_at: '2026-09-04T10:00:00+09:00',
      place_name: 'official venue',
      event_status: 'scheduled',
    });
    assert.ok(duplicateError);

    const { data: seededOfficialEvents, error: seededOfficialEventsError } = await client
      .from('events')
      .select('event_id')
      .eq('event_type', 'official')
      .is('source_dataset_id', null)
      .is('source_event_id', null);
    assert.ifError(seededOfficialEventsError);
    assert.ok(
      seededOfficialEvents.length > 0,
      'Existing official seed rows without source identity should survive reset.',
    );
  } finally {
    if (conversationId) {
      await client.from('conversations').delete().eq('conversation_id', conversationId);
    }
    const eventIds = [officialEventId, ...userCreatedEventIds].filter(Boolean);
    if (eventIds.length > 0) {
      await client
        .from('events')
        .delete()
        .in('event_id', eventIds);
    }
    for (const authUserId of authUserIds) {
      await client.auth.admin.deleteUser(authUserId);
    }
  }
});
