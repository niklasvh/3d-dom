module.exports = function(grunt) {
  grunt.initConfig({
    concat: {
      options: {
        separator: ';\n'
      },
      shaders: {
        src: ['src/shaders/*'],
        dest: ['src/shaders.js'],
        options: {
          process: function(src, filepath) {
            return "Game.Shaders['" + filepath.substring(filepath.lastIndexOf("/") + 1) + "'] = " + JSON.stringify(src.split("\n")) + ".join('\\n')";
          }
        }
      },
      dist: {
        src: ['lib/bacon.js', 'lib/three.js', 'lib/RadialBlur.js', 'lib/Detector.js', 'lib/html2canvas/build/html2canvas.js', 'src/*.js', '!src/domfps.js', 'src/domfps.js'],
        dest: 'build/domfps.js'
      }
    },
    watch: {
      shaders: {
        files: ['src/shaders/*'],
        tasks: ['concat:shaders']
      },
      scripts: {
        files: ['src/*.js'],
        tasks: ['concat'],
        options: {
          interrupt: true
        }
      },
      minify: {
        files:['build/domfps.js'],
        tasks: ['uglify']
      }
    },
    connect: {
      server: {
        options: {
          keepalive: true
        }
      }
    },
    uglify: {
      options: {
        banner: "/* 3D DOM - Copyright Niklas von Hertzen (@niklasvh) */\n",
        preserveComments: 'all'
      },
      minify: {
        files: {
          'build/domfps.min.js': ['build/domfps.js']
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('default', ['concat:shaders', 'concat:dist', 'uglify']);
};