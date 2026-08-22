export interface EdogawaRegistrationLink {
  label: string;
  url: string;
}

export interface ParsedEdogawaEventPage {
  sourceUrl: string;
  sourceEventId: string | null;
  embeddedPageIds: string[];
  updatedAtText: string | null;
  titleText: string | null;
  descriptionText: string | null;
  dateTimeItems: string[];
  dateTimeNotes: string[];
  placeText: string | null;
  addressText: string | null;
  organizerText: string | null;
  capacityText: string | null;
  registrationRequiredText: string | null;
  registrationPeriodText: string | null;
  registrationMethodText: string | null;
  registrationLinks: EdogawaRegistrationLink[];
  explicitStatusNotices: string[];
}

export type EdogawaPageParseErrorCode =
  | "unsupported_page_format"
  | "mismatched_page_ids";

export type EdogawaPageParseResult =
  | {
      kind: "parsed";
      page: ParsedEdogawaEventPage;
    }
  | {
      kind: "parse_error";
      code: EdogawaPageParseErrorCode;
      message: string;
      sourceUrl: string;
    };

export interface DiscoveredEdogawaEventPage {
  url: string;
  linkText: string;
}
