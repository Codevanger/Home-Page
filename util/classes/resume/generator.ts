import type { InternalResumeData, Locale } from '../../interfaces/resume.ts';
import { ResumeBuilder } from './data.ts';
import type {
  ResumeMatcher,
  ResumeMatchResult,
  TailorOptions,
} from './matcher.ts';
import type { ResumePDF, ResumePDFProgress } from './pdf.ts';
import type { ResumeSource } from './source.ts';

const COMPRESSION_LEVELS: TailorOptions[] = [
  { maxJobs: 7, maxFactsPerJob: 2, maxProjects: 2, maxSkills: 20 },
  { maxJobs: 7, maxFactsPerJob: 1, maxProjects: 2, maxSkills: 18 },
  {
    maxJobs: 5,
    maxFactsPerJob: 1,
    maxProjects: 1,
    maxSkills: 16,
    includePublications: false,
  },
  {
    maxJobs: 4,
    maxFactsPerJob: 1,
    maxProjects: 1,
    maxSkills: 14,
    includePublications: false,
  },
  {
    maxJobs: 3,
    maxFactsPerJob: 1,
    maxProjects: 1,
    maxSkills: 12,
    includePublications: false,
  },
  {
    maxJobs: 2,
    maxFactsPerJob: 1,
    maxProjects: 0,
    maxSkills: 10,
    includePublications: false,
  },
  {
    maxJobs: 1,
    maxFactsPerJob: 1,
    maxProjects: 0,
    maxSkills: 8,
    includePublications: false,
  },
];

export type PdfKind = 'tailored' | 'full';

export interface GeneratedResume {
  blob: Blob;
  kind: PdfKind;
  data: InternalResumeData;
  locale: Locale;
  pages: number;
}

interface GenerateOptions {
  tailored: boolean;
  vacancy: string;
  locale: Locale;
  signal: AbortSignal;
  onProgress: (progress: ResumePDFProgress) => void;
}

export class ResumeGenerator {
  constructor(
    private readonly source: ResumeSource,
    private readonly matcher: ResumeMatcher,
    private readonly pdf: ResumePDF,
  ) {}

  getData(): Promise<InternalResumeData> {
    return this.source.load();
  }

  analyze(data: InternalResumeData, vacancy: string): ResumeMatchResult {
    return this.matcher.analyze(data, vacancy);
  }

  async generate(
    data: InternalResumeData,
    { tailored, vacancy, locale, signal, onProgress }: GenerateOptions,
  ): Promise<GeneratedResume> {
    const levels: Array<TailorOptions | null> = tailored
      ? COMPRESSION_LEVELS
      : [null];
    let pdf: Blob | undefined;
    let pages = 0;
    let generatedData = data;

    for (const settings of levels) {
      generatedData = settings
        ? this.matcher.tailor(data, vacancy, locale, settings)
        : data;
      pages = 0;
      pdf = await this.pdf.create(ResumeBuilder.build(generatedData, locale), {
        theme: 'compact',
        signal,
        onProgress,
      });
      pages = await this.pdf.pageCount(pdf);
      if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
      if (pages <= 2) break;
    }
    if (!pdf) throw Error('PDF generation did not return a document');
    if (tailored && pages > 2) {
      throw Error('Could not fit resume into two pages');
    }

    return {
      blob: pdf,
      kind: tailored ? 'tailored' : 'full',
      data: generatedData,
      locale,
      pages,
    };
  }
}
