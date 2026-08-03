# Domain Model

## 1. User

账号主体。

```text
id
accountStatus
onboardingStatus
createdAt
updatedAt
```

## 2. Profile

```text
userId
nickname
avatarUrl
ageRange
gender
languages
bio
```

## 3. Location

```text
id
name
district
locationType
latitude
longitude
visibilityLevel
```

## 4. FixedSchedule

```text
id
userId
activityType
daysOfWeek
timeSlot
locationId
status
createdAt
updatedAt
deletedAt
```

## 5. Recommendation

```text
id
sourceUserId
targetUserId
sourceScheduleId
score
reasons
status
generatedAt
expiresAt
```

## 6. Conversation

```text
id
participantAId
participantBId
status
createdAt
updatedAt
```

## 7. Message

```text
id
conversationId
senderId
messageType
content
referenceId
sendStatus
createdAt
```

当 `messageType = invitation` 时，`referenceId` 指向 Invitation。

## 8. Invitation

```text
id
senderId
receiverId
fixedScheduleId
activityType
date
startTime
endTime
proposedLocationId
note
status
expiresAt
createdAt
updatedAt
```

## 9. Meetup

```text
id
invitationId
activityType
date
startTime
endTime
meetingLocationId
status
cancelledAt
cancelledBy
cancellationReason
createdAt
updatedAt
```

## 10. Notification

```text
id
userId
type
targetType
targetId
readAt
createdAt
```

## 11. Block

```text
id
blockerId
blockedUserId
createdAt
```

## 12. Report

```text
id
reporterId
reportedUserId
reason
description
status
createdAt
resolvedAt
```

## 13. 核心关系

```text
User
├── Profile
├── FixedSchedules
├── Conversations
├── Invitations
├── Meetups
├── Notifications
├── Blocks
└── Reports

Conversation
└── Messages

FixedSchedule
└── Recommendations

Invitation
└── Meetup
```

## 14. 不得混淆

- FixedSchedule：长期生活习惯
- Invitation：针对某一人的一次具体提议
- Meetup：Invitation 被接受后的正式同行活动
