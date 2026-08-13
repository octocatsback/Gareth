export function toPlainText(value) {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`*_]/g, '')
    .trim();
}

export function extractDateFromText(value) {
  const match = value.match(
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}|(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i
  );

  return match ? match[0] : '';
}

export function getPostedDate({ sourceLabel, summary }) {
  return extractDateFromText(sourceLabel || '') || extractDateFromText(summary || '');
}

export function getMarkdownSections(markdown) {
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

export function splitSectionEntries(section) {
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

export function isSourceLine(line) {
  const normalized = line.replace(/^>\s*/, '').trim();
  return /^\*?source:/i.test(normalized);
}

export function isTableLine(line) {
  return /^\|.*\|$/.test(line);
}

export function getEntryContent(entryLines) {
  const paragraphs = [];
  const bullets = [];

  for (const line of entryLines) {
    const trimmedLine = line.trim();

    if (!trimmedLine || isSourceLine(trimmedLine) || isTableLine(trimmedLine)) {
      continue;
    }

    if (trimmedLine.startsWith('- ')) {
      bullets.push(toPlainText(trimmedLine.replace(/^-\s+/, '')));
      continue;
    }

    paragraphs.push(toPlainText(trimmedLine.replace(/^>\s*/, '')));
  }

  return {
    paragraphs,
    bullets,
    summary: paragraphs[0] ?? bullets.join(' '),
  };
}

export function getSourceMetadata(sourceLine) {
  if (!sourceLine) {
    return { label: '', href: '' };
  }

  const normalized = sourceLine
    .replace(/^>\s*/, '')
    .trim()
    .replace(/^\*/, '')
    .replace(/\*$/, '')
    .replace(/^Source:\s*/i, '');
  const href = normalized.match(/\[[^\]]+\]\((https?:\/\/[^)\s]+)\)/)?.[1] ?? '';

  return {
    label: toPlainText(normalized),
    href,
  };
}

export function parseContentUpdates(markdown) {
  return getMarkdownSections(markdown)
    .flatMap((section) => splitSectionEntries(section).map((entry) => {
      const { paragraphs, bullets, summary } = getEntryContent(entry.lines);
      const sourceLine = entry.lines.find((line) => isSourceLine(line.trim()));
      const source = getSourceMetadata(sourceLine);

      return {
        type: 'From github-info.md',
        date: getPostedDate({ sourceLabel: source.label, summary }),
        section: section.title,
        title: entry.title,
        summary,
        href: source.href || '#content-sources',
        bullets,
        sourceLabel: source.label,
        hasDetails: paragraphs.length > 0 || bullets.length > 0,
      };
    }))
    .filter((update) => update.summary && update.hasDetails)
    .map(({ hasDetails, ...update }) => update);
}
