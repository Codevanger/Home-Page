export interface ExperienceItem {
  readonly id: string;
  readonly company: string;
  readonly position: string | undefined;
  readonly period: string;
  readonly icon: string;
  readonly tips: readonly string[];
  readonly summary: string | undefined;
  readonly highlights: readonly string[];
  readonly technologies: readonly string[];
  readonly projectUrl?: string;
}
