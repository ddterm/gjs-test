# SPDX-FileCopyrightText: 2026 Aleksandr Mezin <mezin.alexander@gmail.com>
#
# SPDX-License-Identifier: MIT

project(
  'yaml',
  version: '3.0.0-2',
  meson_version: '>= 1.3.0',
  license: 'ISC',
  license_files: 'package' / 'LICENSE',
)

fs = import('fs')

install_dir = get_option('install_dir')
install_tag = get_option('install_tag')

outputs = [
  fs.copyfile(
    'index.js',
    install: install_dir != '',
    install_dir: install_dir,
    install_tag: install_tag,
  )
]

subdir('package' / 'dist')

sources += files('index.js')
