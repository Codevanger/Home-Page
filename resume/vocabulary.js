const SKILL_ALIASES = {
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

const ROLE_ALIASES = {
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
  'you',
  'который',
  'которые',
  'будет',
  'вакансия',
  'кандидат',
  'умеете',
]);

export class Vocabulary {
  static hasTerm(text, term) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(
      `(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`,
      'iu',
    ).test(text);
  }

  static findSkills(text) {
    const found = new Set();
    for (const [skill, aliases] of Object.entries(SKILL_ALIASES)) {
      if (aliases.some((alias) => Vocabulary.hasTerm(text, alias))) {
        found.add(skill);
      }
    }
    return [...found];
  }

  static findRoles(text) {
    const found = new Set();
    for (const [role, aliases] of Object.entries(ROLE_ALIASES)) {
      if (aliases.some((alias) => Vocabulary.hasTerm(text, alias))) {
        found.add(role);
      }
    }
    return [...found];
  }

  static roleMatches(role, text) {
    return ROLE_ALIASES[role].some((alias) => Vocabulary.hasTerm(text, alias));
  }
}
