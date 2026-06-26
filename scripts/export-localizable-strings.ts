import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { translationCatalogs } from '../src/i18n/catalog.generated';
import { serializeLocalizableStrings } from '../src/i18n/parse-localizable-strings';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const localizationsRoot = path.join(projectRoot, 'localizations');

for (const [language, catalog] of Object.entries(translationCatalogs)) {
  const lprojDir = path.join(localizationsRoot, `${language}.lproj`);
  mkdirSync(lprojDir, { recursive: true });
  writeFileSync(
    path.join(lprojDir, 'Localizable.strings'),
    serializeLocalizableStrings(catalog),
    'utf8',
  );
}

console.log('Exported iOS Localizable.strings catalogs.');
