import type { BuiltResume } from '../../interfaces/resume.ts';
import { ResumeThemeAdapter, type ThemeResume } from './adapter.ts';
import printCss from '../../../styles/print.scss?inline';
import resumePdfCss from '../../../styles/resume-pdf.scss?inline';

const ASSETS = {
  evenTheme: 'https://esm.sh/jsonresume-theme-even@0.26.1',
  compactTheme: 'https://esm.sh/jsonresume-theme-one-page-essential@0.2.0',
  engine: 'https://cdn.jsdelivr.net/npm/dompdf.js@2.0.7/dist/dompdf.min.js',
  purify: 'https://cdn.jsdelivr.net/npm/dompurify@3.2.7/dist/purify.min.js',
  notoRegular:
    'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@ffebf8c1ee449e544955a7e813c54f9b73848eac/hinted/ttf/NotoSans/NotoSans-Regular.ttf',
  notoBold:
    'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@ffebf8c1ee449e544955a7e813c54f9b73848eac/hinted/ttf/NotoSans/NotoSans-Bold.ttf',
} as const;

export interface ResumePDFProgress {
  stage: 'assets' | 'rendering';
  totalPages: number;
  currentPage: number;
}

export interface DOMPurifyApi {
  sanitize(
    html: string,
    options: {
      WHOLE_DOCUMENT: boolean;
      FORBID_TAGS: string[];
      FORBID_ATTR: string[];
    },
  ): string;
}

interface ResumeThemeModule {
  render(resume: BuiltResume | ThemeResume): string;
}

interface FontFaceData {
  weight: number;
  style: 'normal' | 'italic';
  bytes: Uint8Array;
}

export interface DompdfOptions {
  format: string;
  marginPt: number[];
  pagination: boolean;
  compress: boolean;
  putOnlyUsedFonts: boolean;
  backgroundColor: string;
  pageConfig?: {
    footer: {
      content: string;
      height: number;
      padding: number[];
    };
  };
  fontConfig: Array<{
    fontFamily: string;
    fontBytes: Uint8Array;
    fontWeight: number;
    fontStyle: string;
  }>;
  metadata: { title: string; author: string };
  onProgress: (progress: ResumePDFProgress) => void;
}

export interface DompdfEngine {
  (element: HTMLElement, options: DompdfOptions): Promise<Blob>;
}

export interface ResumePDFOptions {
  signal?: AbortSignal;
  onProgress?: (progress: ResumePDFProgress) => void;
  theme?: 'even' | 'compact';
}

type PdfGlobal = typeof globalThis & {
  DOMPurify?: DOMPurifyApi;
  dompdf?: DompdfEngine | { default: DompdfEngine };
};

interface LoadedPdfLibraries {
  purify: DOMPurifyApi;
  engine: DompdfEngine;
}

interface PreparedDocument extends LoadedPdfLibraries {
  html: string;
  fontFamily: string;
  fontFaces: FontFaceData[];
  extraStyle: string;
}

class PdfLibraries {
  private promise: Promise<LoadedPdfLibraries> | null = null;

  load(): Promise<LoadedPdfLibraries> {
    const loaded = this.read();
    if (loaded) return Promise.resolve(loaded);
    if (!this.promise) {
      this.promise = Promise.all([
        this.script(ASSETS.engine),
        this.script(ASSETS.purify),
      ])
        .then(() => {
          const libraries = this.read();
          if (!libraries) throw Error('PDF libraries are unavailable');
          return libraries;
        })
        .catch((error: unknown) => {
          this.promise = null;
          throw error;
        });
    }
    return this.promise;
  }

  private read(): LoadedPdfLibraries | null {
    const globals = globalThis as PdfGlobal;
    const engine =
      typeof globals.dompdf === 'function'
        ? globals.dompdf
        : globals.dompdf?.default;
    return globals.DOMPurify && engine
      ? { purify: globals.DOMPurify, engine }
      : null;
  }

