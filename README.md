<!--
SPDX-FileCopyrightText: 2026 Aleksandr Mezin <mezin.alexander@gmail.com>

SPDX-License-Identifier: MIT
-->

# gjs-test

An attempt to write a test runner/framework for GJS from scratch.

Goals:

1. Support for complex e2e/integration tests, not only unit tests.
2. No dependencies except GJS itself. Must be loadable into GNOME Shell process.
3. Integration with Meson (should be usable as a subproject, compatible
with the built-in test runner).
4. Optional TypeScript support through JSDoc comments.
5. Hamcrest-like composable assertions (or "asymmetric matchers" in terms of
Jest and Jasmine).
6. YAML for "expected" and "actual" value representation. Anchors and aliases
to represent cyclic objects, comments for errors and things that aren't normal
JS properties.
7. Optional integration with [Allure Framework](https://github.com/allure-framework)
(still with no runtime dependencies).
8. Built-in GJS and GNOME-specific tools: isolated GNOME Shell session
(like https://gitlab.com/dogtail/dogtail), memory leak detection
(https://gitlab.gnome.org/GNOME/gjs/-/blob/master/tools/heapgraph.py - maybe
rewrite in GJS).
