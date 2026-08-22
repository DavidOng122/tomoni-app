import assert from 'node:assert/strict';
import test from 'node:test';

import { createClient } from '@supabase/supabase-js';

const integrationEnabled = process.env.RUN_SUPABASE_INVITATION_INTEGRATION === '1';

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

async function createIntegrationUser(config, service, label) {
  const suffix = crypto.randomUUID().replaceAll('-', '');
  const email = `plan-pair-${label}-${suffix}@yorimi.local`;
  const password = 'LocalPlanPair!2026';
  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  assert.ifError(created.error);
  const userId = created.data.user.id;

  const activated = await service
    .from('users')
    .update({ account_status: 'active', onboarding_status: 'completed' })
    .eq('id', userId);
  assert.ifError(activated.error);

  const profile = await service.from('profiles').insert({
    user_id: userId,
    nickname: `Plan Pair ${label}`,
    age_range: '25-34',
    gender: 'prefer_not_to_say',
    avatar_url: '',
    tags: ['散歩'],
    profile_status: 'active',
  });
  assert.ifError(profile.error);

  const authenticated = client(config.url, config.anonKey);
  assert.ifError((await authenticated.auth.signInWithPassword({ email, password })).error);
  return { authenticated, userId };
}

function plan({ planId, userId, activityType, day, time, latitude, longitude, placeName = 'integration area' }) {
  return {
    fixed_plan_id: planId,
    user_id: userId,
    activity_type: activityType,
    custom_activity_name: activityType === 'other' ? '自由活動' : null,
    days_of_week: [day],
    start_time: time,
    place_id: null,
    place_name: placeName,
    latitude,
    longitude,
    plan_status: 'active',
  };
}

async function recommendationFor(authenticated, myPlanId, candidateId) {
  const result = await authenticated.rpc('get_discover_recommendations', {
    p_my_plan_id: myPlanId,
  });
  assert.ifError(result.error);
  return result.data.find((item) => item.candidateId === candidateId) ?? null;
}

