(function (root) {
  function create(resume, PDF = root.jspdf.jsPDF) {
    const doc = new PDF({ unit: "mm", format: "letter" });
    const left = 18,
      width = 180,
      bottom = 258;
    let y = 19;
    const clean = (s) =>
      String(s ?? "")
        .replace(/→/g, " to ")
        .replace(/[–—]/g, "-")
        .replace(/[‘’]/g, "'")
        .replace(/[“”]/g, '"')
        .replace(/\u00a0/g, " ");
    const space = (height) => {
      if (y + height > bottom) {
        doc.addPage();
        y = 19;
      }
    };
    function text(value, size = 10, bold = false, indent = 0) {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      doc.setTextColor(30);
      const lines = doc.splitTextToSize(clean(value), width - indent);
      const lineHeight = size * 0.43;
      if (lines.length * lineHeight < bottom - 20)
        space(lines.length * lineHeight);
      for (const line of lines) {
        space(lineHeight);
        doc.text(line, left + indent, y);
        y += lineHeight;
      }
      y += 1.6;
    }
    function section(title) {
      space(22);
      y += 3;
      text(title.toUpperCase(), 10, true);
      doc.setDrawColor(30);
      doc.setLineWidth(0.2);
      doc.line(left, y - 1, left + width, y - 1);
      y += 4;
    }
    text(resume.basics.name, 24, true);
    text(resume.basics.label, 11, true);
    text(
      resume.basics.email +
        " | " +
        resume.basics.location.city +
        ", " +
        resume.basics.location.countryCode,
      9,
    );
    text("Remote work | Open to international relocation", 9);
    section("Profile");
    text(resume.basics.summary);
    section("Experience");
    for (const job of resume.work) {
      space(job["x-rolePeriods"] ? 55 : 34);
      const dates = job.startDate + " - " + (job.endDate || "Present");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const dateWidth = doc.getTextWidth(dates);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      const companyLines = doc.splitTextToSize(
        clean(job.name),
        width - dateWidth - 8,
      );
      doc.setTextColor(30);
      doc.text(companyLines, left, y, { lineHeightFactor: 1.22 });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(dates, left + width, y, { align: "right" });
      y += companyLines.length * 4.8 + 1.6;
      text(job.position, 10, true);
      text(job.summary);
      for (const period of job["x-rolePeriods"] || [])
        text(
          period.position + ": " + period.startDate + " - " + period.endDate,
          9,
        );
      for (const period of job["x-employerPeriods"] || [])
        text(period.name + ": " + period.startDate + " - " + period.endDate, 9);
      for (const highlight of job.highlights) {
        space(14);
        text("- " + highlight, 10, false, 2);
      }
      for (const exposure of job["x-skillExposure"] || [])
        text(exposure.skill + ": " + exposure.scope.replace(/_/g, " "), 9);
      y += 3;
    }
    section("Skills");
    for (const skill of resume.skills)
      text(skill.name + ": " + skill.keywords.join(", "));
    section("Projects");
    for (const project of resume.projects) {
      space(24);
      text(project.name, 11, true);
      text(project.description);
      text(project.url, 8);
      if (project.roles?.length) text("Role: " + project.roles.join(", "), 9);
      if (project.keywords?.length)
        text("Technologies: " + project.keywords.join(", "), 9);
      if (project["x-status"])
        text("Status: " + project["x-status"].replace(/_/g, " "), 9);
      if (project["x-releaseDate"])
        text("Release date: " + project["x-releaseDate"], 9);
    }
    section("Publications");
    for (const publication of resume.publications) {
      space(24);
      text(publication.name, 11, true);
      text(publication.publisher + " | " + publication.releaseDate, 9);
      text(publication.summary);
      text(publication.url, 8);
    }
    section("Languages");
    for (const language of resume.languages)
      text(language.language + ": " + language.fluency);
    section("Learning");
    text(resume["x-learning"]);
    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page++) {
      doc.setPage(page);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`${page} / ${pages}`, 198, 269, { align: "right" });
    }
    doc.setProperties({
      title: resume.basics.name + " - Resume",
      author: resume.basics.name,
    });
    return doc.output("blob");
  }
  root.ResumePDF = { create };
  if (typeof module !== "undefined") module.exports = root.ResumePDF;
})(globalThis);
