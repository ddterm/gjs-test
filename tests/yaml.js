#!/usr/bin/env -S gjs -m

// SPDX-FileCopyrightText: 2026 Aleksandr Mezin <mezin.alexander@gmail.com>
//
// SPDX-License-Identifier: MIT

import Gio from 'gi://Gio';

import {assertThat, SnapshotDirectory} from '../assert.js';
import {Suite} from '../runner.js';
import {Mapping, Scalar, Sequence} from '../yaml.js';

/** @import {Node, NodeOptions} from '../yaml.js' */

import * as samples from './yaml-samples.js';

const app = new Gio.Application();
const snapshot = SnapshotDirectory.fromModuleUrl(import.meta.url, './snapshots/');

snapshot.connectApplication(app);

/** @type {Map<unknown, Node>} */
const nodeCache = new Map();

/**
 * @param {unknown} value
 * @param {NodeOptions} options
 * @returns {Node}
 */
function toNode(value, options = {}) {
    let node = nodeCache.get(value);

    if (node)
        return node;

    if (value instanceof Map) {
        const map = new Mapping([], options);

        nodeCache.set(value, map);

        for (const [k, v] of value.entries())
            map.entries.set(toNode(k), toNode(v));

        return map;
    }

    if (Array.isArray(value)) {
        const seq = new Sequence([], options);

        nodeCache.set(value, seq);

        for (const item of value)
            seq.items.push(toNode(item));

        return seq;
    }

    // @ts-expect-error No need to check all types in tests
    node = new Scalar(value, options);
    nodeCache.set(value, node);

    return node;
}

void new Suite(null, 'yaml', suite => {
    suite.test('node presentation snapshot', () => {
        toNode(samples.reused, {anchor: 'text'});
        toNode(samples.overridden, {anchor: 'text'});
        toNode(samples.shared, {anchor: 'shared'});
        toNode(samples.sharedList, {anchor: 'list'});

        const root = toNode(samples.root);

        assertThat(`${root.toYaml()}\n`, snapshot.matches('./yaml.yaml'));
    });

    suite.test('node presentation snapshot (indent = 1)', () => {
        toNode(samples.reused, {anchor: 'text'});
        toNode(samples.overridden, {anchor: 'text'});
        toNode(samples.shared, {anchor: 'shared'});
        toNode(samples.sharedList, {anchor: 'list'});

        const root = toNode(samples.root);

        assertThat(`${root.toYaml({indent: 1})}\n`, snapshot.matches('./yaml-indent-1.yaml'));
    });

    suite.test('node presentation snapshot (indent = 4)', () => {
        toNode(samples.reused, {anchor: 'text'});
        toNode(samples.overridden, {anchor: 'text'});
        toNode(samples.shared, {anchor: 'shared'});
        toNode(samples.sharedList, {anchor: 'list'});

        const root = toNode(samples.root);

        assertThat(`${root.toYaml({indent: 4})}\n`, snapshot.matches('./yaml-indent-4.yaml'));
    });

    suite.test('key length limit', () => {
        const mapping = toNode(samples.longKeys);

        assertThat(`${mapping.toYaml()}\n`, snapshot.matches('./long-key.yaml'));
    });
}).runApplication(app);
