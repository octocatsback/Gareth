const MONTH_DATE_PATTERN =
  /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}|(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i;
const ISO_DATE_PATTERN = /\b(\d{4})-(\d{2})-(\d{2})\b/;
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

export function toPlainText(value) {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`*_]/g, '')
    .trim();
}

export function extractDateFromText(value = '') {
  const monthDate = value.match(MONTH_DATE_PATTERN);
  if (monthDate) {
    return monthDate[0];
  }

  const isoDate = value.match(ISO_DATE_PATTERN);
  if (!isoDate) {
    return '';
  }

  const [, yearText, monthText, dayText] = isoDate;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return '';
  }

  return dateFormatter.format(date);
}

export function parseSourceLine(line) {
  const normalized = line.trim().replace(/^(?:>\s*)+/, '').trim();
  const plainText = toPlainText(normalized);

  if (!/^source\s*:/i.test(plainText)) {
    return null;
  }

  const markdownLink = normalized.match(
    /\[[^\]]+\]\((https?:\/\/[^)\s]+)(?:\s+["'][^"']*["'])?\)/i
  );
  const bareLink = normalized.match(/https?:\/\/[^\s<>)]+/i);
  const href = (markdownLink?.[1] ?? bareLink?.[0] ?? '').replace(/[.,;:]$/, '');
  const label = plainText
    .replace(/^source\s*:\s*/i, '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*[·|—–-]\s*$/, '')
    .trim();

  return { label, href };
}

function getPostedDate({ sourceLabel, summary, fallbackDate }) {
  return (
    extractDateFromText(sourceLabel) ||
    extractDateFromText(summary) ||
    fallbackDate
  );
}

function getMarkdownSections(markdown) {
  const sections = [];
  let currentSection;

  for (const line of markdown.split('\n')) {
    if (line.startsWith('## ')) {
      if (currentSection) {
        sections.push(currentSection);
      }

      currentSection = {
        title: toPlainText(line.replace(/^##\s+/, '')),
        lines: [],
      };

      continue;
    }

    if (currentSection && !line.startsWith('# ')) {
      currentSection.lines.push(line);
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

function splitSectionEntries(section) {
  const entries = [];
  let currentEntry = {
    title: section.title,
    lines: [],
  };

  for (const line of section.lines) {
    if (line.startsWith('### ')) {
      entries.push(currentEntry);
      currentEntry = {
        title: toPlainText(line.replace(/^###\s+/, '')),
        lines: [],
      };
      continue;
    }

    currentEntry.lines.push(line);
  }

  entries.push(currentEntry);
  return entries;
}

function isTableLine(line) {
  return /^\|.*\|$/.test(line);
}

function getEntryContent(entryLines) {
  const paragraphs = [];
  const bullets = [];

  for (const line of entryLines) {
    const trimmedLine = line.trim();

    if (!trimmedLine || parseSourceLine(trimmedLine) || isTableLine(trimmedLine)) {
      continue;
    }

    if (trimmedLine.startsWith('- ')) {
      bullets.push(toPlainText(trimmedLine.replace(/^-\s+/, '')));
      continue;
    }

    paragraphs.push(toPlainText(trimmedLine.replace(/^>\s*/, '')));
  }

  return {
    bullets: paragraphs.length > 0 ? bullets : bullets.slice(1),
    summary: paragraphs[0] ?? bullets[0] ?? '',
    hasDetails: paragraphs.length > 0 || bullets.length > 0,
  };
}

export function parseGithubInfoMarkdown(
  markdown,
  { fallbackDate = dateFormatter.format(new Date()) } = {}
) {
  return getMarkdownSections(markdown)
    .flatMap((section) =>
      splitSectionEntries(section).map((entry) => {
        const { bullets, summary, hasDetails } = getEntryContent(entry.lines);
        const source = entry.lines
          .map((line) => parseSourceLine(line))
          .find(Boolean) ?? { label: '', href: '' };

        return {
          type: 'From github-info.md',
          date: getPostedDate({
            sourceLabel: source.label,
            summary,
            fallbackDate,
          }),
          section: section.title,
          title: entry.title,
          summary,
          href: source.href || '#content-sources',
          bullets,
          sourceLabel: source.label,
          hasDetails,
        };
      })
    )
    .filter((update) => update.summary && update.hasDetails)
    .map(({ hasDetails, ...update }) => update);
}
