export function parseLocalizableStrings(source: string): Record<string, string> {
  const entries: Record<string, string> = {};
  const pattern = /"((?:\\.|[^"\\])*)"\s*=\s*"((?:\\.|[^"\\])*)"\s*;/g;

  for (const match of source.matchAll(pattern)) {
    entries[unescapeLocalizableString(match[1]!)] = unescapeLocalizableString(match[2]!);
  }

  return entries;
}

export function serializeLocalizableStrings(entries: Record<string, string>): string {
  const lines = Object.entries(entries)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(
      ([key, value]) =>
        `"${escapeLocalizableString(key)}" = "${escapeLocalizableString(value)}";`,
    );

  return `${lines.join('\n')}\n`;
}

function escapeLocalizableString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function unescapeLocalizableString(value: string): string {
  let output = '';
  let index = 0;

  while (index < value.length) {
    const char = value[index];

    if (char !== '\\') {
      output += char;
      index += 1;
      continue;
    }

    const next = value[index + 1];

    switch (next) {
      case 'n':
        output += '\n';
        break;
      case 'r':
        output += '\r';
        break;
      case 't':
        output += '\t';
        break;
      case '\\':
        output += '\\';
        break;
      case '"':
        output += '"';
        break;
      default:
        output += next ?? '';
        break;
    }

    index += 2;
  }

  return output;
}
