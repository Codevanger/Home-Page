export interface ClarityFunction {
  (method: string, ...args: unknown[]): void;
  q?: unknown[][];
}

type AnalyticsGlobal = typeof globalThis & {
  clarity?: ClarityFunction;
};

class ClarityClient {
  private clarity: ClarityFunction | undefined;
  private readonly pendingEvents: string[] = [];

  constructor(private readonly enabled: boolean) {
    if (!enabled) return;
    this.clarity = (globalThis as AnalyticsGlobal).clarity;
    this.install();
  }

  event(name: string): void {
    if (!this.enabled) return;
    try {
      if (this.clarity) this.clarity('event', name);
      else this.pendingEvents.push(name);
    } catch {
      // Analytics must not interrupt the UI.
    }
  }

  private install(): void {
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.clarity.ms/tag/yqzha72dsi';
    script.onload = () => {
      this.clarity = (globalThis as AnalyticsGlobal).clarity;
      if (!this.clarity) {
        this.pendingEvents.length = 0;
        return;
      }
      for (const name of this.pendingEvents.splice(0)) {
        this.clarity('event', name);
      }
    };
    const firstScript = document.getElementsByTagName('script')[0];
    firstScript?.parentNode?.insertBefore(script, firstScript);
  }
}

export class SiteAnalyticsService {
  private readonly enabled: boolean;
  private clarity: ClarityClient | null = null;
  private active: string | null = null;
  private since: number | null = null;
  private initialized = false;

  constructor(hostname: string) {
    this.enabled = [
      'codevanger.su',
      'www.codevanger.su',
      'codevanger.github.io',
    ].includes(hostname);
  }

  init(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.clarity = new ClarityClient(this.enabled);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.flush();
      else if (this.active) this.since = performance.now();
    });
    globalThis.addEventListener('pagehide', () => this.flush());
    globalThis.addEventListener('pageshow', () => {
      if (this.active && !document.hidden && this.since === null) {
        this.since = performance.now();
      }
    });
    this.trackOutboundLinks();
  }

  event(name: string): void {
    this.clarity?.event(name);
  }

  duration(name: string, milliseconds: number): void {
    const seconds = milliseconds / 1000;
    const bucket =
      seconds < 1
        ? 'under_1s'
        : seconds < 5
          ? '1_5s'
          : seconds < 15
            ? '5_15s'
            : seconds < 60
              ? '15_60s'
              : 'over_60s';
    this.event(`${name}_${bucket}`);
  }

  focus(id: string | null): void {
    if (id === this.active) return;
    this.flush();
    this.active = id;
    if (id) {
      this.event(`window_focus_${id}`);
      if (!document.hidden) this.since = performance.now();
    }
  }

  private flush(): void {
    if (this.active && this.since !== null) {
      this.duration(
        `window_attention_${this.active}`,
        performance.now() - this.since,
      );
    }
    this.since = null;
  }

  private trackOutboundLinks(): void {
    const links = new Map<string, string>([
      ['https://github.com/Codevanger', 'github_profile'],
      ['https://t.me/codevanger', 'telegram'],
      ['https://www.linkedin.com/in/codevanger/', 'linkedin'],
      ['mailto:me@codevanger.su', 'email'],
      ['mailto:codevanger@gmail.com', 'gmail'],
      ['https://github.com/Codevanger/TypeMUD-Client', 'typemud_client'],
      ['https://github.com/Codevanger/TypeMUD-Instance', 'typemud_server'],
      ['https://github.com/Codevanger/TypeMUD-WebAPI', 'typemud_api'],
      [
        'https://store.steampowered.com/app/4620980/Nights_of_the_Sleeping_God/',
        'nights_of_the_sleeping_god',
      ],
      ['https://github.com/Codevanger/active-inference', 'active_inference'],
      ['https://github.com/botoxparty/XP.css', 'xp_css'],
    ]);
    const linkClick = (event: Event): void => {
      if (
        event instanceof MouseEvent &&
        event.type === 'auxclick' &&
        event.button !== 1
      ) {
        return;
      }
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>('a[href]');
      const name = link && links.get(link.getAttribute('href') ?? '');
      if (name) this.event(`outbound_${name}`);
    };
    document.addEventListener('click', linkClick, true);
    document.addEventListener('auxclick', linkClick, true);
    this.event('site_visit');
  }
}
