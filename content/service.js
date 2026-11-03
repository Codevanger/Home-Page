export class ContentService {
  async init() {
    try {
      const data = await ResumeSource.load();
      this.render(data);
    } catch (error) {
      console.error('Could not load site content', error);
    }
  }

  render(data) {
    const { profile } = data;
    const general = document.getElementById('aboutGeneral');
    general.replaceChildren(
      ...profile.about.map((text) => this.element('p', text)),
    );

    const interests = document.getElementById('aboutInterests');
    interests.replaceChildren(
      ...data.interests.map((interest) => this.element('li', interest.name)),
    );

    const contacts = [
      ...profile.profiles.map((contact) => ({
        label: contact.network,
        url: contact.url,
      })),
      {
        label: 'Email',
        url: `mailto:${profile.secondaryEmail}`,
        detail: profile.secondaryEmail,
      },
      {
        label: 'Gmail',
        url: `mailto:${profile.email}`,
        detail: profile.email,
      },
    ];
    document.getElementById('aboutContacts').replaceChildren(
      ...contacts.map((contact) => {
        const item = document.createElement('li');
        item.append(this.link(contact.label, contact.url));
        if (contact.detail) item.append(` — ${contact.detail}`);
        return item;
      }),
    );

    document
      .getElementById('aboutProjectsList')
      .replaceChildren(
        ...data.projects.map((project) => this.project(project)),
      );
    document
      .getElementById('aboutSkillsList')
      .replaceChildren(...data.skills.map((skill) => this.skillGroup(skill)));

    const name = profile.name.en;
    document.getElementById('resumeTitle').textContent = `Resume — ${name}`;
    document.getElementById('resumeName').textContent = name;
    document.getElementById('resumeFooter').textContent = profile.resumeFooter;
  }

  project(project) {
    const item = document.createElement('li');
    const title = this.link(project.name, project.url);
    const strong = document.createElement('b');
    strong.append(title);
    item.append(strong, ` — ${project.description.en}`);
    if (project.links.length) {
      const links = project.links.map((link) => {
        const linkItem = document.createElement('li');
        linkItem.append(this.link(link.name, link.url));
        if (link.description) linkItem.append(` — ${link.description}`);
        return linkItem;
      });
      const list = document.createElement('ul');
      list.append(...links);
      item.append(list);
    }
    return item;
  }

  skillGroup(skill) {
    const item = document.createElement('li');
    item.append(this.element('b', skill.name.en));
    const keywords = skill.keywords.map((keyword) =>
      this.element('li', keyword),
    );
    const list = document.createElement('ul');
    list.append(...keywords);
    item.append(list);
    return item;
  }

  link(label, url) {
    const link = this.element('a', label);
    link.href = url;
    if (!url.startsWith('mailto:')) {
      link.target = '_blank';
      link.rel = 'noopener';
    }
    return link;
  }

  element(tag, text) {
    const element = document.createElement(tag);
    element.textContent = text;
    return element;
  }
}
