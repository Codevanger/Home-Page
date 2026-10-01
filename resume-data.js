/* Pure data adapter: GitHub career data -> JSON Resume -> printable HTML. */
(function (root) {
  function validate(data) {
    if (
      !data ||
      data.schemaVersion !== "1.0.0" ||
      !data.profile ||
      !Array.isArray(data.employment) ||
      !Array.isArray(data.facts)
    )
      throw Error("Unsupported resume data");
    const ids = new Set();
    for (const fact of data.facts) {
      if (
        !fact.id ||
        ids.has(fact.id) ||
        !fact.text ||
        !["ru", "en"].every((l) => typeof fact.text[l] === "string")
      )
        throw Error("Invalid fact");
      ids.add(fact.id);
    }
    for (const job of data.employment) {
      if (
        !Array.isArray(job.factIds) ||
        !job.factIds.every(
          (id) =>
            ids.has(id) &&
            data.facts.find((f) => f.id === id).employmentId === job.id,
        )
      )
        throw Error("Invalid fact reference");
    }
    return data;
  }
  function build(data, locale) {
    validate(data);
    if (!["ru", "en"].includes(locale)) throw Error("Unsupported language");
    const local = (value) => {
      if (!value || typeof value[locale] !== "string")
        throw Error("Missing translation");
      return value[locale];
    };
    const p = data.profile;
    const facts = new Map(data.facts.map((f) => [f.id, f]));
    const resume = {
      basics: {
        name: local(p.name),
        label: local(p.headline),
        email: p.email,
        location: {
          city: local(p.location.city),
          countryCode: p.location.countryCode,
        },
        summary: local(p.summary),
      },
      work: data.employment.map((job) => {
        const item = {
          name: local(job.name),
          position: local(job.position),
          startDate: job.startDate,
          summary: local(job.summary),
          highlights: job.factIds.map((id) => local(facts.get(id).text)),
          "x-factIds": job.factIds,
        };
        if (job.endDate) item.endDate = job.endDate;
        for (const [key, name] of [
          ["rolePeriods", "position"],
          ["employerPeriods", "name"],
        ]) {
          if (job[key])
            item["x-" + key] = job[key].map((period) => ({
              ...period,
              [name]: local(period[name]),
            }));
        }
        if (job.skillExposure) item["x-skillExposure"] = job.skillExposure;
        return item;
      }),
      skills: data.skills.map((s) => ({
        name: local(s.name),
        keywords: s.keywords,
      })),
      languages: p.languages.map((l) => ({
        language: local(l.language),
        fluency: local(l.fluency),
      })),
      projects: data.projects.map((p) => ({
        name: p.name,
        description: local(p.description),
        url: p.url,
        keywords: p.keywords,
        roles: [local(p.roles)],
        ...(p.status ? { "x-status": p.status } : {}),
        ...(p.releaseDate ? { "x-releaseDate": p.releaseDate } : {}),
      })),
      publications: data.publications.map((p) => ({
        name: p.name,
        publisher: p.publisher,
        releaseDate: p.releaseDate,
        url: p.url,
        summary: local(p.summary),
      })),
      meta: {
        version: data.schemaVersion,
        lastModified: data.updatedAt,
        locale,
      },
      "x-preferences": {
        remoteOnly: data.preferences.remoteOnly,
        openToInternationalRelocation:
          data.preferences.openToInternationalRelocation,
        targetMarket: data.preferences.markets[locale],
      },
      "x-learning": local(p.learning),
    };
    if (data.preferences.compensation[locale])
      resume["x-preferences"].compensation =
        data.preferences.compensation[locale];
    return resume;
  }
  root.ResumeData = { validate, build };
  if (typeof module !== "undefined") module.exports = root.ResumeData;
})(globalThis);
