# SPDX-FileCopyrightText: 2026 Aleksandr Mezin <mezin.alexander@gmail.com>
#
# SPDX-License-Identifier: MIT

gjs = find_program('gjs')
coverage = get_option('coverage')

foreach test_file : files('simple.js')
  test_name = fs.stem(test_file)
  test_args = []

  if coverage
    test_args += [
      '--coverage-output',
      meson.project_build_root(),
      '--coverage-prefix',
      meson.project_build_root(),
    ]
  endif

  test_args += ['-m', fs.copyfile(test_file)]

  test(
    test_name,
    gjs,
    args: test_args,
    depends: outputs,
    protocol: 'tap',
    is_parallel: not coverage,
    workdir: meson.project_build_root(),
  )
endforeach

if coverage
  lcov = find_program('lcov', required: false, disabler: true)
  genhtml = find_program('genhtml', required: false, disabler: true)

  lcov_args = [
    '-v',
    '--exclude=tests/*',
    '--branch-coverage',
    '--ignore-errors=inconsistent',  # spidermonkey outputs duplicate function names
    '--forget-test-names',
  ]

  run_target(
    'coverage-genhtml',
    command: [
      genhtml,
      lcov_args,
      '--output-directory',
      meson.project_build_root() / 'coverage',
      '--legend',
      '--show-details',
      '--keep-going',
      meson.project_build_root() / 'coverage.lcov',
    ],
  )

  run_target(
    'coverage-summary',
    command: [lcov, '--summary', meson.project_build_root() / 'coverage.lcov', lcov_args],
  )
endif
