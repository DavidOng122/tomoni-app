export interface FigmaSentInvitation {
  id: string;
  name: string;
  category: string;
  date: string;
  status: string;
  avatar: string;
  response: 'waiting' | 'accepted' | 'declined';
}

const STORAGE_KEY = 'tomoni:figma-sent-invitations';
const UPDATE_EVENT = 'tomoni:figma-sent-invitations-updated';
const EMPTY_SNAPSHOT = '[]';

export const getFigmaSentInvitationSnapshot = () => {
  if (typeof window === 'undefined') return EMPTY_SNAPSHOT;
  return window.sessionStorage.getItem(STORAGE_KEY) || EMPTY_SNAPSHOT;
};

export const getFigmaSentInvitationServerSnapshot = () => EMPTY_SNAPSHOT;

export const parseFigmaSentInvitations = (snapshot: string): FigmaSentInvitation[] => {
  try {
    const invitations = JSON.parse(snapshot);
    return Array.isArray(invitations) ? invitations : [];
  } catch {
    return [];
  }
};

export const subscribeToFigmaSentInvitations = (listener: () => void) => {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener(UPDATE_EVENT, listener);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(UPDATE_EVENT, listener);
  };
};

export const saveFigmaSentInvitation = (invitation: FigmaSentInvitation) => {
  if (typeof window === 'undefined') return;

  const existing = parseFigmaSentInvitations(getFigmaSentInvitationSnapshot());
  const next = [invitation, ...existing.filter((item) => item.id !== invitation.id)];
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(UPDATE_EVENT));
};

export const updateFigmaSentInvitationResponse = (
  invitationId: string,
  response: FigmaSentInvitation['response'],
) => {
  if (typeof window === 'undefined') return;

  const existing = parseFigmaSentInvitations(getFigmaSentInvitationSnapshot());
  const next = existing.map((invitation) =>
    invitation.id === invitationId
      ? {
          ...invitation,
          response,
          status:
            response === 'accepted'
              ? '同行予定'
              : response === 'declined'
                ? '見送り'
                : '返事待ち',
        }
      : invitation,
  );
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(UPDATE_EVENT));
};
