import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

async function load(path) {
  const source = await readFile(path, 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const context = { exports: {}, URL }; vm.runInNewContext(output, context); return context.exports;
}
const { countdownUnits } = await load('lib/countdown.ts');
const { normalizeUrl } = await load('lib/urls.ts');
const now = Date.parse('2026-09-20T10:00:00Z');
const plain = value => JSON.parse(JSON.stringify(value));
assert.deepEqual(plain(countdownUnits('2026-11-22T10:00:00Z', now)), [{ value: 2, label: 'mois' }, { value: 2, label: 'jours' }]);
assert.deepEqual(plain(countdownUnits('2026-09-22T15:00:00Z', now)), [{ value: 2, label: 'jours' }, { value: 5, label: 'heures' }]);
assert.deepEqual(plain(countdownUnits('2026-09-20T12:35:00Z', now)), [{ value: 2, label: 'heures' }, { value: 35, label: 'minutes' }]);
assert.deepEqual(plain(countdownUnits('2026-09-20T10:03:45Z', now)), [{ value: 3, label: 'minutes' }, { value: 45, label: 'secondes' }]);
assert.deepEqual(plain(countdownUnits('2026-09-20T10:00:00Z', now)), []);
assert.deepEqual(plain(countdownUnits('invalid', now)), []);
assert.deepEqual(plain(countdownUnits('2027-02-28T10:00:00Z', Date.parse('2027-01-31T10:00:00Z'))), [{ value: 1, label: 'mois' }, { value: 0, label: 'jour' }]);
assert.equal(normalizeUrl('ae2v.fr/photos?a=1#albums'), 'https://ae2v.fr/photos?a=1#albums');
assert.equal(normalizeUrl(' http://ae2v.fr '), 'http://ae2v.fr/');
assert.equal(normalizeUrl('mailto:ae2v.asso@gmail.com'), 'mailto:ae2v.asso@gmail.com');
for (const invalid of ['javascript:alert(1)', 'data:text/html,test', 'ftp://ae2v.fr', 'https://', '', 'https://name:password@ae2v.fr']) assert.throws(() => normalizeUrl(invalid));
assert.throws(() => normalizeUrl('mailto:test@ae2v.fr', false));
console.log('Décompte : 4 formats, expiration, date invalide, fin de mois OK. URL : HTTPS implicite et protocoles autorisés OK.');
