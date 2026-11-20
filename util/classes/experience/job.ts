import type {
  InternalEmployment,
  InternalFact,
} from '../../interfaces/resume.ts';
import type { ExperienceItem } from '../../interfaces/experience.ts';

export class ExperienceJob implements ExperienceItem {
  readonly id: string;
  readonly company: string;
  readonly position: string | undefined;
  readonly period: string;
  readonly icon: string;
  readonly tips: readonly string[];
  readonly summary: string | undefined;
  readonly highlights: readonly string[];
  readonly technologies: readonly string[];

  constructor(
    source: InternalEmployment,
    facts: ReadonlyMap<string, InternalFact>,
  ) {
    this.id = source.id;
    this.company = source.name.en ?? '';
    this.position = source.position.en;
    this.period = ExperienceJob.period(source);
    this.icon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(source.url ?? '')}&sz=64`;
    this.tips = [...source.tips];
    this.summary = source.summary.en;
    this.highlights = source.factIds.map((id) => facts.get(id)?.text.en ?? '');
    this.technologies = [
      ...(source.skills ?? []),
      ...(source.skillExposure ?? []).map((skill) => skill.skill),
    ];
  }

  private static period(job: InternalEmployment): string {
    const start = ExperienceJob.formatDate(job.startDate);
    return job.endDate && job.endDate !== job.startDate
      ? `${start} — ${ExperienceJob.formatDate(job.endDate)}`
      : start;
  }

  private static formatDate(value: string): string {
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      year: 'numeric',
    }).format(new Date(`${value}-01T00:00:00`));
  }
}
