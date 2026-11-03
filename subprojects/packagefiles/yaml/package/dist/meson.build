# SPDX-FileCopyrightText: 2026 Aleksandr Mezin <mezin.alexander@gmail.com>
#
# SPDX-License-Identifier: MIT

sources = files(
  'cli.js',
  'directives-DqP9ea45.js',
  'index.js',
  'line-counter-B2FjSv3E.js',
  'public-api-uicovB0N.js',
  'rolldown-runtime-D7D4PA-g.js',
  'test-events.js',
  'util.js',
)

foreach source : sources
  outputs += fs.copyfile(
    source,
    install: install_dir != '',
    install_dir: install_dir,
    install_tag: install_tag,
  )
endforeach
