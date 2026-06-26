import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { serializeLocalizableStrings } from '../src/i18n/parse-localizable-strings.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const localizationsRoot = path.join(projectRoot, 'localizations');

const NEW_LANGUAGES = ['es', 'ar', 'ja', 'zh', 'id', 'pt', 'fr'];

for (const language of NEW_LANGUAGES) {
  const catalogPath = path.join(localizationsRoot, 'catalogs', `${language}.json`);
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  const lprojDir = path.join(localizationsRoot, `${language}.lproj`);

  mkdirSync(lprojDir, { recursive: true });
  writeFileSync(
    path.join(lprojDir, 'Localizable.strings'),
    serializeLocalizableStrings(catalog),
    'utf8',
  );
  writeFileSync(
    path.join(lprojDir, 'InfoPlist.strings'),
    '"CFBundleDisplayName" = "Fixtura";\n"CFBundleName" = "Fixtura";\n',
    'utf8',
  );

  console.log(`Wrote ${language}.lproj (${Object.keys(catalog).length} keys)`);
}
