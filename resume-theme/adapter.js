(function(root){
function adapt(source) {
  const r = structuredClone(source);
  r.meta = {}; // Do not accept CSS from imported resumes.
  if (!r.basics) throw Error('Resume basics are required.');
  delete r.basics.image; // Offline, text-based PDF.
  const preferences = r['x-preferences'] || {};
  r.basics.summary = [r.basics.summary,
    [preferences.remoteOnly && 'Remote work', preferences.openToInternationalRelocation && 'Open to international relocation'].filter(Boolean).join(' | '),
    r['x-learning'] && `Learning: ${r['x-learning']}`].filter(Boolean).join('\n\n');
  for (const [index, job] of (r.work || []).entries()) {
    job.summary = [job.summary,
      ...(job['x-rolePeriods'] || []).slice().reverse().map(p => `${p.position}: ${p.startDate} - ${p.endDate || 'Present'}`),
      ...(job['x-employerPeriods'] || []).map(p => `${p.name}: ${p.startDate} - ${p.endDate || 'Present'}`),
      ((job['x-technologies'] || []).length || (job['x-skillExposure'] || []).length) ? `RESUME_TECHNOLOGIES_${index}` : ''
    ].filter(Boolean).join('\n\n');
  }
  for (const project of r.projects || []) {
    project.description = [project.description,
      project['x-status'] && `Status: ${project['x-status'].replace(/_/g, ' ')}`,
      project['x-releaseDate'] && `Release date: ${project['x-releaseDate']}`
    ].filter(Boolean).join('\n\n');
  }
  // Even prints education dates only if startDate exists. Preserve an end-only date as text.
  for (const entry of r.education || []) {
    if (!entry.startDate && entry.endDate) entry.area = [entry.area, entry.endDate].filter(Boolean).join(' · ');
  }
  return r;
}


function technologyLists(html, resume) {
  const markers = [...html.matchAll(/<p>RESUME_TECHNOLOGIES_(\d+)<\/p>/g)];
  for (const marker of markers.reverse()) {
    const job = resume.work[Number(marker[1])];
    const names = [...new Set([...(job['x-technologies'] || []), ...(job['x-skillExposure'] || []).map(p => p.skill)])].filter(Boolean);
    const tags = `<ul class="tag-list">${names.map(name => `<li>${escapeData(name)}</li>`).join('')}</ul>`;
    const start = marker.index;
    const end = start + marker[0].length;
    let insertAt = end;
    // Even renders highlights immediately after the summary. Skip the entire
    // list, including nested lists, before placing the technology tags.
    if (/^\s*<ul>/.test(html.slice(end))) {
      const lists = /<\/?ul\b[^>]*>/g;
      lists.lastIndex = end;
      let depth = 0, tag;
      while ((tag = lists.exec(html))) {
        depth += tag[0].startsWith('</') ? -1 : 1;
        if (depth === 0) { insertAt = lists.lastIndex; break; }
      }
    }
    html = html.slice(0, start) + html.slice(end, insertAt) + tags + html.slice(insertAt);
  }
  return html;
}

function escapeData(value) {
  if (typeof value === 'string') return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;');
  if (Array.isArray(value)) return value.map(escapeData);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k,escapeData(v)]));
  return value;
}
root.ResumeThemeData={adapt,escapeData,technologyLists};
})(globalThis);
