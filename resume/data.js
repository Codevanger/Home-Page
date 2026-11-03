export class ResumeDataAdapter {
  static validate(data) {
    if (
      !data ||
      data.meta?.version !== '1.0.0' ||
      !data.basics ||
      !Array.isArray(data.work) ||
      !Array.isArray(data['x-facts'])
    )
      throw Error('Unsupported resume data');
    const ids = new Set();
    for (const fact of data['x-facts']) {
      if (!fact.id || ids.has(fact.id) || typeof fact.text !== 'string')
        throw Error('Invalid fact');
      ids.add(fact.id);
    }
    for (const job of data.work) {
      if (
        !job['x-id'] ||
        !Array.isArray(job['x-factIds']) ||
        !job['x-factIds'].every(
          (id) =>
            ids.has(id) &&
            data['x-facts'].find((fact) => fact.id === id).employmentId ===
              job['x-id'],
        )
      )
        throw Error('Invalid fact reference');
    }
    return data;
  }

  static parse(data) {
    ResumeDataAdapter.validate(data);
    const translations = data['x-localizations']?.ru || {};
    const bilingual = (english, russian) => ({ en: english, ru: russian });
    const workTranslations = translations.work || {};
    const factTranslations = translations.facts || {};
    const projectTranslations = translations.projects || {};
    const publicationTranslations = translations.publications || {};
    const skillTranslations = translations.skills || {};
    const languageTranslations = translations.languages || {};
    const preferences = data['x-preferences'] || {};
    const preferenceTranslations = translations.preferences || {};

    return {
      schemaVersion: data.meta.version,
      updatedAt: data.meta.lastModified.slice(0, 10),
      profile: {
        name: bilingual(data.basics.name, translations.basics?.name),
        headline: bilingual(data.basics.label, translations.basics?.label),
        email: data.basics.email,
        secondaryEmail: data.basics['x-secondaryEmail'],
        profiles: data.basics.profiles || [],
        about: data.basics['x-about'] || [],
        resumeFooter: data.basics['x-resumeFooter'],
        location: {
          city: bilingual(
            data.basics.location?.city,
            translations.basics?.location?.city,
          ),
          countryCode: data.basics.location?.countryCode,
        },
        summary: bilingual(data.basics.summary, translations.basics?.summary),
        languages: (data.languages || []).map((language) => ({
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
      interests: data.interests || [],
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
        const translation = workTranslations[id] || {};
        const item = {
          id,
          name: bilingual(job.name, translation.name),
          position: bilingual(job.position, translation.position),
          startDate: job.startDate,
          endDate: job.endDate,
          url: job.url,
          summary: bilingual(job.summary, translation.summary),
          skills: job['x-technologies'] || [],
          skillExposure: job['x-skillExposure'],
          tips: job['x-tips'] || [],
          factIds: job['x-factIds'],
        };
        for (const [key, property] of [
          ['rolePeriods', 'position'],
          ['employerPeriods', 'name'],
        ]) {
          if (job['x-' + key]) {
            item[key] = job['x-' + key].map((period, index) => ({
              ...period,
              [property]: bilingual(
                period[property],
                translation[key]?.[index]?.[property],
              ),
            }));
          }
        }
        return item;
      }),
      facts: data['x-facts'].map((fact) => ({
        ...fact,
        text: bilingual(fact.text, factTranslations[fact.id]),
      })),
      projects: data.projects.map((project) => {
        const translation = projectTranslations[project['x-id']] || {};
        return {
          id: project['x-id'],
          name: project.name,
          description: bilingual(project.description, translation.description),
          url: project.url,
          keywords: project.keywords || [],
          roles: bilingual(project.roles?.[0], translation.roles?.[0]),
          status: project['x-status'],
          releaseDate: project['x-releaseDate'],
          statusAsOf: project['x-statusAsOf'],
          links: project['x-links'] || [],
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
        keywords: skill.keywords || [],
      })),
    };
  }

  static validateInternal(data) {
    const ids = new Set(data.facts.map((fact) => fact.id));
    for (const job of data.employment) {
      if (
        !Array.isArray(job.factIds) ||
        !job.factIds.every(
          (id) =>
            ids.has(id) &&
            data.facts.find((fact) => fact.id === id).employmentId === job.id,
        )
      )
        throw Error('Invalid fact reference');
    }
    return data;
  }

  static build(data, locale) {
    ResumeDataAdapter.validateInternal(data);
    if (!['ru', 'en'].includes(locale)) throw Error('Unsupported language');
    const local = (value) => {
      if (!value || typeof value[locale] !== 'string')
        throw Error('Missing translation');
      return value[locale];
    };
    const profile = data.profile;
    const facts = new Map(data.facts.map((fact) => [fact.id, fact]));
    const resume = {
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
        const item = {
          name: local(job.name),
          position: local(job.position),
          startDate: job.startDate,
          summary: local(job.summary),
          highlights: job.factIds.map((id) => local(facts.get(id).text)),
          'x-factIds': job.factIds,
        };
        if (job.endDate) item.endDate = job.endDate;
        for (const [key, name] of [
          ['rolePeriods', 'position'],
          ['employerPeriods', 'name'],
        ]) {
          if (job[key])
            item['x-' + key] = job[key].map((period) => ({
              ...period,
              [name]: local(period[name]),
            }));
        }
        if (job.skills) item['x-technologies'] = [...job.skills];
        if (job.skillExposure) item['x-skillExposure'] = job.skillExposure;
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
    if (data.preferences.compensation[locale])
      resume['x-preferences'].compensation =
        data.preferences.compensation[locale];
    return resume;
  }
}
