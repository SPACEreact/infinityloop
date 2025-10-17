export type StructuredFields = Record<string, string>;

export const normalizeFieldKey = (label: string): string =>
  label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

export const formatFieldLabel = (key: string): string =>
  key
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const parseStructuredFields = (content: string | null | undefined): StructuredFields => {
  if (!content) {
    return {};
  }

  const fields: StructuredFields = {};
  let currentKey: string | null = null;

  content.split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');

    if (colonIndex <= 0) {
      if (currentKey && line.trim()) {
        fields[currentKey] = fields[currentKey]
          ? `${fields[currentKey]}\n${line.trim()}`
          : line.trim();
      }
      return;
    }

    const rawKey = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    if (!rawKey) {
      return;
    }

    const key = normalizeFieldKey(rawKey);
    if (!key) {
      return;
    }

    fields[key] = value;
    currentKey = key;
  });

  return fields;
};

export const buildStructuredContent = (fields: StructuredFields): string => {
  return Object.entries(fields)
    .map(([key, value]) => `${formatFieldLabel(key)}: ${value}`)
    .join('\n');
};

export const applyFieldUpdate = (
  content: string | null | undefined,
  fieldKey: string,
  value: string,
  mode: 'replace' | 'append' = 'replace'
): string => {
  const fields = parseStructuredFields(content);
  const normalizedKey = normalizeFieldKey(fieldKey);
  const existingValue = fields[normalizedKey];

  fields[normalizedKey] = mode === 'append' && existingValue
    ? `${existingValue}\n${value}`
    : value;

  return buildStructuredContent(fields);
};