test('local fixed-plan invitation rejects spoofing and preserves the exact pair after acceptance', {
  skip: !integrationEnabled,
}, async (context) => {
  const config = localConfiguration();
  const sender = client(config.url, config.anonKey);
  const receiver = client(config.url, config.anonKey);
  const service = client(config.url, config.serviceRoleKey);
  let cleanupInvitationId = null;
  let cleanupConversationId = null;

  assert.ifError((await sender.auth.signInWithPassword({
    email: 'figma.demo@tomoni.local',
    password: 'TomoniDemo!2026',
  })).error);

  const senderPlanId = crypto.randomUUID();
  const receiverId = '10000000-0000-4000-8000-000000000007';
  const receiverPlanId = crypto.randomUUID();

  context.after(async () => {
    if (cleanupConversationId) {
      await service.from('conversation_members').delete().eq('conversation_id', cleanupConversationId);
      await service.from('conversations').delete().eq('conversation_id', cleanupConversationId);
    }
    if (cleanupInvitationId) {
      await service.from('invitations').delete().eq('invitation_id', cleanupInvitationId);
    }
    await service.from('fixed_plans').delete().in('fixed_plan_id', [senderPlanId, receiverPlanId]);
  });

  assert.ifError((await service.from('fixed_plans').insert([
    plan({
      planId: senderPlanId,
      userId: '10000000-0000-4000-8000-000000000001',
      activityType: 'walking',
      day: 'tue',
      time: '09:30',
      placeName: '西葛西',
      latitude: 35.6659,
      longitude: 139.8593,
    }),
    plan({
      planId: receiverPlanId,
      userId: receiverId,
      activityType: 'walking',
      day: 'tue',
      time: '09:00',
      placeName: '船堀',
      latitude: 35.6837,
      longitude: 139.8643,
    }),
  ])).error);

  const spoofed = await sender.rpc('create_fixed_schedule_invitation', {
    p_fixed_plan_id: senderPlanId,
    p_receiver_id: receiverId,
    p_receiver_fixed_plan_id: '20000000-0000-4000-8000-000000000003',
  });
  assert.ok(spoofed.error);

  const first = await sender.rpc('create_fixed_schedule_invitation', {
    p_fixed_plan_id: senderPlanId,
    p_receiver_id: receiverId,
    p_receiver_fixed_plan_id: receiverPlanId,
  });
  assert.ifError(first.error);
  cleanupInvitationId = first.data.invitation_id;
  cleanupConversationId = first.data.conversation_id;
  const second = await sender.rpc('create_fixed_schedule_invitation', {
    p_fixed_plan_id: senderPlanId,
    p_receiver_id: receiverId,
    p_receiver_fixed_plan_id: receiverPlanId,
  });
  assert.ifError(second.error);
  assert.equal(second.data.invitation_id, first.data.invitation_id);

  const beforeAcceptance = await service
    .from('invitation_plan_pairs')
    .select('invitation_id,sender_fixed_plan_id,receiver_fixed_plan_id,suggested_public_place_id')
    .eq('invitation_id', first.data.invitation_id);
  assert.ifError(beforeAcceptance.error);
  assert.equal(beforeAcceptance.data.length, 1);
  assert.equal(beforeAcceptance.data[0].sender_fixed_plan_id, senderPlanId);
  assert.equal(beforeAcceptance.data[0].receiver_fixed_plan_id, receiverPlanId);
  assert.ok(beforeAcceptance.data[0].suggested_public_place_id);

  const recommended = await sender.rpc('recommend_walking_public_place', {
    p_sender_latitude: 35.6659,
    p_sender_longitude: 139.8593,
    p_receiver_latitude: 35.6837,
    p_receiver_longitude: 139.8643,
  });
  assert.ifError(recommended.error);
  assert.equal(recommended.data.length, 1);
  assert.equal(
    beforeAcceptance.data[0].suggested_public_place_id,
    recommended.data[0].public_place_id,
  );
  assert.ok(recommended.data[0].sender_distance_meters <= 3200);
  assert.ok(recommended.data[0].receiver_distance_meters <= 3200);

  const ichinoeShinozaki = await sender.rpc('recommend_walking_public_place', {
    p_sender_latitude: 35.6862,
    p_sender_longitude: 139.8827,
    p_receiver_latitude: 35.7069,
    p_receiver_longitude: 139.9036,
  });
  assert.ifError(ichinoeShinozaki.error);
  assert.equal(ichinoeShinozaki.data.length, 1);
  assert.equal(ichinoeShinozaki.data[0].name, '篠崎公園');
  assert.ok(ichinoeShinozaki.data[0].sender_distance_meters <= 3200);
  assert.ok(ichinoeShinozaki.data[0].receiver_distance_meters <= 3200);

  assert.ifError((await receiver.auth.signInWithPassword({
    email: 'figma.aoi@tomoni.local',
    password: 'TomoniDemo!2026',
  })).error);
  const invitationBeforeAccept = await service
    .from('invitations')
    .select('invitation_status')
    .eq('invitation_id', first.data.invitation_id)
    .single();
  assert.ifError(invitationBeforeAccept.error);
  if (invitationBeforeAccept.data.invitation_status === 'pending') {
    const accepted = await receiver.rpc('accept_fixed_schedule_invitation', {
      p_invitation_id: first.data.invitation_id,
    });
    assert.ifError(accepted.error);
  } else {
    assert.equal(invitationBeforeAccept.data.invitation_status, 'accepted');
  }

  const afterAcceptance = await service
    .from('invitation_plan_pairs')
    .select('invitation_id,sender_fixed_plan_id,receiver_fixed_plan_id,suggested_public_place_id,invitations!inner(invitation_status)')
    .eq('invitation_id', first.data.invitation_id)
    .single();
  assert.ifError(afterAcceptance.error);
  assert.equal(afterAcceptance.data.invitations.invitation_status, 'accepted');
  assert.equal(afterAcceptance.data.sender_fixed_plan_id, senderPlanId);
  assert.equal(afterAcceptance.data.receiver_fixed_plan_id, receiverPlanId);
  assert.equal(
    afterAcceptance.data.suggested_public_place_id,
    beforeAcceptance.data[0].suggested_public_place_id,
  );

  const acceptedPlace = await receiver
    .rpc('get_fixed_plan_invitation_suggested_place', {
      p_invitation_id: first.data.invitation_id,
    })
    .single();
  assert.ifError(acceptedPlace.error);
  assert.equal(
    acceptedPlace.data.suggested_public_place_id,
    beforeAcceptance.data[0].suggested_public_place_id,
  );
  assert.equal(acceptedPlace.data.sender_area_name, '西葛西');
  assert.equal(acceptedPlace.data.receiver_area_name, '船堀');

  const repeated = await sender.rpc('create_fixed_schedule_invitation', {
    p_fixed_plan_id: senderPlanId,
    p_receiver_id: receiverId,
    p_receiver_fixed_plan_id: receiverPlanId,
  });
  assert.ok(repeated.error);
  assert.match(repeated.error.message, /accepted/iu);

  assert.ifError((await service
    .from('conversation_members')
    .delete()
    .eq('conversation_id', first.data.conversation_id)).error);
  assert.ifError((await service
    .from('conversations')
    .delete()
    .eq('conversation_id', first.data.conversation_id)).error);
  assert.ifError((await service
    .from('invitations')
    .delete()
    .eq('invitation_id', first.data.invitation_id)).error);
  assert.ifError((await service
    .from('fixed_plans')
    .delete()
    .in('fixed_plan_id', [senderPlanId, receiverPlanId])).error);

  const allPairs = await service
    .from('invitation_plan_pairs')
    .select('invitations!inner(invitation_type)');
  assert.ifError(allPairs.error);
  assert.ok(allPairs.data.every((pair) => pair.invitations.invitation_type === 'fixed_plan'));
});

