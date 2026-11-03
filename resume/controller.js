import { ResumeDataAdapter } from './data.js';
import { resumeMatcher } from './matcher.js';
import { resumePDF } from './pdf.js';
import { resumeSource } from './source.js';

const COMPRESSION_LEVELS = [
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

export class ResumeController {
  constructor() {
    this.win = document.getElementById('resume');
    this.progress = document.getElementById('resumeProgress');
    this.fill = document.getElementById('resumeProgressFill');
    this.vacancy = document.getElementById('resumeVacancy');
    this.language = document.getElementById('resumeLanguage');
    this.analyze = document.getElementById('resumeAnalyze');
    this.generate = document.getElementById('resumeGenerate');
    this.download = document.getElementById('resumeDownload');
    this.match = document.getElementById('resumeMatch');
    this.matchBar = document.getElementById('resumeMatchBar');
    this.matchScore = document.getElementById('resumeMatchScore');
    this.matchDetails = document.getElementById('resumeMatchDetails');
    this.error = document.getElementById('resumeError');
    this.active = null;
    this.sequence = 0;
    this.analysisSequence = 0;
    this.pdfURL = null;
    this.pdfKind = null;
    this.resumeData = null;
    this.dataPromise = null;
  }

  init() {
    this.vacancy.addEventListener('input', () => {
      this.match.hidden = true;
      this.invalidate();
    });
    this.language.addEventListener('change', () => {
      this.match.hidden = true;
      this.invalidate();
    });
    this.analyze.addEventListener('click', () => this.analyzeVacancy());
    this.generate.addEventListener('click', () => {
      SiteAnalytics.event('resume_generate_click');
      this.prepare(true, true);
    });
    this.win.addEventListener('window:open', () => {
      if (!this.pdfURL) this.prepare(false, false);
    });
    this.win.addEventListener('window:hide', () => this.stop());
    this.download.addEventListener('click', () => this.prepare(false, true));
    window.addEventListener('pagehide', () => {
      if (this.pdfURL) URL.revokeObjectURL(this.pdfURL);
    });
  }

  stop() {
    this.sequence++;
    if (this.active) SiteAnalytics.event('resume_prepare_cancelled');
    this.active?.abort();
    this.active = null;
  }

  updateButtons() {
    this.download.disabled = false;
    this.generate.disabled = !this.vacancy.value.trim();
  }

  resetOutput() {
    this.progress.classList.remove('indeterminate');
    this.progress.setAttribute('aria-label', 'Generate a resume to create PDF');
    this.progress.setAttribute('aria-valuenow', '0');
    this.fill.style.width = '0';
    this.updateButtons();
    this.error.hidden = true;
  }

  invalidate() {
    this.stop();
    this.analysisSequence++;
    this.analyze.disabled = false;
    if (this.pdfURL) URL.revokeObjectURL(this.pdfURL);
    this.pdfURL = null;
    this.pdfKind = null;
    this.resetOutput();
  }

  ready() {
    this.progress.classList.remove('indeterminate');
    this.progress.setAttribute('aria-label', 'Resume ready');
    this.progress.setAttribute('aria-valuenow', '100');
    this.fill.style.width = '100%';
    this.updateButtons();
  }

  savePdf() {
    if (!this.pdfURL) return;
    SiteAnalytics.event('resume_download_' + this.pdfKind);
    const a = document.createElement('a');
    a.href = this.pdfURL;
    const name = this.resumeData.profile.name.en.replaceAll(' ', '-');
    a.download = `${name}-Resume-${this.language.value.toUpperCase()}-${this.pdfKind === 'tailored' ? 'Tailored' : 'Full'}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async getData() {
    if (this.resumeData) return this.resumeData;
    if (!this.dataPromise) this.dataPromise = resumeSource.load();

    try {
      this.resumeData = await this.dataPromise;
      SiteAnalytics.event('resume_data_loaded');
      return this.resumeData;
    } catch (loadError) {
      this.dataPromise = null;
      throw loadError;
    }
  }

  async pdfPageCount(pdf) {
    const content = await pdf.text();
    return (content.match(/\/Type\s*\/Page\b/g) || []).length;
  }

  async prepare(tailored, downloadAfter) {
    this.stop();
    const token = this.sequence;
    const started = performance.now();
    const locale = this.language.value;
    const vacancyText = this.vacancy.value.trim();
    const requestedKind = tailored ? 'tailored' : 'full';
    if (tailored && !vacancyText) {
      this.updateButtons();
      return;
    }
    let stage = 'fetch';
    this.error.hidden = true;
    this.generate.disabled = true;
    this.download.disabled = true;
    if (this.pdfURL && this.pdfKind === requestedKind) {
      SiteAnalytics.event('resume_cache_hit');
      this.ready();
      if (downloadAfter) this.savePdf();
      return;
    }

    SiteAnalytics.event('resume_prepare_started');
    this.progress.classList.add('indeterminate');
    this.progress.removeAttribute('aria-valuenow');
    this.fill.style.width = '';
    this.progress.setAttribute('aria-label', 'Downloading resume data');
    const controller = new AbortController();
    this.active = controller;
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const data = await this.getData();
      if (token !== this.sequence) return;
      SiteAnalytics.duration('resume_fetch_time', performance.now() - started);
      stage = 'pdf';
      this.progress.setAttribute('aria-label', 'Preparing PDF');
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
      if (token !== this.sequence) return;
      this.progress.classList.add('indeterminate');
      this.progress.removeAttribute('aria-valuenow');
      const levels = tailored ? COMPRESSION_LEVELS : [null];
      let pdf;
      let pages = 0;
      for (const settings of levels) {
        const tailoredData = settings
          ? resumeMatcher.tailor(data, vacancyText, locale, settings)
          : data;
        pages = 0;
        pdf = await resumePDF.create(
          ResumeDataAdapter.build(tailoredData, locale),
          {
            theme: 'pro',
            signal: controller.signal,
            onProgress: (progress) => {
              if (token !== this.sequence) return;
              this.progress.setAttribute(
                'aria-label',
                progress.stage === 'assets'
                  ? 'Loading PDF engine'
                  : 'Preparing PDF',
              );
              if (
                progress.stage === 'rendering' &&
                progress.totalPages > 0 &&
                progress.currentPage > 0
              ) {
                const percent =
                  35 +
                  Math.min(
                    64,
                    Math.round(
                      (progress.currentPage / progress.totalPages) * 64,
                    ),
                  );
                this.progress.classList.remove('indeterminate');
                this.progress.setAttribute('aria-valuenow', String(percent));
                this.fill.style.width = percent + '%';
              }
            },
          },
        );
        pages = await this.pdfPageCount(pdf);
        if (token !== this.sequence) return;
        if (pages <= 2) break;
      }
      if (tailored && pages > 2) {
        throw Error('Could not fit resume into two pages');
      }
      if (tailored) SiteAnalytics.event('resume_bm25_pages_' + pages);
      if (this.pdfURL) URL.revokeObjectURL(this.pdfURL);
      this.pdfKind = requestedKind;
      this.pdfURL = URL.createObjectURL(pdf);
      SiteAnalytics.event('resume_pdf_ready');
      SiteAnalytics.duration(
        'resume_prepare_time',
        performance.now() - started,
      );
      this.ready();
      if (downloadAfter) this.savePdf();
    } catch (prepareError) {
      if (token !== this.sequence) return;
      console.error(
        'Resume preparation failed at stage: ' + stage,
        prepareError,
      );
      SiteAnalytics.event(
        'resume_error_' + (controller.signal.aborted ? 'timeout' : stage),
      );
      this.progress.classList.remove('indeterminate');
      this.progress.setAttribute('aria-label', 'Resume unavailable');
      this.fill.style.width = '0';
      this.error.textContent =
        locale === 'ru'
          ? 'Не удалось подготовить резюме. Попробуйте ещё раз.'
          : 'Could not prepare your resume. Please try again.';
      this.error.hidden = false;
    } finally {
      clearTimeout(timeout);
      if (token === this.sequence) {
        this.active = null;
        this.updateButtons();
      }
    }
  }

  async analyzeVacancy() {
    const token = ++this.analysisSequence;
    const vacancyText = this.vacancy.value.trim();
    const locale = this.language.value;
    if (!vacancyText) {
      this.match.hidden = true;
      this.vacancy.focus();
      return;
    }

    this.analyze.disabled = true;
    this.error.hidden = true;
    try {
      const data = await this.getData();
      if (token !== this.analysisSequence) return;
      const result = resumeMatcher.analyze(data, vacancyText);
      const russian = locale === 'ru';
      this.matchBar.value = result.score;
      this.matchScore.textContent = russian
        ? `Соответствие: ${result.score}%`
        : `Match: ${result.score}%`;

      if (!result.recognized) {
        this.matchDetails.textContent = russian
          ? 'В тексте не найдены технологии или роли для сравнения.'
          : 'No recognizable technologies or roles were found in the vacancy.';
      } else {
        const parts = [];
        if (result.matched.length) {
          parts.push(
            (russian ? 'Совпало: ' : 'Matched: ') +
              result.matched.join(', ') +
              '.',
          );
        }
        if (result.missing.length) {
          parts.push(
            (russian ? 'Не найдено: ' : 'Missing: ') +
              result.missing.join(', ') +
              '.',
          );
        }
        if (result.matchedRoles.length) {
          parts.push(
            (russian ? 'Роли: ' : 'Roles: ') +
              result.matchedRoles.join(', ') +
              '.',
          );
        }
        this.matchDetails.textContent = parts.join(' ');
      }
      this.match.hidden = false;
      SiteAnalytics.event('resume_match_analyzed');
    } catch (analysisError) {
      if (token !== this.analysisSequence) return;
      console.error('Vacancy analysis failed', analysisError);
      this.error.textContent =
        locale === 'ru'
          ? 'Не удалось оценить вакансию. Попробуйте ещё раз.'
          : 'Could not analyze the vacancy. Please try again.';
      this.error.hidden = false;
    } finally {
      if (token === this.analysisSequence) this.analyze.disabled = false;
    }
  }
}
