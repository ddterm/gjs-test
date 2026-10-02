#!/usr/bin/env -S gjs -m

// SPDX-FileCopyrightText: 2026 Aleksandr Mezin <mezin.alexander@gmail.com>
//
// SPDX-License-Identifier: MIT

import Gio from 'gi://Gio';

import System from 'system';

import {assertThat, is} from '../assert.js';
import {setupApplication, Suite} from '../runner.js';

const app = new Gio.Application();

setupApplication(app, new Suite(null, 'simple', suite => {
    suite.test('empty', async () => {
    });

    // eslint-disable-next-line require-await
    suite.test('passing assertion', async () => {
        assertThat(true, is(true));
    });
}));

app.runAsync([System.programInvocationName, ...System.programArgs]).catch(logError);
