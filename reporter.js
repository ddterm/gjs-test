// SPDX-FileCopyrightText: 2026 Aleksandr Mezin <mezin.alexander@gmail.com>
//
// SPDX-License-Identifier: MIT

/** @module reporter.js */

import GLib from 'gi://GLib';

/** @import {Test} from './runner.js' */

/**
 * Base class for reporters.
 */
export class Reporter {
    /**
     * Called when a test run starts.
     */
    start() {
        // The default implementation does nothing
    }

    /**
     * Called when a test run ends.
     */
    end() {
        // The default implementation does nothing
    }

    /**
     * Called when a new test is started.
     *
     * @param {Test} test - The test.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    testStart(test) {
        // The default implementation does nothing
    }

    /**
     * Called when a test has finished.
     *
     * @param {Test} test - The test.
     * @param {unknown|null} result - Error if the test has failed, null - if it succeeded.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    testEnd(test, result) {
        // The default implementation does nothing
    }
}

/**
 * A function that prints the message somewhere.
 *
 * @callback Print
 * @param {string} message - The message to print.
 */

/**
 * Prints the report using Test Anything Protocol v13. Compatible with TAP v14.
 *
 * @augments Reporter
 */
export class TapReporter extends Reporter {
    /** @type {Print} */
    #print;
    #test_point_id = 0;

    /**
     * Create a new TapReporter object.
     *
     * @param {Print} printFn - Function that will be called to output a line of text.
     */
    constructor(printFn = print) {
        super();
        this.#print = printFn;
    }

    /**
     * Escape text to include it in a description/comment/reason.
     *
     * Compatible with TAP v14.
     *
     * @see https://testanything.org/tap-version-14-specification.html#escaping
     *
     * @param {string} str - The string to escape.
     * @param {boolean} multiline - Whether multiline text is allowed. If set to true, all lines
     * after the first one will be converted to comment lines. By default, line breaks are replaced
     * with spaces.
     * @returns {string} The string with `#` and `\` characters escaped.
     */
    static #escape(str, multiline = false) {
        return str.replace(/\\|#/g, '\\$&').replace(/\n/g, multiline ? '\n#' : ' ');
    }

    /**
     * Prints TAP version line.
     *
     * @see https://testanything.org/tap-specification.html#the-version
     *
     * @override
     */
    start() {
        this.#print('TAP version 13');
    }

    /**
     * Prints the test plan.
     *
     * @see https://testanything.org/tap-specification.html#the-plan
     *
     * @override
     */
    end() {
        this.#print(`1..${this.#test_point_id}`);
    }

    /**
     * @inheritdoc
     * @override
     */
    testStart() {
        this.#test_point_id += 1;
    }

    /**
     * Prints the test line.
     *
     * @see https://testanything.org/tap-specification.html#the-test-line
     *
     * Compatible with TAP v14.
     *
     * @see https://testanything.org/tap-version-14-specification.html#test-points
     *
     * @override
     * @param {Test} test - The test.
     * @param {unknown|null} result - Error if the test has failed, null - if it succeeded.
     */
    testEnd(test, result) {
        if (result === null) {
            this.#print(`ok ${this.#test_point_id} - ${TapReporter.#escape(test.fullName)}`);
            return;
        }

        this.#print(`not ok ${this.#test_point_id} - ${TapReporter.#escape(test.fullName)}`);

        /** @type {Map<unknown, string>} */
        const visited = new Map();
        const raw = new Set();

        /**
         * Replacer function for JSON.stringify().
         *
         * @private
         * @this {unknown}
         * @param {string} key - Key.
         * @param {unknown} value - Value.
         */
        function replacer(key, value) {
            if (
                typeof value === 'string' ||
                typeof value === 'boolean' ||
                value === null ||
                Number.isFinite(value) ||
                raw.has(value)
            )
                return value;

            /** @type {function(string | symbol): unknown} */
            const getProperty = propertyKey => {
                try {
                    // @ts-expect-error - unsafe, show the exception on failure
                    return value[propertyKey];
                } catch (ex) {
                    const stub = {'! exception !': ex};
                    raw.add(stub);
                    return stub;
                }
            };

            if (typeof value === 'function' && key === 'constructor')
                return {name: getProperty('name')};

            /** @type {Record<string, unknown>} */
            const serializable = {};

            if (typeof value === 'object' || typeof value === 'function') {
                const visitedKey = visited.get(value);

                if (visitedKey !== undefined)
                    return {'! repeated !': visitedKey};

                const parent = visited.get(this);
                const path = parent ? `${parent}.${key}` : key;

                visited.set(value, path);
                visited.set(serializable, path);
            }

            try {
                if (value !== undefined) {
                    // eslint-disable-next-line @typescript-eslint/dot-notation
                    serializable['constructor'] = getProperty('constructor');
                }

                if (typeof value === 'object' || typeof value === 'function') {
                    const ownKeys = Reflect.ownKeys(value);

                    for (const propertyKey of ownKeys)
                        serializable[propertyKey.toString()] = getProperty(propertyKey);
                }

                for (const propertyKey in value) {
                    if (Object.hasOwn(serializable, propertyKey))
                        continue;

                    const properyValue = getProperty(propertyKey);

                    if (typeof properyValue !== 'function')
                        serializable[propertyKey] = properyValue;
                }

                if (!Object.hasOwn(serializable, 'toString')) {
                    let toString;

                    try {
                        if (typeof value?.toString === 'function')
                            toString = value.toString();
                        else
                            toString = String(value);
                    } catch (ex) {
                        toString = {'! exception !': ex};
                        raw.add(toString);
                    }

                    Object.assign(serializable, {toString});
                }

                if (value instanceof Error || value instanceof GLib.Error) {
                    if (!('stack' in serializable) && 'stack' in value)
                        serializable['stack'] = getProperty('stack');
                }
            } catch (ex) {
                serializable['! exception !'] = ex;
            }

            return serializable;
        };

        try {
            this.#print(
                `  ---\n${JSON.stringify(result, replacer, 2).replace(/^/mg, '  ')}\n  ...`
            );
        } catch (ex) {
            this.#print(`# ${TapReporter.#escape(String(ex), true)}`);
        }
    }
}
