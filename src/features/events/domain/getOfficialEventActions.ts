interface OfficialEventActionInput {
  officialUrl: string | null;
  registrationUrl: string | null;
  registrationRequired: boolean;
  registrationStatus: string | null;
  registrationDeadline: string | null;
}

export interface OfficialEventActions {
  officialSiteUrl: string | null;
  registrationAction: {
    label: string;
    url: string | null;
    disabled: boolean;
  } | null;
}

export function getOfficialEventActions(
  input: OfficialEventActionInput,
  now = new Date(),
): OfficialEventActions {
  const officialSiteUrl = input.officialUrl || input.registrationUrl;
  const deadlinePassed = Boolean(
    input.registrationDeadline && new Date(input.registrationDeadline) < now,
  );

  if (!input.registrationRequired || input.registrationStatus === 'not_required') {
    return {
      officialSiteUrl,
      registrationAction: input.officialUrl
        ? { label: '公式サイトを見る', url: input.officialUrl, disabled: false }
        : null,
    };
  }

  if (
    input.registrationStatus === 'closed' ||
    input.registrationStatus === 'full' ||
    deadlinePassed
  ) {
    return {
      officialSiteUrl,
      registrationAction: { label: '受付終了', url: null, disabled: true },
    };
  }

  if (input.registrationStatus === 'not_started') {
    return {
      officialSiteUrl,
      registrationAction: { label: '受付前', url: null, disabled: true },
    };
  }

  if (input.registrationStatus === 'open' && input.registrationUrl) {
    return {
      officialSiteUrl,
      registrationAction: {
        label: '公式サイトで申し込む',
        url: input.registrationUrl,
        disabled: false,
      },
    };
  }

  return {
    officialSiteUrl,
    registrationAction: input.officialUrl
      ? { label: '公式サイトを見る', url: input.officialUrl, disabled: false }
      : null,
  };
}
