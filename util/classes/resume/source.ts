import { ResumeDataParser } from './data.ts';
import type { InternalResumeData } from '../../interfaces/resume.ts';
import { ResumeSchemaValidator } from './schema.ts';

export class ResumeSource {
  private static readonly URLS: readonly string[] = [
    'https://api.github.com/repos/Codevanger/Codevanger/contents/resume.json',
    'https://raw.githubusercontent.com/Codevanger/Codevanger/main/resume.json',
    './resume-source/resume.json',
  ];

  private promise: Promise<InternalResumeData> | null = null;

  constructor(private readonly schemaValidator = new ResumeSchemaValidator()) {}

  load(): Promise<InternalResumeData> {
    if (!this.promise) {
      this.promise = this.fetchData().catch((error: unknown) => {
        this.promise = null;
        throw error;
      });
    }
    return this.promise;
  }

  private async fetchData(): Promise<InternalResumeData> {
    const errors: unknown[] = [];
    for (const url of ResumeSource.URLS) {
      try {
        return await this.fetchSource(url);
      } catch (error) {
        errors.push(error);
      }
    }
    throw new AggregateError(errors, 'Could not load resume data');
  }

  private async fetchSource(url: string): Promise<InternalResumeData> {
    const response = await fetch(url, {
      cache: 'no-cache',
      credentials: 'omit',
      headers: { Accept: 'application/vnd.github.raw+json' },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw Error(`Could not load resume data from ${url}`);
    const content = await response.text();
    if (new Blob([content]).size > 2 * 1024 * 1024) {
      throw Error('Resume data is too large');
    }
    const raw = await this.schemaValidator.validate(
      JSON.parse(content) as unknown,
    );
    return ResumeDataParser.parse(raw);
  }
}
