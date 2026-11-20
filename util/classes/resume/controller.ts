import type { InternalResumeData } from '../../interfaces/resume.ts';
import type { SiteAnalyticsService } from '../site/analytics.ts';
import type { GeneratedResume, PdfKind, ResumeGenerator } from './generator.ts';
import type { ResumeView } from './view.ts';

export class ResumeController {
  private active: AbortController | null = null;
  private sequence = 0;
  private analysisSequence = 0;
  private pdfURL: string | null = null;
  private generated: GeneratedResume | null = null;
  private dataAnnounced = false;

  constructor(
    private readonly generator: ResumeGenerator,
    private readonly view: ResumeView,
    private readonly analytics: SiteAnalyticsService,
  ) {}

  init(): void {
    this.view.onInvalidate(() => this.invalidate());
    this.view.onAnalyze(() => void this.analyzeVacancy());
    this.view.onGenerate(() => {
      this.analytics.event('resume_generate_click');
      void this.prepare(true, true);
    });
    this.view.onOpen(() => {
      if (!this.pdfURL) void this.prepare(false, false);
    });
    this.view.onHide(() => this.stop());
    this.view.onDownload(() => void this.prepare(false, true));
    globalThis.addEventListener('pagehide', () => this.revokePdf());
  }

  private stop(): void {
    this.sequence++;
    if (this.active) this.analytics.event('resume_prepare_cancelled');
    this.active?.abort();
    this.active = null;
  }

  private revokePdf(): void {
    if (this.pdfURL) URL.revokeObjectURL(this.pdfURL);
    this.pdfURL = null;
    this.generated = null;
  }

  private invalidate(): void {
    this.stop();
    this.analysisSequence++;
    this.view.setAnalyzing(false);
    this.revokePdf();
    this.view.resetOutput();
  }

  private downloadPdf(): void {
    if (!this.pdfURL || !this.generated) return;
    this.analytics.event(`resume_download_${this.generated.kind}`);
    const name = (this.generated.data.profile.name.en ?? 'Resume').replaceAll(
      ' ',
      '-',
    );
    const kind = this.generated.kind === 'tailored' ? 'Tailored' : 'Full';
    const fileName = `${name}-Resume-${this.generated.locale.toUpperCase()}-${kind}.pdf`;
    this.view.download(this.pdfURL, fileName);
  }

  private async getData(signal?: AbortSignal): Promise<InternalResumeData> {
    const data = await this.waitFor(this.generator.getData(), signal);
    if (!this.dataAnnounced) {
      this.dataAnnounced = true;
      this.analytics.event('resume_data_loaded');
    }
    return data;
  }

  private waitFor<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
    if (!signal) return promise;
    if (signal.aborted) {
      return Promise.reject(new DOMException('Cancelled', 'AbortError'));
    }
    return new Promise<T>((resolve, reject) => {
      const cleanup = (): void => signal.removeEventListener('abort', aborted);
      const aborted = (): void => {
        cleanup();
        reject(new DOMException('Cancelled', 'AbortError'));
      };
      signal.addEventListener('abort', aborted, { once: true });
      promise.then(
        (value) => {
          cleanup();
          resolve(value);
        },
        (error: unknown) => {
          cleanup();
          reject(error);
        },
      );
    });
  }

  private async prepare(
    tailored: boolean,
    downloadAfter: boolean,
  ): Promise<void> {
    this.stop();
    const token = this.sequence;
    const started = performance.now();
    const locale = this.view.locale;
    const vacancyText = this.view.vacancyText;
    const requestedKind: PdfKind = tailored ? 'tailored' : 'full';
    if (tailored && !vacancyText) {
      this.view.setBusy(false);
      return;
    }
    let stage = 'fetch';
    if (this.generated?.kind === requestedKind && this.pdfURL) {
      this.analytics.event('resume_cache_hit');
      this.view.showReady();
      if (downloadAfter) this.downloadPdf();
      return;
    }

    this.analytics.event('resume_prepare_started');
    this.view.showFetching();
    const controller = new AbortController();
    this.active = controller;
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const data = await this.getData(controller.signal);
      if (token !== this.sequence) return;
      this.analytics.duration('resume_fetch_time', performance.now() - started);
      stage = 'pdf';
      this.view.showPdfProgress({
        stage: 'rendering',
        totalPages: 0,
        currentPage: 0,
      });
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      if (token !== this.sequence) return;
      const generated = await this.generator.generate(data, {
        tailored,
        vacancy: vacancyText,
        locale,
        signal: controller.signal,
        onProgress: (progress) => {
          if (token === this.sequence) this.view.showPdfProgress(progress);
        },
      });
      if (token !== this.sequence) return;
      if (tailored) {
        this.analytics.event(`resume_bm25_pages_${generated.pages}`);
      }
      this.revokePdf();
      this.generated = generated;
      this.pdfURL = URL.createObjectURL(generated.blob);
      this.analytics.event('resume_pdf_ready');
      this.analytics.duration(
        'resume_prepare_time',
        performance.now() - started,
      );
      this.view.showReady();
      if (downloadAfter) this.downloadPdf();
    } catch (prepareError) {
      if (token !== this.sequence) return;
      console.error(
        `Resume preparation failed at stage: ${stage}`,
        prepareError,
      );
      this.analytics.event(
        `resume_error_${controller.signal.aborted ? 'timeout' : stage}`,
      );
      this.view.showPreparationError(locale);
    } finally {
      clearTimeout(timeout);
      if (token === this.sequence) {
        this.active = null;
        this.view.setBusy(false);
      }
    }
  }

  private async analyzeVacancy(): Promise<void> {
    const token = ++this.analysisSequence;
    const vacancyText = this.view.vacancyText;
    const locale = this.view.locale;
    if (!vacancyText) {
      this.view.hideMatch();
      this.view.focusVacancy();
      return;
    }

    this.view.setAnalyzing(true);
    this.view.hideError();
    try {
      const data = await this.getData();
      if (token !== this.analysisSequence) return;
      const result = this.generator.analyze(data, vacancyText);
      this.view.showMatch(result, locale);
      this.analytics.event('resume_match_analyzed');
    } catch (analysisError) {
      if (token !== this.analysisSequence) return;
      console.error('Vacancy analysis failed', analysisError);
      this.view.showAnalysisError(locale);
    } finally {
      if (token === this.analysisSequence) this.view.setAnalyzing(false);
    }
  }
}
