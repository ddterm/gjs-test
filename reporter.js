// SPDX-FileCopyrightText: 2026 Aleksandr Mezin <mezin.alexander@gmail.com>
//
// SPDX-License-Identifier: MIT

/** @module reporter.js */

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
 * Prints the report using Test Anything Protocol v13. Compatible with TAP v14.
 *
 * @augments Reporter
 */
export class TapReporter extends Reporter {
    #test_point_id = 0;

    /**
     * Escape text to include it in a description/comment/reason.
     *
     * Compatible with TAP v14.
     *
     * @see https://testanything.org/tap-version-14-specification.html#escaping
     *
     * @param {string} str - The string to escape.
     * @returns {string} The string with `#` and `\` characters escaped.
     */
    static #escape(str) {
        const escaped = str.replace(/\\|#/g, '\\$&');

        if (escaped.includes('\n'))
            throw new Error('Line breaks are not allowed here!');

        return escaped;
    }

    /**
     * Prints TAP version line.
     *
     * @see https://testanything.org/tap-specification.html#the-version
     *
     * @override
     */
    start() {
        print('TAP version', 13);
    }

    /**
     * Prints the test plan.
     *
     * @see https://testanything.org/tap-specification.html#the-plan
     *
     * @override
     */
    end() {
        print(`1..${this.#test_point_id}`);
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
        if (result === null)
            print('ok', this.#test_point_id, '-', TapReporter.#escape(test.fullName));
        else
            print('not ok', this.#test_point_id, '-', TapReporter.#escape(test.fullName));
    }
}
