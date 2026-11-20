const SKILL_ALIASES: Record<string, readonly string[]> = {
  JavaScript: ['javascript', 'js'],
  TypeScript: ['typescript', 'ts'],
  Angular: ['angular'],
  React: ['react'],
  'Next.js': ['next.js', 'nextjs'],
  Vue: ['vue', 'vue.js'],
  Svelte: ['svelte'],
  'Node.js': ['node.js', 'nodejs', 'node'],
  NestJS: ['nestjs', 'nest'],
  Python: ['python'],
  Django: ['django'],
  Flask: ['flask'],
  FastAPI: ['fastapi'],
  Java: ['java'],
  Kotlin: ['kotlin'],
  Swift: ['swift'],
  Go: ['go', 'golang'],
  Rust: ['rust'],
  WebAssembly: ['webassembly', 'wasm'],
  'C#': ['c#', 'c sharp'],
  'C++': ['c++'],
  '.NET': ['.net', 'dotnet'],
  'ASP.NET Core': ['asp.net core', 'asp.net'],
  PHP: ['php'],
  Ruby: ['ruby'],
  Rails: ['rails', 'ruby on rails'],
  PostgreSQL: ['postgresql', 'postgres'],
  MySQL: ['mysql'],
  MongoDB: ['mongodb', 'mongo'],
  Redis: ['redis'],
  RabbitMQ: ['rabbitmq'],
  Elasticsearch: ['elasticsearch'],
  Kafka: ['kafka'],
  Docker: ['docker'],
  Kubernetes: ['kubernetes', 'k8s'],
  AWS: ['aws', 'amazon web services'],
  Azure: ['azure'],
  GCP: ['gcp', 'google cloud'],
  Terraform: ['terraform'],
  'CI/CD': ['ci/cd', 'ci cd', 'continuous integration'],
  GraphQL: ['graphql'],
  REST: ['rest', 'rest api'],
  Microservices: ['microservices', 'microservice'],
  RxJS: ['rxjs'],
  NgRx: ['ngrx'],
  Redux: ['redux'],
  Electron: ['electron'],
  GIS: ['gis', 'гис'],
  Leaflet: ['leaflet'],
  IndexedDB: ['indexeddb'],
  WebSocket: ['websocket', 'web sockets'],
  SignalR: ['signalr'],
  HTML: ['html', 'html5'],
  CSS: ['css', 'css3'],
  SCSS: ['scss', 'sass'],
  Linux: ['linux'],
  Nginx: ['nginx'],
  Cypress: ['cypress'],
  Playwright: ['playwright'],
  Jest: ['jest'],
};

const ROLE_ALIASES: Record<string, readonly string[]> = {
  Frontend: ['frontend', 'front-end', 'front end', 'фронтенд', 'фронт-энд'],
  Backend: ['backend', 'back-end', 'back end', 'бэкенд', 'бэк-энд'],
  Fullstack: ['fullstack', 'full-stack', 'full stack', 'фулстек', 'фуллстек'],
  Lead: ['lead', 'tech lead', 'team lead', 'тимлид', 'руководитель'],
  Senior: ['senior', 'сеньор', 'синьор'],
  DevOps: ['devops', 'девопс'],
  GIS: ['gis', 'гис'],
};

export const STOP_WORDS = new Set([
  'about',
  'after',
  'and',
  'are',
  'but',
  'for',
  'from',
  'have',
  'our',
  'the',
  'this',
  'that',
  'with',
  'will',
  'you',
  'your',
  'years',
  'experience',
  'работа',
  'требуется',
  'опыт',
  'лет',
  'или',
  'для',
  'наш',
  'наша',
  'мы',
  'который',
  'которые',
  'будет',
  'вакансия',
  'кандидат',
  'умеете',
]);

export class Vocabulary {
  static hasTerm(text: string, term: string): boolean {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(
      `(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`,
      'iu',
    ).test(text);
  }

  static findSkills(text: string): string[] {
    return Vocabulary.findTerms(text, SKILL_ALIASES);
  }

  static findRoles(text: string): string[] {
    return Vocabulary.findTerms(text, ROLE_ALIASES);
  }

  static roleMatches(role: string, text: string): boolean {
    return (ROLE_ALIASES[role] ?? []).some((alias) =>
      Vocabulary.hasTerm(text, alias),
    );
  }

  private static findTerms(
    text: string,
    aliases: Record<string, readonly string[]>,
  ): string[] {
    const found = new Set<string>();
    for (const [name, terms] of Object.entries(aliases)) {
      if (terms.some((term) => Vocabulary.hasTerm(text, term))) found.add(name);
    }
    return [...found];
  }
}