  private script(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const element = document.createElement('script');
      element.src = url;
      element.onload = () => resolve();
      element.onerror = () => {
        element.remove();
        reject(Error('Could not load PDF engine'));
      };
      document.head.appendChild(element);
    });
  }
}

type EvenAssets = [
  ResumeThemeModule,
  LoadedPdfLibraries,
  string,
  Uint8Array,
  Uint8Array,
];
type CompactAssets = [
  ResumeThemeModule,
  LoadedPdfLibraries,
  Uint8Array,
  Uint8Array,
];

class ResumePdfAssets {
  private assets: Promise<EvenAssets> | null = null;
  private compactAssets: Promise<CompactAssets> | null = null;

  constructor(private readonly libraries = new PdfLibraries()) {}

  async prepareDocument(
    resume: BuiltResume,
    themeName: 'even' | 'compact',
  ): Promise<PreparedDocument> {
    if (themeName === 'compact') {
      const [theme, libraries, regular, bold] = await this.loadCompact();
      const data = {
        ...resume,
        projects: resume.projects.map((project) => ({
          ...project,
          keywords: [],
          roles: [],
        })),
      };
      return {
        ...libraries,
        html: this.sanitize(libraries.purify, theme.render(data)),
        fontFamily: 'ResumeSans',
        fontFaces: [
          { weight: 400, style: 'normal', bytes: regular },
          { weight: 700, style: 'normal', bytes: bold },
        ],
        extraStyle: `
          ${resumePdfCss}
          @font-face{font-family:ResumeSans;src:url(data:font/ttf;base64,${this.base64(regular)});font-weight:400}
          @font-face{font-family:ResumeSans;src:url(data:font/ttf;base64,${this.base64(bold)});font-weight:700}
        `,
      };
    }

    const [theme, libraries, css, regular, bold] = await this.load();
    const data = ResumeThemeAdapter.escapeData(
      ResumeThemeAdapter.adapt(resume),
    );
    return {
      ...libraries,
      html: this.sanitize(
        libraries.purify,
        ResumeThemeAdapter.technologyLists(theme.render(data), resume),
      ),
      fontFamily: 'ResumeSans',
      fontFaces: [
        { weight: 400, style: 'normal', bytes: regular },
        { weight: 700, style: 'normal', bytes: bold },
      ],
      extraStyle:
        css.replace('@media print {', '@media screen, print {') +
        `
        @font-face{font-family:ResumeSans;src:url(data:font/ttf;base64,${this.base64(regular)});font-weight:400}
        @font-face{font-family:ResumeSans;src:url(data:font/ttf;base64,${this.base64(bold)});font-weight:700}
        html,body{font-family:ResumeSans,sans-serif!important} body{width:100%;padding:0} .icon-list svg{display:none} .masthead{text-align:left} li::marker{content:"- "} .icon-list>li::marker,.tag-list>li::marker{content:""}
      `,
    };
  }

  private load(): Promise<EvenAssets> {
    if (!this.assets) {
      this.assets = Promise.all([
        import(ASSETS.evenTheme) as Promise<ResumeThemeModule>,
        this.libraries.load(),
        Promise.resolve(printCss),
        this.resource(ASSETS.notoRegular, true),
        this.resource(ASSETS.notoBold, true),
      ]).catch((error: unknown) => {
        this.assets = null;
        throw error;
      });
    }
    return this.assets;
  }

  private loadCompact(): Promise<CompactAssets> {
    if (!this.compactAssets) {
      this.compactAssets = Promise.all([
        import(ASSETS.compactTheme) as Promise<ResumeThemeModule>,
        this.libraries.load(),
        this.resource(ASSETS.notoRegular, true),
        this.resource(ASSETS.notoBold, true),
      ]).catch((error: unknown) => {
        this.compactAssets = null;
        throw error;
      });
    }
    return this.compactAssets;
  }

