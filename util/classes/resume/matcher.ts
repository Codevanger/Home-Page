import { BM25 } from './bm25.ts';
import type { InternalResumeData, Locale } from '../../interfaces/resume.ts';
import { Vocabulary } from './vocabulary.ts';

export interface ResumeMatchResult {
  score: number;
  matched: string[];
  missing: string[];
  roles: string[];
  matchedRoles: string[];
  recognized: boolean;
}

export interface TailorOptions {
  maxJobs?: number;
  maxFactsPerJob?: number;
  maxProjects?: number;
  maxSkills?: number;
  includePublications?: boolean;
}

interface RequiredTailorOptions {
  maxJobs: number;
  maxFactsPerJob: number;
  maxProjects: number;
  maxSkills: number;
  includePublications: boolean;
}

export class ResumeMatcher {
  analyze(data: InternalResumeData, vacancy: string): ResumeMatchResult {
    const required = Vocabulary.findSkills(vacancy);
    const candidateSkills = new Set(
      Vocabulary.findSkills(
        [
          ...data.skills.flatMap((group) => group.keywords),
          ...data.employment.flatMap((job) => job.skills),
        ].join(' '),
      ),
    );
    const matched = required.filter((skill) => candidateSkills.has(skill));
    const missing = required.filter((skill) => !candidateSkills.has(skill));
    const roles = Vocabulary.findRoles(vacancy);
    const resumeText = JSON.stringify(data);
    const matchedRoles = roles.filter((role) =>
      Vocabulary.roleMatches(role, resumeText),
    );
    const roleScore = roles.length ? matchedRoles.length / roles.length : 1;
    const skillScore = required.length
      ? matched.length / required.length
      : null;
    const score =
      skillScore === null
        ? roles.length
          ? Math.round(roleScore * 100)
          : 0
        : Math.round(
            skillScore * (roles.length ? 90 : 100) +
              (roles.length ? roleScore * 10 : 0),
          );

    return {
      score: Math.max(0, Math.min(100, score)),
      matched,
      missing,
      roles,
      matchedRoles,
      recognized: required.length > 0 || roles.length > 0,
    };
  }

  tailor(
    data: InternalResumeData,
    vacancy: string,
    locale: Locale,
    options: TailorOptions = {},
  ): InternalResumeData {
    const settings: RequiredTailorOptions = {
      maxJobs: Infinity,
      maxFactsPerJob: Infinity,
      maxProjects: Infinity,
      maxSkills: Infinity,
      includePublications: true,
      ...options,
    };
    const query = BM25.tokenize(vacancy);
    const facts = new Map(data.facts.map((fact) => [fact.id, fact]));
    const jobDocuments = data.employment.map((job) => ({
      id: job.id,
      tokens: BM25.tokenize(
        [
          job.position[locale],
          job.summary[locale],
          ...job.skills,
          ...job.factIds.map((id) => facts.get(id)?.text[locale] || ''),
        ].join(' '),
      ),
    }));
    const factDocuments = data.facts.map((fact) => ({
      id: fact.id,
      tokens: BM25.tokenize(fact.text[locale]),
    }));
    const projectDocuments = data.projects.map((project) => ({
      id: project.id,
      tokens: BM25.tokenize(
        [
          project.name,
          project.description[locale],
          project.roles[locale],
          ...project.keywords,
        ].join(' '),
      ),
    }));
    const jobScores = BM25.rankDocuments(jobDocuments, query);
    const factScores = BM25.rankDocuments(factDocuments, query);
    const projectScores = BM25.rankDocuments(projectDocuments, query);
    const jobIds = data.employment.map((job) => job.id);
    let selectedJobs = BM25.rankedIds(jobIds, jobScores, settings.maxJobs);
    const currentJob = jobIds[0];
    if (currentJob && !selectedJobs.includes(currentJob)) {
      selectedJobs = [...selectedJobs.slice(0, -1), currentJob];
    }

    return {
      ...data,
      employment: data.employment
        .filter((job) => selectedJobs.includes(job.id))
        .map((job) => ({
          ...job,
          factIds: BM25.rankedIds(
            job.factIds,
            factScores,
            settings.maxFactsPerJob,
          ),
        })),
      projects: BM25.rankedIds(
        data.projects.map((project) => project.id),
        projectScores,
        settings.maxProjects,
      )
        .map((id) => data.projects.find((project) => project.id === id))
        .filter(
          (project): project is InternalResumeData['projects'][number] =>
            project !== undefined,
        ),
      publications: settings.includePublications ? [...data.publications] : [],
      skills: data.skills.map((group) => {
        const keywordScores = BM25.rankDocuments(
          group.keywords.map((keyword) => ({
            id: keyword,
            tokens: BM25.tokenize(keyword),
          })),
          query,
        );
        return {
          ...group,
          keywords: BM25.rankedIds(
            group.keywords,
            keywordScores,
            settings.maxSkills,
          ),
        };
      }),
    };
  }
}
