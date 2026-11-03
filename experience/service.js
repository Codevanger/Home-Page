import { ExperienceJob } from './job.js';
import { ExperienceProject } from './project.js';
import { ExperienceWindow } from './window.js';

export class ExperienceService {
  async createWindows(background) {
    try {
      const data = await ResumeSource.load();
      const facts = new Map(data.facts.map((fact) => [fact.id, fact]));
      const jobs = data.employment.map((source, index) => {
        const job = new ExperienceJob(source, facts);
        return new ExperienceWindow(job, index, background).create();
      });
      const projects = await Promise.all(
        data.projects.map(async (source, index) => {
          const project = await ExperienceProject.create(source);
          return new ExperienceWindow(
            project,
            jobs.length + index,
            background,
          ).create();
        }),
      );
      return [...jobs, ...projects];
    } catch (error) {
      console.error('Could not load experience', error);
      return [];
    }
  }
}
