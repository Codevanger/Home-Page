import type {
  BilingualText,
  BuiltJob,
  BuiltResume,
  InternalEmployment,
  InternalResumeData,
  RawResumeData,
} from '../../interfaces/resume.ts';

export class ResumeDataValidator {
  private static record(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  static raw(data: unknown): asserts data is RawResumeData {
    if (
      !ResumeDataValidator.record(data) ||
      !ResumeDataValidator.record(data.meta) ||
      typeof data.meta.version !== 'string' ||
      !ResumeDataValidator.record(data.basics) ||
      !Array.isArray(data.work) ||
      !Array.isArray(data['x-facts'])
    ) {
      throw Error('Unsupported resume data');
    }

    const facts = data['x-facts'];
    const factOwners = new Map<string, unknown>();
    for (const fact of facts) {
      if (
        !ResumeDataValidator.record(fact) ||
        typeof fact.id !== 'string' ||
        !fact.id ||
        factOwners.has(fact.id) ||
        typeof fact.text !== 'string'
      ) {
        throw Error('Invalid fact');
      }
      factOwners.set(fact.id, fact.employmentId);
    }

    for (const job of data.work) {
      if (
        !ResumeDataValidator.record(job) ||
        typeof job['x-id'] !== 'string' ||
        !job['x-id'] ||
        !Array.isArray(job['x-factIds']) ||
        !job['x-factIds'].every(
          (id) =>
            typeof id === 'string' &&
            (!factOwners.has(id) || factOwners.get(id) === job['x-id']),
        )
      ) {
        throw Error('Invalid fact reference');
      }
    }
  }

  static internal(data: InternalResumeData): void {
    const facts = new Map(data.facts.map((fact) => [fact.id, fact]));
    for (const job of data.employment) {
      if (
        !Array.isArray(job.factIds) ||
        !job.factIds.every((id) => facts.get(id)?.employmentId === job.id)
      ) {
        throw Error('Invalid fact reference');
      }
    }
  }
}

export class ResumeDataParser {
  static parse(data: unknown): InternalResumeData {
    ResumeDataValidator.raw(data);
    const translations = data['x-localizations']?.ru ?? {};
    const bilingual = (english?: string, russian?: string): BilingualText => ({
      en: english ?? russian,
      ru: russian ?? english,
    });
    const workTranslations = translations.work ?? {};
    const factTranslations = translations.facts ?? {};
    const projectTranslations = translations.projects ?? {};
    const publicationTranslations = translations.publications ?? {};
    const skillTranslations = translations.skills ?? {};
    const languageTranslations = translations.languages ?? {};
    const preferences = data['x-preferences'] ?? {};
    const preferenceTranslations = translations.preferences ?? {};

    return {
      schemaVersion: data.meta.version,
      updatedAt: data.meta.lastModified?.slice(0, 10) ?? '',
      profile: {
        name: bilingual(data.basics.name, translations.basics?.name),
        headline: bilingual(data.basics.label, translations.basics?.label),
        email: data.basics.email,
        secondaryEmail: data.basics['x-secondaryEmail'],
        profiles: data.basics.profiles ?? [],
        about: data.basics['x-about'] ?? [],
        resumeFooter: data.basics['x-resumeFooter'],
        location: {
          city: bilingual(
            data.basics.location?.city,
            translations.basics?.location?.city,
          ),
          countryCode: data.basics.location?.countryCode,
        },
        summary: bilingual(data.basics.summary, translations.basics?.summary),
        languages: (data.languages ?? []).map((language) => ({
          language: bilingual(
            language.language,
            languageTranslations[language['x-id']]?.language,
          ),
          fluency: bilingual(
            language.fluency,
            languageTranslations[language['x-id']]?.fluency,
          ),
        })),
      },
      interests: data.interests ?? [],
      preferences: {
        remoteOnly: preferences.remoteOnly,
        openToInternationalRelocation:
          preferences.openToInternationalRelocation,
        markets: {
          en: preferences.targetMarket,
          ru: preferenceTranslations.targetMarket,
        },
        compensation: {
          ru: preferenceTranslations.compensation,
        },
      },
      employment: data.work.map((job) => {
        const id = job['x-id'];
        const translation = workTranslations[id] ?? {};
        const item: InternalEmployment = {
          id,
          name: bilingual(job.name, translation.name),
          position: bilingual(job.position, translation.position),
          startDate: job.startDate,
          endDate: job.endDate,
          url: job.url,
          summary: bilingual(job.summary, translation.summary),
          skills: job['x-technologies'] ?? [],
          tips: job['x-tips'] ?? [],
          factIds: job['x-factIds'].filter((factId, index) => {
            const fact = data['x-facts'].find((item) => item.id === factId);
            return (
              fact?.employmentId === job['x-id'] ||
              typeof job.highlights?.[index] === 'string'
            );
          }),
        };
        if (job['x-rolePeriods']) {
          item.rolePeriods = job['x-rolePeriods'].map((period, index) => ({
            ...period,
            position: bilingual(
              period.position,
              translation.rolePeriods?.[index]?.position,
            ),
          }));
        }
        if (job['x-employerPeriods']) {
          item.employerPeriods = job['x-employerPeriods'].map(
            (period, index) => ({
              ...period,
              name: bilingual(
                period.name,
                translation.employerPeriods?.[index]?.name,
              ),
            }),
          );
        }
        return item;
      }),
      facts: (() => {
        const facts = data['x-facts'].map((fact) => ({
          ...fact,
          text: bilingual(fact.text, factTranslations[fact.id]),
        }));
        const known = new Set(facts.map((fact) => fact.id));
        for (const job of data.work) {
          job['x-factIds'].forEach((id, index) => {
            if (known.has(id)) return;
            const text = job.highlights?.[index];
            if (text === undefined) return;
            known.add(id);
            facts.push({
              id,
              employmentId: job['x-id'],
              text: bilingual(text, factTranslations[id]),
            });
          });
        }
        return facts;
      })(),
      projects: data.projects.map((project) => {
        const translation = projectTranslations[project['x-id']] ?? {};
        return {
          id: project['x-id'],
          name: project.name,
          description: bilingual(project.description, translation.description),
          url: project.url,
          keywords: project.keywords ?? [],
          roles: bilingual(project.roles?.[0], translation.roles?.[0]),
          status: project['x-status'],
          releaseDate: project['x-releaseDate'],
          statusAsOf: project['x-statusAsOf'],
          links: project['x-links'] ?? [],
        };
      }),
      publications: data.publications.map((publication) => ({
        id: publication['x-id'],
        name: publication.name,
        publisher: publication.publisher,
        releaseDate: publication.releaseDate,
        url: publication.url,
        summary: bilingual(
          publication.summary,
          publicationTranslations[publication['x-id']]?.summary,
        ),
      })),
      skills: data.skills.map((skill) => ({
        name: bilingual(skill.name, skillTranslations[skill['x-id']]?.name),
        keywords: skill.keywords ?? [],
      })),
    };
  }
}

export class ResumeBuilder {
  static build(data: InternalResumeData, locale: string): BuiltResume {
    ResumeDataValidator.internal(data);
    if (locale !== 'ru' && locale !== 'en') {
      throw Error('Unsupported language');
    }
    const local = (value?: BilingualText): string => {
      const translation = value?.[locale];
      if (typeof translation !== 'string') throw Error('Missing translation');
      return translation;
    };
    const profile = data.profile;
    const facts = new Map(data.facts.map((fact) => [fact.id, fact]));
    const resume: BuiltResume = {
      basics: {
        name: local(profile.name),
        label: local(profile.headline),
        email: profile.email,
        location: {
          city: local(profile.location.city),
          countryCode: profile.location.countryCode,
        },
        summary: local(profile.summary),
      },
      work: data.employment.map((job) => {
        const item: BuiltJob = {
          name: local(job.name),
          position: local(job.position),
          startDate: job.startDate,
          summary: local(job.summary),
          highlights: job.factIds.map((id) => {
            const fact = facts.get(id);
            if (!fact) throw Error('Invalid fact reference');
            return local(fact.text);
          }),
          'x-factIds': job.factIds,
          'x-technologies': [...job.skills],
        };
        if (job.endDate) item.endDate = job.endDate;
        if (job.rolePeriods) {
          item['x-rolePeriods'] = job.rolePeriods.map((period) => ({
            ...period,
            position: local(period.position),
          }));
        }
        if (job.employerPeriods) {
          item['x-employerPeriods'] = job.employerPeriods.map((period) => ({
            ...period,
            name: local(period.name),
          }));
        }
        return item;
      }),
      skills: data.skills.map((skill) => ({
        name: local(skill.name),
        keywords: skill.keywords,
      })),
      languages: profile.languages.map((language) => ({
        language: local(language.language),
        fluency: local(language.fluency),
      })),
      projects: data.projects.map((project) => ({
        name: project.name,
        description: local(project.description),
        url: project.url,
        keywords: project.keywords,
        roles: [local(project.roles)],
        ...(project.status ? { 'x-status': project.status } : {}),
        ...(project.releaseDate
          ? { 'x-releaseDate': project.releaseDate }
          : {}),
      })),
      publications: data.publications.map((publication) => ({
        name: publication.name,
        publisher: publication.publisher,
        releaseDate: publication.releaseDate,
        url: publication.url,
        summary: local(publication.summary),
      })),
      meta: {
        version: data.schemaVersion,
        lastModified: data.updatedAt,
        locale,
        language: locale,
      },
      'x-preferences': {
        remoteOnly: data.preferences.remoteOnly,
        openToInternationalRelocation:
          data.preferences.openToInternationalRelocation,
        targetMarket: data.preferences.markets[locale],
      },
      ...(profile.learning ? { 'x-learning': local(profile.learning) } : {}),
    };
    if (data.preferences.compensation[locale]) {
      resume['x-preferences'].compensation =
        data.preferences.compensation[locale];
    }
    return resume;
  }
}
