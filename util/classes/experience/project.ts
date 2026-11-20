import type { InternalResumeData } from '../../interfaces/resume.ts';
import type { ExperienceItem } from '../../interfaces/experience.ts';

type Project = InternalResumeData['projects'][number];

export class ExperienceProject implements ExperienceItem {
  readonly id: string;
  readonly company: string;
  readonly position: string | undefined;
  readonly period: string;
  readonly icon: string;
  readonly tips: readonly string[];
  readonly summary: string | undefined;
  readonly highlights: readonly string[] = [];
  readonly technologies: readonly string[];
  readonly projectUrl: string;

  private constructor(source: Project, icon: string) {
    this.id = source.id;
    this.company = source.name;
    this.position = source.roles.en;
    this.period = ExperienceProject.period(source);
    this.icon = icon;
    this.tips = [`Tip: Open the project at ${source.url}`];
    this.summary = source.description.en;
    this.technologies = [...source.keywords];
    this.projectUrl = source.url;
  }

  static create(source: Project): ExperienceProject {
    return new ExperienceProject(source, ExperienceProject.icon(source));
  }

  private static period(source: Project): string {
    return [
      source.releaseDate,
      source.status?.replaceAll('_', ' '),
      source.statusAsOf ? `as of ${source.statusAsOf}` : undefined,
    ]
      .filter((value): value is string => Boolean(value))
      .join(' · ');
  }

  private static icon(source: Project): string {
    const url = new URL(source.url);
    if (/(?:^|\.)steampowered\.com$/.test(url.hostname)) {
      return 'https://store.steampowered.com/favicon.ico';
    }
    if (url.hostname === 'www.npmjs.com') {
      return 'https://www.google.com/s2/favicons?domain=npmjs.com&sz=64';
    }
    if (url.hostname === 'github.com') {
      return 'https://github.com/favicon.ico';
    }
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(source.url)}&sz=64`;
  }
}
