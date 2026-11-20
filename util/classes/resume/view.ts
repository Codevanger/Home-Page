import { requiredElement } from '../../helpers/dom.ts';
import type { Locale } from '../../interfaces/resume.ts';
import type { ResumeMatchResult } from './matcher.ts';
import type { ResumePDFProgress } from './pdf.ts';

export class ResumeView {
  private readonly win = requiredElement<HTMLElement>('resume');
  private readonly progress = requiredElement<HTMLElement>('resumeProgress');
  private readonly fill = requiredElement<HTMLElement>('resumeProgressFill');
  private readonly vacancy =
    requiredElement<HTMLTextAreaElement>('resumeVacancy');
  private readonly language =
    requiredElement<HTMLSelectElement>('resumeLanguage');
  private readonly analyze =
    requiredElement<HTMLButtonElement>('resumeAnalyze');
  private readonly generate =
    requiredElement<HTMLButtonElement>('resumeGenerate');
  private readonly downloadButton =
    requiredElement<HTMLButtonElement>('resumeDownload');
  private readonly match = requiredElement<HTMLElement>('resumeMatch');
  private readonly matchBar =
    requiredElement<HTMLProgressElement>('resumeMatchBar');
  private readonly matchScore =
    requiredElement<HTMLElement>('resumeMatchScore');
  private readonly matchDetails =
    requiredElement<HTMLElement>('resumeMatchDetails');
  private readonly error = requiredElement<HTMLElement>('resumeError');

  get locale(): Locale {
    return this.language.value === 'ru' ? 'ru' : 'en';
  }

  get vacancyText(): string {
    return this.vacancy.value.trim();
  }

  onInvalidate(handler: () => void): void {
    const invalidate = (): void => {
      this.hideMatch();
      handler();
    };
    this.vacancy.addEventListener('input', invalidate);
    this.language.addEventListener('change', invalidate);
  }

  onAnalyze(handler: () => void): void {
    this.analyze.addEventListener('click', handler);
  }

  onGenerate(handler: () => void): void {
    this.generate.addEventListener('click', handler);
  }

  onDownload(handler: () => void): void {
    this.downloadButton.addEventListener('click', handler);
  }

  onOpen(handler: () => void): void {
    this.win.addEventListener('window:open', handler);
  }

  onHide(handler: () => void): void {
    this.win.addEventListener('window:hide', handler);
  }

  setBusy(busy: boolean): void {
    this.downloadButton.disabled = busy;
    this.generate.disabled = busy || !this.vacancyText;
  }

  setAnalyzing(analyzing: boolean): void {
    this.analyze.disabled = analyzing;
  }

  resetOutput(): void {
    this.progress.classList.remove('indeterminate');
    this.progress.setAttribute('aria-label', 'Generate a resume to create PDF');
    this.progress.setAttribute('aria-valuenow', '0');
    this.fill.style.width = '0';
    this.setBusy(false);
    this.hideError();
  }

  showFetching(): void {
    this.hideError();
    this.setBusy(true);
    this.progress.classList.add('indeterminate');
    this.progress.removeAttribute('aria-valuenow');
    this.fill.style.width = '';
    this.progress.setAttribute('aria-label', 'Downloading resume data');
  }

  showPdfProgress(progress: ResumePDFProgress): void {
    this.progress.setAttribute(
      'aria-label',
      progress.stage === 'assets' ? 'Loading PDF engine' : 'Preparing PDF',
    );
    if (
      progress.stage !== 'rendering' ||
      progress.totalPages <= 0 ||
      progress.currentPage <= 0
    ) {
      return;
    }
    const percent =
      35 +
      Math.min(
        64,
        Math.round((progress.currentPage / progress.totalPages) * 64),
      );
    this.progress.classList.remove('indeterminate');
    this.progress.setAttribute('aria-valuenow', String(percent));
    this.fill.style.width = `${percent}%`;
  }

  showReady(): void {
    this.progress.classList.remove('indeterminate');
    this.progress.setAttribute('aria-label', 'Resume ready');
    this.progress.setAttribute('aria-valuenow', '100');
    this.fill.style.width = '100%';
    this.setBusy(false);
  }

  showPreparationError(locale: Locale): void {
    this.progress.classList.remove('indeterminate');
    this.progress.setAttribute('aria-label', 'Resume unavailable');
    this.fill.style.width = '0';
    this.showError(
      locale === 'ru'
        ? 'Не удалось подготовить резюме. Попробуйте ещё раз.'
        : 'Could not prepare your resume. Please try again.',
    );
  }

  showAnalysisError(locale: Locale): void {
    this.showError(
      locale === 'ru'
        ? 'Не удалось оценить вакансию. Попробуйте ещё раз.'
        : 'Could not analyze the vacancy. Please try again.',
    );
  }

  showMatch(result: ResumeMatchResult, locale: Locale): void {
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
      const parts: string[] = [];
      if (result.matched.length) {
        parts.push(
          `${russian ? 'Совпало: ' : 'Matched: '}${result.matched.join(', ')}.`,
        );
      }
      if (result.missing.length) {
        parts.push(
          `${russian ? 'Не найдено: ' : 'Missing: '}${result.missing.join(', ')}.`,
        );
      }
      if (result.matchedRoles.length) {
        parts.push(
          `${russian ? 'Роли: ' : 'Roles: '}${result.matchedRoles.join(', ')}.`,
        );
      }
      this.matchDetails.textContent = parts.join(' ');
    }
    this.match.hidden = false;
  }

  download(url: string, fileName: string): void {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  hideMatch(): void {
    this.match.hidden = true;
  }

  hideError(): void {
    this.error.hidden = true;
  }

  focusVacancy(): void {
    this.vacancy.focus();
  }

  private showError(message: string): void {
    this.error.textContent = message;
    this.error.hidden = false;
  }
}