test('local matching uses distance-or-time, ignores connections, and excludes only the canonical plan pair', {
  skip: !integrationEnabled,
}, async () => {
  const config = localConfiguration();
  const service = client(config.url, config.serviceRoleKey);
  let userA = null;
  let userB = null;

  try {
    userA = await createIntegrationUser(config, service, 'a');
    userB = await createIntegrationUser(config, service, 'b');

    const ids = {
      closeFarTimeA: crypto.randomUUID(),
      closeFarTimeB: crypto.randomUUID(),
      farCloseTimeA: crypto.randomUUID(),
      farCloseTimeB: crypto.randomUUID(),
      bothFailA: crypto.randomUUID(),
      bothFailB: crypto.randomUUID(),
      eventA: crypto.randomUUID(),
      eventB: crypto.randomUUID(),
      acceptedA: crypto.randomUUID(),
      acceptedB: crypto.randomUUID(),
      declinedA: crypto.randomUUID(),
      declinedB: crypto.randomUUID(),
      differentA: crypto.randomUUID(),
      differentB: crypto.randomUUID(),
      raceA: crypto.randomUUID(),
      raceB: crypto.randomUUID(),
    };
    const nearA = { latitude: 35.6659, longitude: 139.8593 };
    const nearB = { latitude: 35.6660, longitude: 139.8594 };
    const farB = { latitude: 35.7330, longitude: 139.8817 };
    const isolatedA = { latitude: 34.0000, longitude: 138.0000 };
    const isolatedB = { latitude: 34.0400, longitude: 138.0400 };

    const plans = [
      plan({ planId: ids.closeFarTimeA, userId: userA.userId, activityType: 'walking', day: 'mon', time: '09:00', ...nearA }),
      plan({ planId: ids.closeFarTimeB, userId: userB.userId, activityType: 'walking', day: 'mon', time: '14:00', ...nearB }),
      plan({ planId: ids.farCloseTimeA, userId: userA.userId, activityType: 'sports', day: 'tue', time: '10:00', ...isolatedA }),
      plan({ planId: ids.farCloseTimeB, userId: userB.userId, activityType: 'sports', day: 'tue', time: '10:00', ...isolatedB }),
      plan({ planId: ids.bothFailA, userId: userA.userId, activityType: 'study_reading', day: 'wed', time: '08:00', ...nearA }),
      plan({ planId: ids.bothFailB, userId: userB.userId, activityType: 'study_reading', day: 'wed', time: '14:00', ...farB }),
      plan({ planId: ids.eventA, userId: userA.userId, activityType: 'event', day: 'thu', time: '08:00', ...isolatedA }),
      plan({ planId: ids.eventB, userId: userB.userId, activityType: 'event', day: 'thu', time: '18:00', ...isolatedB }),
      plan({ planId: ids.acceptedA, userId: userA.userId, activityType: 'other', day: 'fri', time: '09:00', ...nearA }),
      plan({ planId: ids.acceptedB, userId: userB.userId, activityType: 'other', day: 'fri', time: '09:00', ...nearB }),
      plan({ planId: ids.declinedA, userId: userA.userId, activityType: 'dog_walking', day: 'sun', time: '07:00', ...nearA }),
      plan({ planId: ids.declinedB, userId: userB.userId, activityType: 'dog_walking', day: 'sun', time: '07:00', ...nearB }),
      plan({ planId: ids.differentA, userId: userA.userId, activityType: 'other', day: 'sat', time: '11:00', ...nearA }),
      plan({ planId: ids.differentB, userId: userB.userId, activityType: 'other', day: 'sat', time: '11:00', ...nearB }),
      plan({ planId: ids.raceA, userId: userA.userId, activityType: 'event', day: 'mon', time: '07:00', ...nearA }),
      plan({ planId: ids.raceB, userId: userB.userId, activityType: 'event', day: 'mon', time: '20:00', ...farB }),
    ];
    assert.ifError((await service.from('fixed_plans').insert(plans)).error);

    const [userAId, userBId] = [userA.userId, userB.userId].sort();
    const connectionId = crypto.randomUUID();
    assert.ifError((await service.from('connections').insert({
      connection_id: connectionId,
      user_a_id: userAId,
      user_b_id: userBId,
      connection_status: 'active',
    })).error);

    const closeFarTime = await recommendationFor(
      userA.authenticated,
      ids.closeFarTimeA,
      userB.userId,
    );
    assert.ok(closeFarTime, 'Close location + far time must match.');
    assert.equal(closeFarTime.match.candidatePlanId, ids.closeFarTimeB);
    assert.ok(closeFarTime.match.distanceKm <= 3);
    assert.ok(closeFarTime.match.timeDifferenceMinutes > 90);

    const farCloseTime = await recommendationFor(
      userA.authenticated,
      ids.farCloseTimeA,
      userB.userId,
    );
    assert.ok(farCloseTime, 'Far location + close time must match.');
    assert.equal(farCloseTime.match.candidatePlanId, ids.farCloseTimeB);
    assert.ok(farCloseTime.match.distanceKm > 3);
    assert.ok(farCloseTime.match.timeDifferenceMinutes <= 90);

    assert.equal(
      await recommendationFor(userA.authenticated, ids.bothFailA, userB.userId),
      null,
      'A pair that fails both distance and time must not match.',
    );

    const eventMatch = await recommendationFor(userA.authenticated, ids.eventA, userB.userId);
    assert.ok(eventMatch, 'Event plans must not use user-to-user distance or clock time as hard filters.');
    assert.equal(eventMatch.match.candidatePlanId, ids.eventB);
    assert.ok(eventMatch.match.distanceKm > 3);

    const accepted = await userA.authenticated.rpc('create_fixed_schedule_invitation', {
      p_fixed_plan_id: ids.acceptedA,
      p_receiver_id: userB.userId,
      p_receiver_fixed_plan_id: ids.acceptedB,
    });
    assert.ifError(accepted.error);
    assert.ifError((await userB.authenticated.rpc('accept_fixed_schedule_invitation', {
      p_invitation_id: accepted.data.invitation_id,
    })).error);
    assert.equal(
      await recommendationFor(userA.authenticated, ids.acceptedA, userB.userId),
      null,
      'An accepted exact plan pair must be excluded.',
    );

    const acceptedRepeat = await userB.authenticated.rpc('create_fixed_schedule_invitation', {
      p_fixed_plan_id: ids.acceptedB,
      p_receiver_id: userA.userId,
      p_receiver_fixed_plan_id: ids.acceptedA,
    });
    assert.ok(acceptedRepeat.error);
    assert.match(acceptedRepeat.error.message, /accepted/iu);

    const declined = await userA.authenticated.rpc('create_fixed_schedule_invitation', {
      p_fixed_plan_id: ids.declinedA,
      p_receiver_id: userB.userId,
      p_receiver_fixed_plan_id: ids.declinedB,
    });
    assert.ifError(declined.error);
    assert.ifError((await userB.authenticated.rpc('decline_fixed_schedule_invitation', {
      p_invitation_id: declined.data.invitation_id,
    })).error);
    assert.equal(
      await recommendationFor(userA.authenticated, ids.declinedA, userB.userId),
      null,
      'A declined exact plan pair must be excluded.',
    );

    const differentPair = await recommendationFor(
      userA.authenticated,
      ids.differentA,
      userB.userId,
    );
    assert.ok(differentPair, 'The same connected users must remain eligible through different plans.');
    assert.equal(differentPair.match.candidatePlanId, ids.differentB);

    const [forward, reverse] = await Promise.all([
      userA.authenticated.rpc('create_fixed_schedule_invitation', {
        p_fixed_plan_id: ids.raceA,
        p_receiver_id: userB.userId,
        p_receiver_fixed_plan_id: ids.raceB,
      }),
      userB.authenticated.rpc('create_fixed_schedule_invitation', {
        p_fixed_plan_id: ids.raceB,
        p_receiver_id: userA.userId,
        p_receiver_fixed_plan_id: ids.raceA,
      }),
    ]);
    assert.ifError(forward.error);
    assert.ifError(reverse.error);
    assert.equal(reverse.data.invitation_id, forward.data.invitation_id);

    const reciprocalPairs = await service
      .from('invitation_plan_pairs')
      .select('invitation_id,sender_fixed_plan_id,receiver_fixed_plan_id')
      .in('sender_fixed_plan_id', [ids.raceA, ids.raceB])
      .in('receiver_fixed_plan_id', [ids.raceA, ids.raceB]);
    assert.ifError(reciprocalPairs.error);
    assert.equal(reciprocalPairs.data.length, 1);
    assert.equal(reciprocalPairs.data[0].invitation_id, forward.data.invitation_id);
  } finally {
    if (userA?.userId) {
      await service.auth.admin.deleteUser(userA.userId);
    }
    if (userB?.userId) {
      await service.auth.admin.deleteUser(userB.userId);
    }
  }
});

