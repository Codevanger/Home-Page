import type { BuiltResume } from '../../interfaces/resume.ts';

export type ThemeResume = Omit<BuiltResume, 'meta' | 'basics'> & {
    meta: Record<string, unknown>;
    basics: BuiltResume['basics'] & { image?: string };
    education?: Array<{
        startDate?: string;
        endDate?: string;
        area?: string;
    }>;
};

export class ResumeThemeAdapter {
    static adapt(source: BuiltResume): ThemeResume {
        const resume = structuredClone(source) as ThemeResume;
        resume.meta = {};
        if (!resume.basics) throw Error('Resume basics are required.');
        delete resume.basics.image;
        const preferences = resume['x-preferences'] || {};
        resume.basics.summary = [
            resume.basics.summary,
            [
                preferences.remoteOnly && 'Remote work',
                preferences.openToInternationalRelocation &&
                'Open to international relocation',
            ]
                .filter(Boolean)
                .join(' | '),
            resume['x-learning'] && `Learning: ${resume['x-learning']}`,
        ]
            .filter(Boolean)
            .join('\n\n');

        for (const job of resume.work || []) {
            job.summary = [
                job.summary,
                ...(job['x-rolePeriods'] || [])
                    .slice()
                    .reverse()
                    .map(
                        (period) =>
                            `${period.position}: ${period.startDate} - ${period.endDate || 'Present'}`,
                    ),
                ...(job['x-employerPeriods'] || []).map(
                    (period) =>
                        `${period.name}: ${period.startDate} - ${period.endDate || 'Present'}`,
                ),
                (job['x-technologies'] || []).length,
            ]
                .filter(Boolean)
                .join('\n\n');
        }
        for (const project of resume.projects || []) {
            project.description = [
                project.description,
                project['x-status'] &&
                `Status: ${project['x-status'].replace(/_/g, ' ')}`,
                project['x-releaseDate'] && `Release date: ${project['x-releaseDate']}`,
            ]
                .filter(Boolean)
                .join('\n\n');
        }
        for (const entry of resume.education || []) {
            if (!entry.startDate && entry.endDate) {
                entry.area = [entry.area, entry.endDate].filter(Boolean).join(' · ');
            }
        }
        return resume;
    }

    static technologyLists(html: string, resume: BuiltResume): string {
        const markers = [...html.matchAll(/<p>RESUME_TECHNOLOGIES_(\d+)<\/p>/g)];
        for (const marker of markers.reverse()) {
            const job = resume.work[Number(marker[1])];
            if (!job) continue;
            const names = [...new Set(job['x-technologies'] || [])].filter(Boolean);
            const tags = `<ul class="tag-list">${names
                .map((name) => `<li>${ResumeThemeAdapter.escapeData(name)}</li>`)
                .join('')}</ul>`;
            const start = marker.index ?? 0;
            const end = start + marker[0].length;
            let insertAt = end;
            if (/^\s*<ul>/.test(html.slice(end))) {
                const lists = /<\/?ul\b[^>]*>/g;
                lists.lastIndex = end;
                let depth = 0;
                let tag: RegExpExecArray | null;
                while ((tag = lists.exec(html))) {
                    depth += tag[0].startsWith('</') ? -1 : 1;
                    if (depth === 0) {
                        insertAt = lists.lastIndex;
                        break;
                    }
                }
            }
            html =
                html.slice(0, start) +
                html.slice(end, insertAt) +
                tags +
                html.slice(insertAt);
        }
        return html;
    }

    static escapeData(value: string): string;
    static escapeData(value: ThemeResume): ThemeResume;
    static escapeData(value: unknown): unknown;
    static escapeData(value: unknown): unknown {
        if (typeof value === 'string') {
            return value
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        }
        if (Array.isArray(value)) {
            return value.map((item) => ResumeThemeAdapter.escapeData(item));
        }
        if (value && typeof value === 'object') {
            return Object.fromEntries(
                Object.entries(value).map(([key, item]) => [
                    key,
                    ResumeThemeAdapter.escapeData(item),
                ]),
            );
        }
        return value;
    }
}
