export class ExperienceJob {
  constructor(source, facts) {
    this.id = source.id;
    this.company = source.name.en;
    this.position = source.position.en;
    this.period = ExperienceJob.period(source);
    this.icon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(source.url)}&sz=64`;
    this.tips = source.tips;
    this.summary = source.summary.en;
    this.highlights = source.factIds.map((id) => facts.get(id).text.en);
    this.technologies = [
      ...(source.skills || []),
      ...(source.skillExposure || []).map((skill) => skill.skill),
    ];
  }

  static period(job) {
    const start = ExperienceJob.formatDate(job.startDate);
    return job.endDate && job.endDate !== job.startDate
      ? `${start} — ${ExperienceJob.formatDate(job.endDate)}`
      : start;
  }

  static formatDate(value) {
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      year: 'numeric',
    }).format(new Date(`${value}-01T00:00:00`));
  }
}
