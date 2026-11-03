import { ResumeDataAdapter } from './data.js';

export class ResumeSource {
  static URL =
    'https://api.github.com/repos/Codevanger/Codevanger/contents/resume.json';

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
    const response = await fetch(ResumeSource.URL, {
      cache: 'no-cache',
      credentials: 'omit',
      headers: { Accept: 'application/vnd.github.raw+json' },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw Error('Could not load resume data');
    const content = await response.text();
    if (new Blob([content]).size > 2 * 1024 * 1024) {
      throw Error('Resume data is too large');
    }
    return ResumeDataAdapter.parse(JSON.parse(content));
  }
}

export const resumeSource = new ResumeSource();
