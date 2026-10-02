// SPDX-FileCopyrightText: 2026 Aleksandr Mezin <mezin.alexander@gmail.com>
//
// SPDX-License-Identifier: MIT

/** @module runner.js */

/** @import {Reporter} from './reporter.js' */

import {TapReporter} from './reporter.js';

/**
 * A base class for tests and test suites.
 */
export class Node {
    #name;
    #parent;

    /**
     * Create a new Node.
     *
     * @param {string} name - Name of the node.
     * @param {Suite | null} parent - The suite that contains this Node.
     */
    constructor(name, parent) {
        this.#name = name;
        this.#parent = parent;
    }

    get name() {
        return this.#name;
    }

    /**
     * Full name of the Node, including the containing suite name.
     *
     * @returns {string} Full name as string.
     */
    get fullName() {
        if (!this.#parent)
            return this.name;

        return `${this.#parent.fullName} / ${this.name}`;
    }

    /**
     * Run the test or suite.
     *
     * @abstract
     * @param {Reporter} reporter - The Reporter to output test report with.
     * @returns {Promise<void>} No return value.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    run(reporter) {
        throw new TypeError('Not implemented in the base class');
    }
}

/**
 * A test.
 */
export class Test extends Node {
    #fn;
    #running = false;

    /**
     * Create a new Test.
     *
     * @param {Suite | null} parent - The suite that contains this test.
     * @param {string} name - Test name.
     * @param {function(Test): void | Promise<void>} fn - The function that implements the test.
     */
    constructor(parent, name, fn) {
        super(name, parent);

        this.#fn = fn;
    }

    /**
     * Run the test.
     *
     * @param {Reporter} reporter - The Reporter to output test status to.
     * @returns {Promise<void>}
     */
    async run(reporter) {
        if (this.#running)
            throw new Error('Recursive Test.run() calls are not allowed');

        /** @type {function(Test): unknown} */
        const unknownFn = this.#fn;
        let result;

        this.#running = true;

        try {
            reporter.testStart(this);
            result = await unknownFn(this);

            if (result !== undefined)
                throw new Error(`Test function must not return a value, but it returned ${result}`);

            reporter.testEnd(this, null);
        } catch (ex) {
            reporter.testEnd(this, ex);
        } finally {
            this.#running = false;
        }
    }
}

/**
 * A collection of tests and other suites.
 */
export class Suite extends Node {
    #populated = false;
    #adding = false;
    #running = false;
    /** @type {Node[]} */
    #children = [];

    /**
     * Create a new Suite.
     *
     * @param {Suite | null} parent - The suite that contains this suite.
     * @param {string} name - Suite name.
     * @param {function(Suite): void} fn - The function that populates the suite.
     */
    constructor(parent, name, fn) {
        super(name, parent);

        /** @type {function(Suite): unknown} */
        const unknownFn = fn;
        let result;

        try {
            result = unknownFn(this);
        } finally {
            this.#populated = true;
        }

        if (result !== undefined) {
            throw new TypeError(
                `suite() callback must be synchronous and must not return a value, but it returned ${result}`
            );
        }
    }

    /**
     * Add a test.
     *
     * @param {string} name - Test name.
     * @param {function(Test): void | Promise<void>} fn - The function that implements the test.
     * @returns {void}
     */
    test(name, fn) {
        if (this.#populated || this.#adding)
            throw new Error('Tests can be added only from suite() callback directly');

        this.#adding = true;

        try {
            this.#children.push(new Test(this, name, fn));
        } finally {
            this.#adding = false;
        }
    }

    /**
     * Add a nested test suite.
     *
     * @param {string} name - Test suite name.
     * @param {function(Suite): void} fn - The function that populates the suite.
     * @returns {void}
     */
    suite(name, fn) {
        if (this.#populated || this.#adding)
            throw new Error('Nested test suites can be added only from suite() callback directly');

        this.#adding = true;

        try {
            this.#children.push(new Suite(this, name, fn));
        } finally {
            this.#adding = false;
        }
    }

    /**
     * Run the test suite.
     *
     * @param {Reporter} reporter - The Reporter to output test status to.
     * @returns {Promise<void>}
     */
    async run(reporter) {
        if (!this.#populated)
            throw new Error('Suite.run() must not be called from suite() callback');

        if (this.#running)
            throw new Error('Recursive Suite.run() calls are not allowed');

        this.#running = true;

        try {
            for (const child of this.#children) {
                // eslint-disable-next-line no-await-in-loop
                await child.run(reporter);
            }
        } finally {
            this.#running = false;
        }
    }
}

/** @import Gio from '@girs/gio-2.0' */

/**
 * Setup a Gio.Application to run the test suite.
 *
 * @param {Gio.Application} app - The Application object.
 * @param {Suite} suite - The test suite to run.
 */
export function setupApplication(app, suite) {
    app.connect('activate', () => {
        const reporter = new TapReporter();

        reporter.start();
        app.hold();

        suite.run(reporter).finally(() => {
            app.release();
            reporter.end();
        }).catch(logError);
    });
}
