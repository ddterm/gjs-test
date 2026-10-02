# SPDX-FileCopyrightText: 2026 Aleksandr Mezin <mezin.alexander@gmail.com>
#
# SPDX-License-Identifier: MIT

project(
  'gjs-test',
  meson_version: '>= 1.3.0',
  license: 'MIT',
  license_files: 'LICENSE',
)

sources = files(
  'assert.js',
  'reporter.js',
  'runner.js',
)

install_dir = get_option('install_dir')
install_tag = get_option('install_tag')

outputs = []

foreach source : sources
  outputs += import('fs').copyfile(
    source,
    install: install_dir != '',
    install_dir: install_dir,
    install_tag: install_tag,
  )
endforeach

if get_option('tests')
  subdir('tests')
endif
