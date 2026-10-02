// SPDX-FileCopyrightText: 2026 Aleksandr Mezin <mezin.alexander@gmail.com>
//
// SPDX-License-Identifier: MIT

/** @module assert.js */

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
