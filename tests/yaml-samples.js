// SPDX-FileCopyrightText: 2026 Aleksandr Mezin <mezin.alexander@gmail.com>
//
// SPDX-License-Identifier: MIT

export const reused = 'reused';
export const overridden = 'overridden';
export const shared = new Map([
    ['inside', 'mapping'],
]);
export const sharedList = ['shared', 'items'];

export const root = new Map(Object.entries({
    strings: new Map(Object.entries({
        plain: 'hello world',
        Unicode: 'café ☕',
        empty: '',
        'null': 'null',
        integer: '42',
        exponent: '1e3',
        timestamp: '2026-11-01',
        'YAML 1.1 boolean': 'yes',
        'leading space': ' leading',
        indicator: '? key',
        'document start': '---',
        comment: '# comment',
        'colon separator': 'key: value',
        apostrophe: "it's: YAML",
        'CR and LF': 'multi\nline\r\n',
        NUL: 'before\u0000after',
        DEL: 'before\u007fafter',
        'C1 control': 'before\u0080\u009fafter',
        NEL: '\u0085',
        'NEL with colon': 'before\u0085after: value',
        BOM: '\ufeff',
        'BOM in plain': 'before\ufeffafter',
        'non-characters': 'before\ufffe\uffffafter',
        'unpaired surrogate': 'before\ud800after',
    })),
    'literal strings': new Map(Object.entries({
        'strip final break': 'first line\nsecond line',
        'clip final break': 'first line\nsecond line\n',
        'keep final breaks': 'first line\n\n',
        'only a line break': '\n',
        'leading spaces': '  indented\n  content',
        'BOM in multiline': 'first line\n\ufeffsecond line',
        'NEL in multiline': 'first line\u0085\nsecond line',
        'space and line break': ' \n',
        'spaces and line breaks': '  \n\n',
        'line break and space': '\n ',
        'spaces around line break': ' \n ',
    })),
    'non-string scalars': new Map(Object.entries({
        'null': null,
        'boolean': true,
        'integer': 42,
        'not a number': NaN,
        'positive infinity': Infinity,
        'negative infinity': -Infinity,
        'bigint': 123456789012345678901234567890n,
    })),
    sequences: new Map(Object.entries({
        empty: [],
        scalars: [
            'first',
            42,
            true,
            null,
            'multi-line\nitem',
            '  indented\n  item',
        ],
        'nested sequences': [
            ['inner 1', 'inner 2'],
            [],
        ],
        'mappings in sequence': [
            new Map([
                ['key 1', 'value 1'],
                ['key 2', 'value 2'],
            ]),
            new Map(),
        ],
    })),
    'anchors and aliases': new Map(/** @type {[unknown, unknown][]} */ ([
        ['anchored scalar', reused],
        ['alias', reused],
        ['override anchor', overridden],
        ['reuse overridden anchor', overridden],
        ['re-anchor original scalar', reused],
        [reused, 'scalar alias key'],
        ['anchored mapping', shared],
        ['mapping alias', shared],
        [shared, 'mapping alias key'],
        ['anchored sequence', sharedList],
        ['sequence alias', sharedList],
        [sharedList, 'sequence alias key'],
    ])),
    'complex keys': new Map(/** @type {[unknown, unknown][]} */ ([
        [new Map(/** @type {[unknown, unknown][]} */ ([
            ['inner', 'mapping key'],
            ['second', 'second entry'],
            ['nested', new Map([
                ['deep', 'nested value'],
            ])],
            ['literal', 'multi-line\nin key'],
            ['indented literal', '  indented\n  in key'],
        ])), 'mapping value'],
        [new Map(), 'empty mapping value'],
        [['Detroit Tigers', 'Chicago Cubs'], ['2001-07-23']],
        [[], 'empty sequence value'],
        ['multi-line\nkey', 'literal key value'],
        ['  indented\n  key', 'indented literal key value'],
    ])),
}));

export const longKeys = new Map([
    ['x'.repeat(1023), 'max length - 1'],
    ['x'.repeat(1024), 'max length'],
    ['x'.repeat(1025), 'max length + 1'],
]);
