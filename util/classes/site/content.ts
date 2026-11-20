import type { InternalResumeData } from '../../interfaces/resume.ts';
import type { ResumeSource } from '../resume/source.ts';

type Project = InternalResumeData['projects'][number];
type SkillGroup = InternalResumeData['skills'][number];

interface Contact {
  label: string;
  url: string;
  detail?: string;
}

export class ContentService {
  constructor(private readonly source: ResumeSource) {}

  async init(): Promise<void> {
    try {
      const data = await this.source.load();
      this.render(data);
    } catch (error) {
      console.error('Could not load site content', error);
    }
  }

  private render(data: InternalResumeData): void {
    const { profile } = data;
    document
      .getElementById('aboutGeneral')
      ?.replaceChildren(
        ...profile.about.map((text) => this.element('p', text)),
      );

    document
      .getElementById('aboutInterests')
      ?.replaceChildren(
        ...data.interests.map((interest) => this.element('li', interest.name)),
      );

    const contacts: Contact[] = [
      ...profile.profiles.map((contact) => ({
        label: contact.network,
        url: contact.url,
      })),
      {
        label: 'Email',
        url: `mailto:${profile.secondaryEmail ?? ''}`,
        detail: profile.secondaryEmail,
      },
      {
        label: 'Gmail',
        url: `mailto:${profile.email}`,
        detail: profile.email,
      },
    ];
    document.getElementById('aboutContacts')?.replaceChildren(
      ...contacts.map((contact) => {
        const item = document.createElement('li');
        item.append(this.link(contact.label, contact.url));
        if (contact.detail) item.append(` — ${contact.detail}`);
        return item;
      }),
    );

    document
      .getElementById('aboutProjectsList')
      ?.replaceChildren(
        ...data.projects.map((project) => this.project(project)),
      );
    document
      .getElementById('aboutSkillsList')
      ?.replaceChildren(...data.skills.map((skill) => this.skillGroup(skill)));

    const name = profile.name.en ?? '';
    const title = document.getElementById('resumeTitle');
    const heading = document.getElementById('resumeName');
    const footer = document.getElementById('resumeFooter');
    if (title) title.textContent = `Resume — ${name}`;
    if (heading) heading.textContent = name;
    if (footer) footer.textContent = profile.resumeFooter ?? '';
  }

  private project(project: Project): HTMLLIElement {
    const item = document.createElement('li');
    const title = this.link(project.name, project.url);
    const strong = document.createElement('b');
    strong.append(title);
    item.append(strong, ` — ${project.description.en ?? ''}`);
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

  private skillGroup(skill: SkillGroup): HTMLLIElement {
    const item = document.createElement('li');
    item.append(this.element('b', skill.name.en ?? ''));
    const keywords = skill.keywords.map((keyword) =>
      this.element('li', keyword),
    );
    const list = document.createElement('ul');
    list.append(...keywords);
    item.append(list);
    return item;
  }

  private link(label: string, url: string): HTMLAnchorElement {
    const link = this.element('a', label);
    link.href = url;
    if (!url.startsWith('mailto:')) {
      link.target = '_blank';
      link.rel = 'noopener';
    }
    return link;
  }

  private element<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    text: string,
  ): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag);
    element.textContent = text;
    return element;
  }
}
