import { ResumeDataAdapter } from './data.js';

export class ResumeSource {
  static URLS = [
    'https://api.github.com/repos/Codevanger/Codevanger/contents/resume.json',
    'https://raw.githubusercontent.com/Codevanger/Codevanger/main/resume.json',
    './resume-source/resume.json',
  ];

  constructor() {
    this.promise = null;
  }

  load() {
    if (!this.promise) {
      this.promise = this.fetchData().catch((error) => {
        this.promise = null;
        throw error;
      });
    }
    return this.promise;
  }

  async fetchData() {
    const errors = [];
    for (const url of ResumeSource.URLS) {
      try {
        return await this.fetchSource(url);
      } catch (error) {
        errors.push(error);
      }
    }
    throw new AggregateError(errors, 'Could not load resume data');
  }

  async fetchSource(url) {
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
    return ResumeDataAdapter.parse(JSON.parse(content));
  }
}

export const resumeSource = new ResumeSource();
