export type Locale = 'en' | 'ru';
export type BilingualText = Partial<Record<Locale, string>>;
export type Compensation = Record<string, unknown>;

export interface RawLink {
  name: string;
  url: string;
  description?: string;
}

export interface RawProfile {
  network: string;
  username: string;
  url: string;
  [key: string]: unknown;
}

export interface RawRolePeriod {
  startDate: string;
  endDate: string;
  position: string;
}

export interface RawEmployerPeriod {
  startDate: string;
  endDate: string;
  name: string;
}

export interface RawJob {
  name: string;
  position: string;
  startDate: string;
  endDate?: string;
  summary: string;
  highlights?: string[];
  url?: string;
  'x-id': string;
  'x-factIds': string[];
  'x-technologies'?: string[];
  'x-tips'?: string[];
  'x-rolePeriods'?: RawRolePeriod[];
  'x-employerPeriods'?: RawEmployerPeriod[];
  [key: string]: unknown;
}

export interface RawFact {
  id: string;
  employmentId: string;
  text: string;
  [key: string]: unknown;
}

export interface RawProject {
  name: string;
  description: string;
  url: string;
  keywords?: string[];
  roles?: string[];
  'x-id': string;
  'x-status'?: string;
  'x-releaseDate'?: string;
  'x-statusAsOf'?: string;
  'x-links'?: RawLink[];
}

export interface RawPublication {
  name: string;
  publisher: string;
  releaseDate: string;
  url: string;
  summary: string;
  'x-id': string;
}

export interface RawSkill {
  name: string;
  keywords?: string[];
  'x-id': string;
}

export interface RawLanguage {
  language: string;
  fluency: string;
  'x-id': string;
}

export interface RawInterest {
  name: string;
}

export interface RawWorkTranslation {
  name?: string;
  position?: string;
  summary?: string;
  rolePeriods?: Array<{ position?: string }>;
  employerPeriods?: Array<{ name?: string }>;
}

export interface RawLocalization {
  basics?: {
    name?: string;
    label?: string;
    summary?: string;
    location?: { city?: string };
  };
  work?: Record<string, RawWorkTranslation>;
  facts?: Record<string, string>;
  projects?: Record<string, { description?: string; roles?: string[] }>;
  publications?: Record<string, { summary?: string }>;
  skills?: Record<string, { name?: string }>;
  languages?: Record<string, { language?: string; fluency?: string }>;
  preferences?: {
    targetMarket?: string;
    compensation?: Compensation;
  };
}

export interface RawResumeData {
  meta: {
    version: string;
    lastModified?: string;
  };
  basics: {
    name: string;
    label: string;
    email: string;
    summary: string;
    location?: { city?: string; countryCode?: string };
    profiles?: RawProfile[];
    'x-secondaryEmail'?: string;
    'x-about'?: string[];
    'x-resumeFooter'?: string;
  };
  work: RawJob[];
  projects: RawProject[];
  publications: RawPublication[];
  skills: RawSkill[];
  languages?: RawLanguage[];
  interests?: RawInterest[];
  'x-facts': RawFact[];
  'x-localizations'?: { ru?: RawLocalization };
  'x-preferences'?: {
    remoteOnly?: boolean;
    openToInternationalRelocation?: boolean;
    targetMarket?: string;
    compensation?: Compensation;
  };
}

export interface InternalRolePeriod extends Omit<RawRolePeriod, 'position'> {
  position: BilingualText;
}

export interface InternalEmployerPeriod extends Omit<
  RawEmployerPeriod,
  'name'
> {
  name: BilingualText;
}

export interface InternalEmployment {
  id: string;
  name: BilingualText;
  position: BilingualText;
  startDate: string;
  endDate?: string;
  url?: string;
  summary: BilingualText;
  skills: string[];
  tips: string[];
  factIds: string[];
  skillExposure?: Array<{ skill: string }>;
  rolePeriods?: InternalRolePeriod[];
  employerPeriods?: InternalEmployerPeriod[];
}

export interface InternalFact {
  id: string;
  employmentId: string;
  text: BilingualText;
  [key: string]: unknown;
}

export interface InternalResumeData {
  schemaVersion: string;
  updatedAt: string;
  profile: {
    name: BilingualText;
    headline: BilingualText;
    email: string;
    secondaryEmail?: string;
    profiles: RawProfile[];
    about: string[];
    resumeFooter?: string;
    location: {
      city: BilingualText;
      countryCode?: string;
    };
    summary: BilingualText;
    languages: Array<{
      language: BilingualText;
      fluency: BilingualText;
    }>;
    learning?: BilingualText;
  };
  interests: RawInterest[];
  preferences: {
    remoteOnly?: boolean;
    openToInternationalRelocation?: boolean;
    markets: BilingualText;
    compensation: Partial<Record<Locale, Compensation>>;
  };
  employment: InternalEmployment[];
  facts: InternalFact[];
  projects: Array<{
    id: string;
    name: string;
    description: BilingualText;
    url: string;
    keywords: string[];
    roles: BilingualText;
    status?: string;
    releaseDate?: string;
    statusAsOf?: string;
    links: RawLink[];
  }>;
  publications: Array<{
    id: string;
    name: string;
    publisher: string;
    releaseDate: string;
    url: string;
    summary: BilingualText;
  }>;
  skills: Array<{
    name: BilingualText;
    keywords: string[];
  }>;
}

export interface BuiltRolePeriod extends Omit<RawRolePeriod, 'position'> {
  position: string;
}

export interface BuiltEmployerPeriod extends Omit<RawEmployerPeriod, 'name'> {
  name: string;
}

export interface BuiltJob {
  name: string;
  position: string;
  startDate: string;
  endDate?: string;
  summary: string;
  highlights: string[];
  'x-factIds': string[];
  'x-technologies': string[];
  'x-rolePeriods'?: BuiltRolePeriod[];
  'x-employerPeriods'?: BuiltEmployerPeriod[];
}

export interface BuiltResume {
  basics: {
    name: string;
    label: string;
    email: string;
    location: { city: string; countryCode?: string };
    summary: string;
  };
  work: BuiltJob[];
  skills: Array<{ name: string; keywords: string[] }>;
  languages: Array<{ language: string; fluency: string }>;
  projects: Array<{
    name: string;
    description: string;
    url: string;
    keywords: string[];
    roles: string[];
    'x-status'?: string;
    'x-releaseDate'?: string;
  }>;
  publications: Array<{
    name: string;
    publisher: string;
    releaseDate: string;
    url: string;
    summary: string;
  }>;
  meta: {
    version: string;
    lastModified: string;
    locale: Locale;
    language: Locale;
  };
  'x-preferences': {
    remoteOnly?: boolean;
    openToInternationalRelocation?: boolean;
    targetMarket?: string;
    compensation?: Compensation;
  };
  'x-learning'?: string;
}
