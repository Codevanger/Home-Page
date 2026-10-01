function initResume() {
  const source =
    "https://raw.githubusercontent.com/Codevanger/Codevanger/main/resume-data.json";
  const $ = (id) => document.getElementById(id);
  const win = $("resume"),
    progress = $("resumeProgress"),
    fill = $("resumeProgressFill");
  const download = $("resumeDownload"),
    error = $("resumeError");
  let active = null,
    sequence = 0,
    pdfURL = null,
    failed = false;
  function stop() {
    sequence++;
    if (active) SiteAnalytics.event('resume_prepare_cancelled');
    active?.abort();
    active = null;
  }
  function ready() {
    progress.classList.remove("indeterminate");
    progress.setAttribute("aria-label", "Resume ready");
    progress.setAttribute("aria-valuenow", "100");
    fill.style.width = "100%";
    download.disabled = false;
  }
  async function prepare() {
    stop();
    const token = sequence;
    const started = performance.now();
    let stage = 'fetch';
    failed = false;
    error.hidden = true;
    download.textContent = "Download";
    download.disabled = true;
    if (pdfURL) {
      SiteAnalytics.event('resume_cache_hit');
      ready();
      return;
    }
    SiteAnalytics.event('resume_prepare_started');
    progress.classList.add("indeterminate");
    progress.removeAttribute("aria-valuenow");
    fill.style.width = "";
    progress.setAttribute("aria-label", "Downloading resume data");
    const controller = new AbortController();
    active = controller;
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(source, {
        signal: controller.signal,
        cache: "no-cache",
        credentials: "omit",
      });
      if (!response.ok) throw Error("Fetch failed");
      const chunks = [];
      let bytes = 0;
      if (response.body) {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (token !== sequence) {
            await reader.cancel();
            return;
          }
          if (done) break;
          bytes += value.byteLength;
          if (bytes > 2 * 1024 * 1024) {
            await reader.cancel();
            throw Error("Too large");
          }
          chunks.push(value);
          progress.setAttribute(
            "aria-label",
            `Downloading resume data: ${Math.ceil(bytes / 1024)} KB`,
          );
        }
      } else {
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength > 2 * 1024 * 1024) throw Error("Too large");
        chunks.push(buffer);
      }
      const content = await new Blob(chunks).text();
      if (token !== sequence) return;
      SiteAnalytics.event('resume_data_loaded');
      SiteAnalytics.duration('resume_fetch_time', performance.now() - started);
      stage = 'pdf';
      progress.setAttribute("aria-label", "Preparing PDF");
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
      if (token !== sequence) return;
      const resume = ResumeData.build(JSON.parse(content), "en");
      const pdf = ResumePDF.create(resume);
      if (token !== sequence) return;
      pdfURL = URL.createObjectURL(pdf);
      SiteAnalytics.event('resume_pdf_ready');
      SiteAnalytics.duration('resume_prepare_time', performance.now() - started);
      ready();
    } catch (e) {
      if (token !== sequence) return;
      SiteAnalytics.event('resume_error_' + (controller.signal.aborted ? 'timeout' : stage));
      failed = true;
      progress.classList.remove("indeterminate");
      progress.setAttribute("aria-label", "Resume unavailable");
      fill.style.width = "0";
      error.textContent = "Could not prepare your resume. Please try again.";
      error.hidden = false;
      download.textContent = "Retry";
      download.disabled = false;
    } finally {
      clearTimeout(timeout);
      if (token === sequence) active = null;
    }
  }
  win.addEventListener("window:open", prepare);
  win.addEventListener("window:hide", stop);
  download.addEventListener("click", () => {
    if (failed) {
      SiteAnalytics.event('resume_retry');
      prepare();
      return;
    }
    if (!pdfURL) return;
    SiteAnalytics.event('resume_download_click');
    const a = document.createElement("a");
    a.href = pdfURL;
    a.download = "Igor-Rybakov-Resume.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
}
