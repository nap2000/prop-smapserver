module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
        mangle: true,
        compress: true
      },
      my_target: {
        files: {
          'tasks/js/managed_forms.min.js': ['tasks/js/managed_forms.js'],
          'tasks/js/taskManagement.min.js': ['tasks/js/taskManagement.js']
        }
      }
    }

  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.registerTask('default', ['uglify']);

};
