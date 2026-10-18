// SPDX-FileCopyrightText: 2026 Aleksandr Mezin <mezin.alexander@gmail.com>
//
// SPDX-License-Identifier: MIT

/** @module assert.js */

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

/**
 * A function that checks if the actual value meets some condition.
 *
 * @callback Matcher
 * @param {unknown} actual - The actual value to check.
 * @returns {MatchResult} The conclusion of the check.
 */

/**
 * A result of the check.
 *
 * @typedef MatchResult
 * @property {boolean} ok - Whether the check succeeded.
 * @property {string} [message] - If the check has failed, the description of the failure.
 */

/**
 * Throw an error if the actual value doesn't satisfy the matcher condition.
 *
 * @param {unknown} actual - The actual value to check.
 * @param {Matcher} matcher - The condition to check.
 * @throws {Error} Error with the description of the failure if the check has failed.
 */
export function assertThat(actual, matcher) {
    const {ok, message} = matcher(actual);

    if (!ok)
        throw new Error(message);
}

/**
 * A simple equality check using Object.is().
 *
 * @param {unknown} expected - The expected value.
 * @returns {Matcher} The matcher that checks provided actual values against the expected one
 * using Object.is().
 */
export function is(expected) {
    return actual => {
        const ok = Object.is(expected, actual);

        if (ok)
            return {ok};

        return {
            ok,
            message: `Expected ${expected}, got ${actual}`,
        };
    };
}

/**
 * A directory with snapshot files.
 */
export class SnapshotDirectory {
    #baseUrl;
    #update;

    /**
     * Create a new SnapshotDirectory.
     *
     * @param {string|GLib.Uri} baseUrl - URL of the snapshot directory.
     * @param {boolean} update - Update mismatching snapshots instead of failing the test.
     */
    constructor(baseUrl, update = false) {
        if (!(baseUrl instanceof GLib.Uri))
            baseUrl = GLib.Uri.parse(baseUrl, GLib.UriFlags.NONE);

        if (!baseUrl.get_path().endsWith('/'))
            throw new Error(`Directory URL must end with '/', got: ${baseUrl.to_string()}`);

        this.#baseUrl = baseUrl;
        this.#update = update;
    }

    /**
     * Resolve snapshot directory URL from module URL.
     *
     * @param {string|GLib.Uri} moduleUrl - URL of the module. Usually should be 'import.meta.url'.
     * @param {string} relative - URL of the snapshot directory, relative to the 'moduleUrl'.
     * @param {boolean} update - Update mismatching snapshots instead of failing the test.
     * @returns {SnapshotDirectory} A SnapshotDirectory instance pointing to the specified
     * directory.
     */
    static fromModuleUrl(moduleUrl, relative = './', update = false) {
        if (!(moduleUrl instanceof GLib.Uri))
            moduleUrl = GLib.Uri.parse(moduleUrl, GLib.UriFlags.NONE);

        return new this(moduleUrl.parse_relative(relative, GLib.UriFlags.NONE), update);
    }

    /**
     * Parse and handle command line arguments.
     *
     * Add command line arguments that control snapshot handling, and handle
     * them in 'handle-local-arguments'.
     *
     * @param {Gio.Application} application - The application to connect to.
     */
    connectApplication(application) {
        application.add_main_option(
            'update-snapshots',
            0,
            GLib.OptionFlags.NONE,
            GLib.OptionArg.NONE,
            'Update mismatching snapshots instead of failing the test',
            null
        );

        application.add_main_option(
            'snapshot-directory',
            0,
            GLib.OptionFlags.NONE,
            GLib.OptionArg.STRING,
            'Override snapshot directory location',
            '/path/'
        );

        application.connect('handle-local-options', (app, options) => {
            try {
                const update = /** @type {unknown} */ (options.lookup('update-snapshots', 'b'));
                const basedir = /** @type {unknown} */ (options.lookup('snapshot-directory', 's'));

                if (update !== null)
                    this.#update = Boolean(update);

                if (basedir) {
                    this.#baseUrl = GLib.Uri.parse(
                        `${Gio.File.new_for_commandline_arg(String(basedir)).get_uri()}/`,
                        GLib.UriFlags.NONE
                    );
                }
            } catch (ex) {
                logError(ex);
                return 1;
            }

            return -1;
        });
    }

    /**
     * Check that the provided string matches the file content.
     *
     * A simple implementation of snapshot testing: the string can be updated by running the test
     * with "--update-snapshots" CLI flag.
     *
     * @param {string} url - Relative URL of the file.
     * @returns {Matcher} The matcher that checks whether the provided string matches the content
     * of the file.
     */
    matches(url) {
        return actual => {
            const fileUrl = this.#baseUrl.parse_relative(url, GLib.UriFlags.NONE);
            const file = Gio.File.new_for_uri(fileUrl.to_string());
            let expected = null;

            try {
                [expected] = file.load_bytes(null);
            } catch (ex) {
                if (!this.#update)
                    throw ex;

                if (!(ex instanceof GLib.Error &&
                      ex.matches(Gio.io_error_quark(), Gio.IOErrorEnum.NOT_FOUND)))
                    throw ex;
            }

            if (expected)
                expected = new TextDecoder().decode(expected.toArray());

            const result = is(expected)(actual);

            if (result.ok || !this.#update)
                return result;

            file.replace_contents(
                String(actual),
                null,
                true,
                Gio.FileCreateFlags.REPLACE_DESTINATION,
                null
            );

            return {ok: true};
        };
    }
}