  private async resource(url: string): Promise<string>;
  private async resource(url: string, binary: true): Promise<Uint8Array>;
  private async resource(
    url: string,
    binary = false,
  ): Promise<string | Uint8Array> {
    const response = await fetch(url);
    if (!response.ok) throw Error(`Could not load ${url}`);
    return binary
      ? new Uint8Array(await response.arrayBuffer())
      : response.text();
  }

  private base64(bytes: Uint8Array): string {
    let value = '';
    for (let index = 0; index < bytes.length; index += 32768) {
      value += String.fromCharCode(...bytes.subarray(index, index + 32768));
    }
    return btoa(value);
  }

  private sanitize(purify: DOMPurifyApi, html: string): string {
    return purify.sanitize(html, {
      WHOLE_DOCUMENT: true,
      FORBID_TAGS: ['script', 'link', 'img', 'iframe', 'object', 'embed'],
      FORBID_ATTR: ['style'],
    });
  }
}

export class ResumePDF {
  constructor(private readonly assets = new ResumePdfAssets()) {}

  async pageCount(pdf: Blob): Promise<number> {
    const content = await pdf.text();
    return (content.match(/\/Type\s*\/Page\b/g) || []).length;
  }

  async create(
    resume: BuiltResume,
    {
      signal,
      onProgress = () => {},
      theme: themeName = 'even',
    }: ResumePDFOptions = {},
  ): Promise<Blob> {
    const check = (): void => {
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    };
    check();
    onProgress({ stage: 'assets', totalPages: 0, currentPage: 0 });
    const { html, fontFamily, fontFaces, extraStyle, engine } =
      await this.assets.prepareDocument(resume, themeName);
    check();
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const policy = parsed.createElement('meta');
    policy.httpEquiv = 'Content-Security-Policy';
    policy.content =
      "default-src 'none'; style-src 'unsafe-inline'; font-src data:; base-uri 'none'; form-action 'none'";
    parsed.head.prepend(policy);
    if (extraStyle) {
      const style = parsed.createElement('style');
      style.textContent = extraStyle;
      parsed.head.append(style);
    }
    const frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-same-origin');
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.style.cssText =
      'position:fixed;left:-12000px;top:0;width:695px;height:1000px;border:0;pointer-events:none;';
    try {
      const loaded = new Promise<void>((resolve, reject) => {
        frame.onload = () => resolve();
        frame.onerror = () => reject(Error('Could not prepare resume layout'));
      });
      frame.srcdoc = '<!doctype html>' + parsed.documentElement.outerHTML;
      document.body.append(frame);
      await loaded;
      check();
      const doc = frame.contentDocument;
      if (!doc) throw Error('Could not access resume layout');
      await Promise.all(
        fontFaces.map((face) =>
          doc.fonts.load(`${face.style} ${face.weight} 10pt "${fontFamily}"`),
        ),
      );
      await doc.fonts.ready;
      check();
      const pdf = await engine(doc.body, {
        format: 'letter',
        marginPt: [20, 45, 40, 45],
        pagination: true,
        compress: true,
        putOnlyUsedFonts: true,
        backgroundColor: '#ffffff',
        pageConfig: {
          footer: { content: '', height: 0, padding: [0, 0, 0, 0] },
        },
        fontConfig: fontFaces.map((face) => ({
          fontFamily,
          fontBytes: face.bytes,
          fontWeight: face.weight,
          fontStyle: face.style,
        })),
        metadata: {
          title: `${resume.basics.name} — Resume`,
          author: resume.basics.name,
        },
        onProgress: (progress: ResumePDFProgress) => {
          if (!signal?.aborted) onProgress(progress);
        },
      });
      check();
      if (
        !(pdf instanceof Blob) ||
        (await pdf.slice(0, 5).text()) !== '%PDF-'
      ) {
        throw Error('Invalid generated PDF');
      }
      return pdf;
    } finally {
      frame.remove();
    }
  }
}
