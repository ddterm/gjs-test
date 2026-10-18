#!/usr/bin/env -S gjs -m

// SPDX-FileCopyrightText: 2026 Aleksandr Mezin <mezin.alexander@gmail.com>
//
// SPDX-License-Identifier: MIT

import Gio from 'gi://Gio';

import {assertThat, is, SnapshotDirectory} from '../assert.js';
import {Suite} from '../runner.js';

const app = new Gio.Application();
const snapshot = SnapshotDirectory.fromModuleUrl(import.meta.url, './snapshots/');

snapshot.connectApplication(app);

void new Suite(null, 'simple', suite => {
    suite.test('empty', async () => { /* empty */ });

    suite.test('passing assertion', () => {
        assertThat(true, is(true));
    });

    suite.test('snapshot', () => {
        assertThat('Hello, World!', snapshot.matches('./hello.txt'));
    });
}).runApplication(app);
