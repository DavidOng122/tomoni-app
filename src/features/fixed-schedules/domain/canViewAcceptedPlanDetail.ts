interface AcceptedPlanDetailAccess {
  conversationStatus: string;
  invitationStatus: string | null;
  isActiveMember: boolean;
  hasFixedPlan: boolean;
}

export function canViewAcceptedPlanDetail({
  conversationStatus,
  invitationStatus,
  isActiveMember,
  hasFixedPlan,
}: AcceptedPlanDetailAccess) {
  return conversationStatus === 'active'
    && invitationStatus === 'accepted'
    && isActiveMember
    && hasFixedPlan;
}
