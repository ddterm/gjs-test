// SPDX-FileCopyrightText: 2026 Aleksandr Mezin <mezin.alexander@gmail.com>
//
// SPDX-License-Identifier: MIT

import {existsSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {defineConfig, globalIgnores, includeIgnoreFile} from 'eslint/config';
import {ConfigArray} from '@eslint/config-array';
// @ts-expect-error -- no types available
import gnome from 'eslint-config-gnome';
import jsdoc from 'eslint-plugin-jsdoc';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** @import {ConfigObject} from 'eslint/config' */

/**
 * Collect ignore patterns from .gitignore files, recursing into subdirectories.
 *
 * @param {string} basePath - The directory to start search form.
 * @param {ConfigArray} parentIgnores - Already collected patterns from parent directories.
 * @returns {Generator<ConfigObject>}
 */
function *collectIgnores(
    basePath = import.meta.dirname,
    parentIgnores = new ConfigArray([globalIgnores(['**/node_modules/', '.git/'])], {basePath})
) {
    const ignoreFile = join(basePath, '.gitignore');

    if (existsSync(ignoreFile)) {
        const config = includeIgnoreFile(ignoreFile, {
            name: `Imported .gitignore patterns from ${ignoreFile}`,
            gitignoreResolution: true,
        });

        parentIgnores =
            new ConfigArray([parentIgnores, config], {extraConfigTypes: ['array'], basePath});

        yield config;
    }

    for (const entry of readdirSync(basePath, {withFileTypes: true})) {
        if (entry.isDirectory()) {
            const entryPath = join(basePath, entry.name);

            if (!parentIgnores.normalizeSync().isDirectoryIgnored(entryPath))
                yield* collectIgnores(entryPath, parentIgnores);
        }
    }
}

export default defineConfig([
    ...collectIgnores(),
    {
        files: ['**/*.js', '**/*.mjs'],
        plugins: {
            gnome,
            jsdoc,
            tseslint,
        },
        extends: [
            'gnome/recommended',
            'jsdoc/flat/recommended-typescript-flavor-error',
            'gnome/jsdoc',
            'tseslint/strictTypeChecked',
            'tseslint/stylisticTypeChecked',
        ],
        rules: {
            'max-len': [
                'error',
                100,
                {
                    ignoreUrls: true,
                    ignoreStrings: true,
                    ignoreTemplateLiterals: true,
                },
            ],
            'camelcase': ['error', {
                properties: 'never',
            }],
            'consistent-return': 'error',
            'prefer-arrow-callback': 'error',
            'prefer-const': ['error', {
                destructuring: 'all',
            }],
            'prefer-destructuring': 'error',
            'no-multiple-empty-lines': [
                'error',
                {max: 1},
            ],
            'no-extra-parens': ['error', 'all', {
                conditionalAssign: false,
                nestedBinaryExpressions: false,
                returnAssign: false,
                allowParensAfterCommentPattern: '@type',
            }],
            'jsdoc/require-jsdoc': ['error', {
                publicOnly: {
                    esm: true,
                    cjs: false,
                },
                require: {
                    ArrowFunctionExpression: true,
                    ClassDeclaration: true,
                    ClassExpression: true,
                    FunctionDeclaration: true,
                    FunctionExpression: true,
                    MethodDefinition: true,
                },
            }],
            'jsdoc/require-returns': ['error', {
                publicOnly: {
                    esm: true,
                    cjs: false,
                },
                exemptedBy: ['inheritdoc', 'ignore', 'private', 'hidden', 'internal'],
            }],
            'jsdoc/require-yields': 'off',
            'jsdoc/require-description': ['error', {
                contexts: [
                    'ClassDeclaration',
                    'ClassExpression',
                    'FunctionDeclaration',
                    'MethodDefinition[key.type="Identifier"]',
                ],
                exemptedBy: ['inheritdoc', 'ignore', 'private', 'hidden', 'internal'],
            }],
            'jsdoc/require-param-description': ['error', {
                contexts: ['FunctionDeclaration', 'MethodDefinition[key.type="Identifier"]'],
            }],
            'jsdoc/require-returns-description': ['error', {
                contexts: ['FunctionDeclaration', 'MethodDefinition[key.type="Identifier"]'],
            }],
            'jsdoc/require-description-complete-sentence': 'error',
            'jsdoc/require-hyphen-before-param-description': 'error',
            'jsdoc/require-asterisk-prefix': 'error',
            '@typescript-eslint/only-throw-error': ['error', {
                allow: [{from: 'package', package: '@girs/glib-2.0', name: 'Error'}],
            }],
            '@typescript-eslint/restrict-template-expressions': 'off',
            '@typescript-eslint/no-base-to-string': 'off',
        },
        languageOptions: {
            parserOptions: {
                projectService: {
                    allowDefaultProject: ['*.mjs'],
                    defaultProject: './tsconfig.node.json',
                },
            },
        },
    },
    {
        files: ['**/*.mjs'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
    {
        files: [
            'tests/*.js',
            '**/*.mjs',
        ],
        plugins: {jsdoc},
        rules: {
            'jsdoc/require-jsdoc': 'off',
            'jsdoc/require-description': 'off',
            'jsdoc/require-param-description': 'off',
            'jsdoc/require-returns': 'off',
            'jsdoc/require-returns-description': 'off',
        },
    },
]);
