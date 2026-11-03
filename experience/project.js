export class ExperienceProject {
  constructor(source, icon) {
    this.id = source.id;
    this.company = source.name;
    this.position = source.roles.en;
    this.period = ExperienceProject.period(source);
    this.icon = icon;
    this.tips = [`Tip: Open the project at ${source.url}`];
    this.summary = source.description.en;
    this.highlights = [];
    this.technologies = [...(source.keywords || [])];
    this.projectUrl = source.url;
  }

  static async create(source) {
    const icon = await ExperienceProject.icon(source);
    return new ExperienceProject(source, icon);
  }

  static period(source) {
    return [
      source.releaseDate,
      source.status?.replaceAll('_', ' '),
      source.statusAsOf ? `as of ${source.statusAsOf}` : null,
    ]
      .filter(Boolean)
      .join(' · ');
  }

  static async icon(source) {
    const url = new URL(source.url);
    const steamMatch =
      url.hostname.match(/(?:^|\.)steampowered\.com$/) &&
      url.pathname.match(/^\/app\/(\d+)/);
    if (steamMatch) {
      const appId = steamMatch[1];
      try {
        const response = await fetch(
          `https://store.steampowered.com/api/appdetails?appids=${appId}`,
          { cache: 'no-cache', credentials: 'omit' },
        );
        if (!response.ok) throw Error('Steam appdetails failed');
        const payload = await response.json();
        const image = payload[appId]?.data?.header_image;
        if (image) return image;
      } catch {
        // Use the stable Steam CDN image when appdetails is unavailable.
      }
      return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
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
