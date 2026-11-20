import type { WindowConfig } from '../../interfaces/desktop.ts';
import { ExperienceJob } from './job.ts';
import { ExperienceProject } from './project.ts';
import { ExperienceWindow } from './window.ts';
import type { ResumeSource } from '../resume/source.ts';

export class ExperienceService {
  constructor(private readonly source: ResumeSource) {}

  async createWindows(background: HTMLElement): Promise<WindowConfig[]> {
    try {
      const data = await this.source.load();
      const facts = new Map(data.facts.map((fact) => [fact.id, fact]));
      const jobs = data.employment.map((source, index) => {
        const job = new ExperienceJob(source, facts);
        return new ExperienceWindow(job, index, background).create();
      });
      const projects = data.projects.map((source, index) => {
        const project = ExperienceProject.create(source);
        return new ExperienceWindow(
          project,
          jobs.length + index,
          background,
        ).create();
      });
      return [...jobs, ...projects];
    } catch (error) {
      console.error('Could not load experience', error);
      return [];
    }
  }
}