test('dog walking uses parks, study and reading uses libraries, sports uses facilities, and no-candidate plans stay nullable', {
  skip: !integrationEnabled,
}, async () => {
  const config = localConfiguration();
  const sender = client(config.url, config.anonKey);
  const service = client(config.url, config.serviceRoleKey);
  assert.ifError((await sender.auth.signInWithPassword({
    email: 'figma.demo@tomoni.local',
    password: 'TomoniDemo!2026',
  })).error);

  const cases = [
    {
      label: 'study-reading',
      activityType: 'study_reading',
      receiverId: '10000000-0000-4000-8000-000000000010',
      senderLatitude: 35.6659,
      senderLongitude: 139.8593,
      receiverLatitude: 35.6635,
      receiverLongitude: 139.8726,
      expectsSuggestedPlace: true,
      expectedCategory: 'library',
    },
    {
      label: 'dog-walking',
      activityType: 'dog_walking',
      receiverId: '10000000-0000-4000-8000-000000000012',
      senderLatitude: 35.6659,
      senderLongitude: 139.8593,
      receiverLatitude: 35.6837,
      receiverLongitude: 139.8643,
      expectsSuggestedPlace: true,
      expectedCategory: 'park',
    },
    {
      label: 'sports',
      activityType: 'sports',
      receiverId: '10000000-0000-4000-8000-000000000013',
      senderLatitude: 35.6659,
      senderLongitude: 139.8593,
      receiverLatitude: 35.6679,
      receiverLongitude: 139.8625,
      expectsSuggestedPlace: true,
      expectedCategory: 'sports_facility',
    },
    {
      label: 'no-candidate',
      activityType: 'walking',
      receiverId: '10000000-0000-4000-8000-000000000011',
      senderLatitude: 0,
      senderLongitude: 0,
      receiverLatitude: 0,
      receiverLongitude: 0,
      expectsSuggestedPlace: false,
      expectedCategory: null,
    },
  ];

  for (const scenario of cases) {
    const senderPlanId = crypto.randomUUID();
    const receiverPlanId = crypto.randomUUID();
    let conversationId = null;
    let invitationId = null;

    try {
      const plans = await service.from('fixed_plans').insert([
        {
          fixed_plan_id: senderPlanId,
          user_id: '10000000-0000-4000-8000-000000000001',
          activity_type: scenario.activityType,
          custom_activity_name: null,
          days_of_week: ['sat'],
          start_time: '14:00',
          place_id: null,
          place_name: 'integration sender area',
          latitude: scenario.senderLatitude,
          longitude: scenario.senderLongitude,
          plan_status: 'active',
        },
        {
          fixed_plan_id: receiverPlanId,
          user_id: scenario.receiverId,
          activity_type: scenario.activityType,
          custom_activity_name: null,
          days_of_week: ['sat'],
          start_time: '14:00',
          place_id: null,
          place_name: 'integration receiver area',
          latitude: scenario.receiverLatitude,
          longitude: scenario.receiverLongitude,
          plan_status: 'active',
        },
      ]);
      assert.ifError(plans.error);

      const created = await sender.rpc('create_fixed_schedule_invitation', {
        p_fixed_plan_id: senderPlanId,
        p_receiver_id: scenario.receiverId,
        p_receiver_fixed_plan_id: receiverPlanId,
      });
      assert.ifError(created.error);
      conversationId = created.data.conversation_id;
      invitationId = created.data.invitation_id;

      const pair = await service
        .from('invitation_plan_pairs')
        .select('suggested_public_place_id')
        .eq('invitation_id', invitationId)
        .single();
      assert.ifError(pair.error);
      if (scenario.expectsSuggestedPlace) {
        assert.ok(pair.data.suggested_public_place_id, scenario.label);
        const suggestedPlace = await service
          .from('public_places')
          .select('category')
          .eq('public_place_id', pair.data.suggested_public_place_id)
          .single();
        assert.ifError(suggestedPlace.error);
        assert.equal(suggestedPlace.data.category, scenario.expectedCategory, scenario.label);
      } else {
        assert.equal(pair.data.suggested_public_place_id, null, scenario.label);
      }
    } finally {
      if (conversationId) {
        assert.ifError((await service.from('conversation_members').delete().eq('conversation_id', conversationId)).error);
        assert.ifError((await service.from('conversations').delete().eq('conversation_id', conversationId)).error);
      }
      if (invitationId) {
        assert.ifError((await service.from('invitations').delete().eq('invitation_id', invitationId)).error);
      }
      assert.ifError((await service.from('fixed_plans').delete().in('fixed_plan_id', [senderPlanId, receiverPlanId])).error);
    }
  }
});

