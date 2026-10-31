// SPDX-FileCopyrightText: 2026 Aleksandr Mezin <mezin.alexander@gmail.com>
//
// SPDX-License-Identifier: MIT

import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';

import {parse} from 'yaml';

import {longKeys, root} from './yaml-samples.js';

/**
 * @param {string} path
 * @returns {Promise<unknown>}
 */
async function parseSnapshot(path) {
    const source = await readFile(new URL(path, import.meta.url), 'utf8');

    /** @type {unknown} */
    const result = parse(
        source,
        (_key, value) => {
            if (typeof value === 'bigint') {
                if (value >= Number.MIN_SAFE_INTEGER && value <= Number.MAX_SAFE_INTEGER)
                    return Number(value);
            }

            return value;
        },
        {mapAsMap: true, intAsBigInt: true}
    );

    assert.match(
        source,
        /^[\t\n\r\x20-\x7e\xa0-\ud7ff\ue000-\ufefe\uff00-\ufffd\u{10000}-\u{10ffff}]*$/u
    );

    return result;
}

void test('YAML snapshot', async () => {
    assert.deepStrictEqual(await parseSnapshot('./snapshots/yaml.yaml'), root);
});

void test('YAML snapshot (indent = 1)', async () => {
    assert.deepStrictEqual(await parseSnapshot('./snapshots/yaml-indent-1.yaml'), root);
});

void test('YAML snapshot (indent = 4)', async () => {
    assert.deepStrictEqual(await parseSnapshot('./snapshots/yaml-indent-4.yaml'), root);
});

void test('long key snapshot', async () => {
    assert.deepStrictEqual(await parseSnapshot('./snapshots/long-key.yaml'), longKeys);
});
