export type CsvSourceRow = Record<string, string>;

export interface ParsedCsvSource {
  headers: string[];
  unknownHeaders: string[];
  rows: CsvSourceRow[];
}

export interface EdogawaMapPlace {
  recordNumber: number;
  name: string;
  description: string | null;
  postalCode: string | null;
  address: string | null;
  officialUrl: string | null;
  imageUrl: string | null;
  phone: string | null;
  fax: string | null;
  latitudeText: string | null;
  longitudeText: string | null;
}

export interface EdogawaStandardPlace {
  recordNumber: number;
  row: CsvSourceRow;
  name: string;
  address: string | null;
}

export interface ParsedEdogawaMapSource {
  places: EdogawaMapPlace[];
  headers: string[];
  unknownHeaders: string[];
}

export interface ParsedEdogawaStandardSource {
  places: EdogawaStandardPlace[];
  headers: string[];
  unknownHeaders: string[];
}

export interface EdogawaSportsPageIdentity {
  sourceUrl: string;
  pageId: string | null;
}

export interface EdogawaWalkingPlaceSource {
  recordNumber: number;
  name: string;
  description: string | null;
  address: string | null;
  officialUrl: string | null;
  imageUrls: string[];
  latitudeText: string | null;
  longitudeText: string | null;
}

export interface ParsedEdogawaWalkingPlaceSource {
  places: EdogawaWalkingPlaceSource[];
  headers: string[];
  unknownHeaders: string[];
}
