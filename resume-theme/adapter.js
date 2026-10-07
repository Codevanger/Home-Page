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
  for (const job of r.work || []) {
    job.summary = [job.summary,
      ...(job['x-rolePeriods'] || []).slice().reverse().map(p => `${p.position}: ${p.startDate} - ${p.endDate || 'Present'}`),
      ...(job['x-employerPeriods'] || []).map(p => `${p.name}: ${p.startDate} - ${p.endDate || 'Present'}`),
      ...(job['x-skillExposure'] || []).map(p => `${p.skill}: ${p.scope.replace(/_/g, ' ')}`)
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

function escapeData(value) {
  if (typeof value === 'string') return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;');
  if (Array.isArray(value)) return value.map(escapeData);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k,escapeData(v)]));
  return value;
}
root.ResumeThemeData={adapt,escapeData};
})(globalThis);
