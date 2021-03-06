module.exports = function (grunt) {
    require('load-grunt-tasks')(grunt);

    var jsFiles = ['src/app/**/*.js'];
    var otherWatchFiles = ['src/app/**/*.css', 'src/index.html'];
    var eslintFiles = jsFiles.concat([jsFiles, 'package.json', 'Gruntfile.js', 'profiles/*.js']);
    var deployFiles = [
        '**',
        '!**/*.uncompressed.js',
        '!**/*consoleStripped.js',
        '!**/bootstrap/less/**',
        '!**/bootstrap/test-infra/**',
        '!**/tests/**',
        '!build-report.txt',
        '!components-jasmine/**',
        '!favico.js/**',
        '!jasmine-favicon-reporter/**',
        '!jasmine-jsreporter/**',
        '!stubmodule/**',
        '!util/**'
    ];
    var bumpFiles = [
        'package.json',
        'bower.json',
        'src/app/package.json',
        'src/app/App.js'
    ];
    var deployDir = 'wwwroot/wvc/mobile';
    var secrets;
    try {
        secrets = grunt.file.readJSON('secrets.json');
    } catch (e) {
        // swallow for build server
        secrets = {
            stageHost: '',
            prodHost: '',
            username: '',
            password: ''
        };
    }

    grunt.initConfig({
        bump: {
            options: {
                files: bumpFiles,
                commitFiles: bumpFiles.concat('src/index.html'),
                push: false
            }
        },
        clean: {
            build: ['dist'],
            deploy: ['deploy']
        },
        connect: {
            uses_defaults: {}
        },
        compress: {
            main: {
                options: {
                    archive: 'deploy/deploy.zip'
                },
                files: [{
                    src: deployFiles,
                    cwd: 'dist/',
                    expand: true
                }]
            }
        },
        dojo: {
            prod: {
                options: {
                    profiles: ['profiles/prod.build.profile.js', 'profiles/build.profile.js'] // Profile for build
                }
            },
            stage: {
                options: {
                    profiles: ['profiles/stage.build.profile.js', 'profiles/build.profile.js'] // Profile for build
                }
            },
            options: {
                dojo: 'src/dojo/dojo.js', // Path to dojo.js file in dojo source
                load: 'build', // Optional: Utility to bootstrap (Default: 'build')
                releaseDir: '../dist',
                requires: ['src/app/packages.js', 'src/app/run.js'], // Optional: Module to require for the build (Default: nothing)
                basePath: './src'
            }
        },
        imagemin: {
            main: {
                options: {
                    optimizationLevel: 3
                },
                files: [{
                    expand: true,
                    cwd: 'src/',
                    // exclude tests because some images in dojox throw errors
                    src: ['**/*.{png,jpg,gif}', '!**/tests/**/*.*'],
                    dest: 'src/'
                }]
            }
        },
        eslint: {
            options: {
                configFile: '.eslintrc'
            },
            main: {
                src: jsFiles
            }
        },
        pkg: grunt.file.readJSON('package.json'),
        processhtml: {
            options: {},
            main: {
                files: {'dist/index.html': ['src/index.html']}
            }
        },
        secrets: secrets,
        shell: {
            main: {
                command: 'npm run workbox'
            }
        },
        sftp: {
            stage: {
                files: {
                    './': 'deploy/deploy.zip'
                },
                options: {
                    host: '<%= secrets.stageHost %>'
                }
            },
            prod: {
                files: {
                    './': 'deploy/deploy.zip'
                },
                options: {
                    host: '<%= secrets.prodHost %>'
                }
            },
            options: {
                path: './' + deployDir + '/',
                srcBasePath: 'deploy/',
                username: '<%= secrets.username %>',
                password: '<%= secrets.password %>',
                showProgress: true
            }
        },
        sshexec: {
            options: {
                username: '<%= secrets.username %>',
                password: '<%= secrets.password %>'
            },
            stage: {
                command: ['cd ' + deployDir, 'unzip -oq deploy.zip', 'rm deploy.zip'].join(';'),
                options: {
                    host: '<%= secrets.stageHost %>'
                }
            },
            prod: {
                command: ['cd ' + deployDir, 'unzip -oq deploy.zip', 'rm deploy.zip'].join(';'),
                options: {
                    host: '<%= secrets.prodHost %>'
                }
            }
        },
        uglify: {
            options: {
                preserveComments: false,
                sourceMap: true,
                compress: {
                    drop_console: true,
                    passes: 2,
                    dead_code: true
                }
            },
            stage: {
                options: {
                    compress: {
                        drop_console: false
                    }
                },
                src: ['dist/dojo/dojo.js'],
                dest: 'dist/dojo/dojo.js'
            },
            prod: {
                files: [{
                    expand: true,
                    cwd: 'dist',
                    src: ['**/*.js', '!proj4/**/*.js', '!jquery/**/*.js'],
                    dest: 'dist'
                }]
            }
        },
        watch: {
            eslint: {
                files: eslintFiles,
                tasks: ['newer:eslint:main']
            },
            src: {
                files: eslintFiles.concat(otherWatchFiles),
                options: {
                    livereload: true
                }
            }
        }
    });

    grunt.registerTask('default', ['eslint', 'connect', 'watch']);

    grunt.registerTask('build-prod', [
        'clean:build',
        'newer:imagemin:main',
        'dojo:prod',
        'uglify:prod',
        'processhtml:main',
        'shell:main'
    ]);
    grunt.registerTask('build-stage', [
        'clean:build',
        'newer:imagemin:main',
        'dojo:stage',
        'uglify:stage',
        'processhtml:main',
        'shell:main'
    ]);
    grunt.registerTask('deploy-prod', [
        'clean:deploy',
        'compress:main',
        'sftp:prod',
        'sshexec:prod'
    ]);
    grunt.registerTask('deploy-stage', [
        'clean:deploy',
        'compress:main',
        'sftp:stage',
        'sshexec:stage'
    ]);
    grunt.registerTask('travis', [
        'eslint',
        'build-prod'
    ]);
}
