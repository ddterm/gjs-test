#!/usr/bin/env -S gjs -m

// SPDX-FileCopyrightText: 2026 Aleksandr Mezin <mezin.alexander@gmail.com>
//
// SPDX-License-Identifier: MIT

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import {assertThat, is, SnapshotDirectory} from '../assert.js';
import {Suite} from '../runner.js';
import {TapReporter} from '../reporter.js';

const app = new Gio.Application();
const snapshot = SnapshotDirectory.fromModuleUrl(import.meta.url, './snapshots/');
const baseUrl = GLib.Uri.resolve_relative(import.meta.url, './..', GLib.UriFlags.NONE);

snapshot.connectApplication(app);

/**
 * @param {string} str
 */
function sanitizeStacks(str) {
    return str.replaceAll(baseUrl, '<baseUrl>').replace(
        /@resource:\/\/\/org\/gnome\/gjs\/.+?:\d+:\d+/g,
        '@<GJS internal>'
    );
}

void new Suite(null, 'simple', suite => {
    suite.test('empty', async () => { /* empty */ });

    suite.test('passing assertion', () => {
        assertThat(true, is(true));
    });

    suite.test('TAP reporter', async () => {
        /** @type {string[]} */
        const output = [];
        const testReporter = new TapReporter(output.push.bind(output));

        await new Suite(null, 'Test suite', testSuite => {
            testSuite.test('empty', async () => { /* empty */ });

            testSuite.test('passing assertion', () => {
                assertThat(true, is(true));
            });

            testSuite.test('failing assertion', () => {
                assertThat(false, is(true));
            });

            testSuite.test('throws', () => {
                const jsError = new Error('JS error');

                Object.assign(jsError, {
                    self: jsError,
                    symbol: Symbol('Test symbol'),
                    nan: NaN,
                    negativeInf: -Infinity,
                    randomNumber: 7,
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    nullProto: Object.create(null),
                    bigNumber: BigInt(42),
                    undef: undefined,
                });

                const glibError = GLib.Error.new_literal(
                    GLib.file_error_quark(),
                    GLib.FileError.FAILED,
                    'Test GLib.Error'
                );

                throw new AggregateError([jsError, glibError], 'Aggregate');
            });
        }).run(testReporter);

        assertThat(
            sanitizeStacks(output.join('\n')).replaceAll(
                `"domain": ${GLib.file_error_quark()},\n`,
                `"domain": ${JSON.stringify(GLib.quark_to_string(GLib.file_error_quark()))},\n`
            ),
            snapshot.matches('./tap-report.txt')
        );
    });
}).runApplication(app);
