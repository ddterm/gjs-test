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
fs = import('fs')

foreach source : sources
  outputs += fs.copyfile(
    source,
    install: install_dir != '',
    install_dir: install_dir,
    install_tag: install_tag,
  )
endforeach

yaml = subproject(
  'yaml',
  default_options: {
    'install_dir': install_dir == '' ? '' : install_dir / 'subprojects' / 'yaml',
    'install_tag': install_tag,
  },
)

sources += yaml.get_variable('sources')
outputs += yaml.get_variable('outputs')

if get_option('tests')
  subdir('tests')
endif