test('either participant can cancel an accepted fixed-plan companion schedule without deleting its history', {
  skip: !integrationEnabled,
}, async () => {
  const config = localConfiguration();
  const sender = client(config.url, config.anonKey);
  const receiver = client(config.url, config.anonKey);
  const service = client(config.url, config.serviceRoleKey);
  const senderPlanId = crypto.randomUUID();
  const receiverPlanId = crypto.randomUUID();
  let invitationId = null;
  let conversationId = null;

  try {
    assert.ifError((await sender.auth.signInWithPassword({
      email: 'figma.demo@tomoni.local',
      password: 'TomoniDemo!2026',
    })).error);
    assert.ifError((await receiver.auth.signInWithPassword({
      email: 'figma.aoi@tomoni.local',
      password: 'TomoniDemo!2026',
    })).error);

    assert.ifError((await service.from('fixed_plans').insert([
      {
        fixed_plan_id: senderPlanId,
        user_id: '10000000-0000-4000-8000-000000000001',
        activity_type: 'walking',
        days_of_week: ['tue'],
        start_time: '09:30',
        place_name: '西葛西',
        latitude: 35.6659,
        longitude: 139.8593,
        plan_status: 'active',
      },
      {
        fixed_plan_id: receiverPlanId,
        user_id: '10000000-0000-4000-8000-000000000007',
        activity_type: 'walking',
        days_of_week: ['tue'],
        start_time: '09:30',
        place_name: '船堀',
        latitude: 35.6837,
        longitude: 139.8643,
        plan_status: 'active',
      },
    ])).error);

    const created = await sender.rpc('create_fixed_schedule_invitation', {
      p_fixed_plan_id: senderPlanId,
      p_receiver_id: '10000000-0000-4000-8000-000000000007',
      p_receiver_fixed_plan_id: receiverPlanId,
    });
    assert.ifError(created.error);
    invitationId = created.data.invitation_id;
    conversationId = created.data.conversation_id;

    assert.ifError((await receiver.rpc('accept_fixed_schedule_invitation', {
      p_invitation_id: invitationId,
    })).error);

    const cancelled = await receiver.rpc('cancel_fixed_schedule_invitation', {
      p_invitation_id: invitationId,
    });
    assert.ifError(cancelled.error);
    assert.equal(cancelled.data.previous_status, 'accepted');
    assert.equal(cancelled.data.cancelled_by_user_id, '10000000-0000-4000-8000-000000000007');

    const invitation = await service
      .from('invitations')
      .select('invitation_status,cancelled_by_user_id')
      .eq('invitation_id', invitationId)
      .single();
    assert.ifError(invitation.error);
    assert.equal(invitation.data.invitation_status, 'cancelled');
    assert.equal(invitation.data.cancelled_by_user_id, '10000000-0000-4000-8000-000000000007');

    const conversation = await service
      .from('conversations')
      .select('conversation_status')
      .eq('conversation_id', conversationId)
      .single();
    assert.ifError(conversation.error);
    assert.equal(conversation.data.conversation_status, 'closed');

    const retainedPair = await service
      .from('invitation_plan_pairs')
      .select('invitation_id')
      .eq('invitation_id', invitationId)
      .single();
    assert.ifError(retainedPair.error);
    assert.equal(retainedPair.data.invitation_id, invitationId);
  } finally {
    if (conversationId) {
      await service.from('conversation_members').delete().eq('conversation_id', conversationId);
      await service.from('conversations').delete().eq('conversation_id', conversationId);
    }
    if (invitationId) {
      await service.from('invitations').delete().eq('invitation_id', invitationId);
    }
    await service.from('fixed_plans').delete().in('fixed_plan_id', [senderPlanId, receiverPlanId]);
  }
});
