export interface EdogawaFleaMarketSourceRow {
  recordNumber: number;
  eventName: string;
  dateText: string;
  marketType: string;
  venueName: string;
  timeText: string;
  contactText: string | null;
}

export interface ParsedEdogawaFleaMarketSchedule {
  sourceUrl: string;
  pageId: string | null;
  updatedAtText: string | null;
  fiscalYearText: string | null;
  rows: EdogawaFleaMarketSourceRow[];
}
