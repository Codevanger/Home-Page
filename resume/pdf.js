const ASSETS = {
  evenTheme: 'https://esm.sh/jsonresume-theme-even@0.26.1',
  proTheme:
    'https://cdn.jsdelivr.net/npm/jsonresume-theme-pro@0.2.0/src/index.js',
  engine: 'https://cdn.jsdelivr.net/npm/dompdf.js@2.0.7/dist/dompdf.min.js',
  purify: 'https://cdn.jsdelivr.net/npm/dompurify@3.2.7/dist/purify.min.js',
  notoRegular:
    'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@ffebf8c1ee449e544955a7e813c54f9b73848eac/hinted/ttf/NotoSans/NotoSans-Regular.ttf',
  notoBold:
    'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@ffebf8c1ee449e544955a7e813c54f9b73848eac/hinted/ttf/NotoSans/NotoSans-Bold.ttf',
  serifRegular:
    'https://cdn.jsdelivr.net/gh/adobe-fonts/source-serif@80d3f8894c09c937bebfa9011247d2e1c79fd6f4/TTF/SourceSerif4-Regular.ttf',
  serifSemibold:
    'https://cdn.jsdelivr.net/gh/adobe-fonts/source-serif@80d3f8894c09c937bebfa9011247d2e1c79fd6f4/TTF/SourceSerif4-Semibold.ttf',
  serifItalic:
    'https://cdn.jsdelivr.net/gh/adobe-fonts/source-serif@80d3f8894c09c937bebfa9011247d2e1c79fd6f4/TTF/SourceSerif4-It.ttf',
};

export class ResumePDF {
  constructor() {
    this.assets = null;
    this.proAssets = null;
  }

  script(url) {
    return new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = url;
      el.onload = resolve;
      el.onerror = () => {
        el.remove();
        reject(Error('Could not load PDF engine'));
      };
      document.head.appendChild(el);
    });
  }

  async resource(url, binary = false) {
    const response = await fetch(url);
    if (!response.ok) throw Error('Could not load ' + url);
    return binary
      ? new Uint8Array(await response.arrayBuffer())
      : response.text();
  }

  load() {
    if (!this.assets) {
      this.assets = Promise.all([
        import(ASSETS.evenTheme),
        this.script(ASSETS.engine),
        this.script(ASSETS.purify),
        this.resource('resume-theme/print.css'),
        this.resource(ASSETS.notoRegular, true),
        this.resource(ASSETS.notoBold, true),
      ]).catch((error) => {
        this.assets = null;
        throw error;
      });
    }
    return this.assets;
  }

  loadPro() {
    if (!this.proAssets) {
      this.proAssets = Promise.all([
        import(ASSETS.proTheme),
        this.script(ASSETS.engine),
        this.script(ASSETS.purify),
        this.resource(ASSETS.serifRegular, true),
        this.resource(ASSETS.serifSemibold, true),
        this.resource(ASSETS.serifItalic, true),
      ]).catch((error) => {
        this.proAssets = null;
        throw error;
      });
    }
    return this.proAssets;
  }

  base64(bytes) {
    let value = '';
    for (let index = 0; index < bytes.length; index += 32768) {
      value += String.fromCharCode(...bytes.subarray(index, index + 32768));
    }
    return btoa(value);
  }

  sanitize(html) {
    return DOMPurify.sanitize(html, {
      WHOLE_DOCUMENT: true,
      FORBID_TAGS: ['script', 'link', 'img', 'iframe', 'object', 'embed'],
      FORBID_ATTR: ['style'],
    });
  }

  async prepareDocument(resume, themeName) {
    if (themeName === 'pro') {
      const [theme, , , regular, semibold, italic] = await this.loadPro();
      return {
        html: this.sanitize(theme.render(resume)),
        fontFamily: 'Source Serif 4',
        fontFaces: [
          { weight: 400, style: 'normal', bytes: regular },
          { weight: 600, style: 'normal', bytes: semibold },
          { weight: 400, style: 'italic', bytes: italic },
        ],
        extraStyle: `
          @font-face{font-family:'Source Serif 4';src:url(data:font/ttf;base64,${this.base64(regular)});font-weight:400;font-style:normal}
          @font-face{font-family:'Source Serif 4';src:url(data:font/ttf;base64,${this.base64(semibold)});font-weight:600;font-style:normal}
          @font-face{font-family:'Source Serif 4';src:url(data:font/ttf;base64,${this.base64(italic)});font-weight:400;font-style:italic}
        `,
      };
    }

    const [theme, , , css, regular, bold] = await this.load();
    const data = ResumeThemeData.escapeData(ResumeThemeData.adapt(resume));
    return {
      html: this.sanitize(
        ResumeThemeData.technologyLists(theme.render(data), resume),
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

  async create(
    resume,
    { signal, onProgress = () => {}, theme: themeName = 'even' } = {},
  ) {
    const check = () => {
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    };
    check();
    onProgress({ stage: 'assets' });
    const { html, fontFamily, fontFaces, extraStyle } =
      await this.prepareDocument(resume, themeName);
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
      const loaded = new Promise((resolve, reject) => {
        frame.onload = resolve;
        frame.onerror = () => reject(Error('Could not prepare resume layout'));
      });
      frame.srcdoc = '<!doctype html>' + parsed.documentElement.outerHTML;
      document.body.append(frame);
      await loaded;
      check();
      const doc = frame.contentDocument;
      await Promise.all(
        fontFaces.map((face) =>
          doc.fonts.load(`${face.style} ${face.weight} 10pt "${fontFamily}"`),
        ),
      );
      await doc.fonts.ready;
      check();
      const engine =
        typeof window.dompdf === 'function'
          ? window.dompdf
          : window.dompdf.default;
      const pdf = await engine(doc.body, {
        format: 'letter',
        marginPt: [40, 45, 40, 45],
        pagination: true,
        compress: true,
        putOnlyUsedFonts: true,
        backgroundColor: '#ffffff',
        fontConfig: fontFaces.map((face) => ({
          fontFamily,
          fontBytes: face.bytes,
          fontWeight: face.weight,
          fontStyle: face.style,
        })),
        metadata: {
          title: resume.basics.name + ' — Resume',
          author: resume.basics.name,
        },
        onProgress: (progress) => {
          if (!signal?.aborted) onProgress(progress);
        },
      });
      check();
      if (!(pdf instanceof Blob) || (await pdf.slice(0, 5).text()) !== '%PDF-')
        throw Error('Invalid generated PDF');
      return pdf;
    } finally {
      frame.remove();
    }
  }
}

export const resumePDF = new ResumePDF();
