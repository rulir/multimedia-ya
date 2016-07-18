"use strict";

import gulp from 'gulp';
import autoprefixer from 'gulp-autoprefixer';
import cleanCss from 'gulp-clean-css';
import concatCss from 'gulp-concat-css';
import uglify from 'gulp-uglify';
import concatJs from 'gulp-concat';
import watch from 'gulp-watch';
import htmlreplace from 'gulp-html-replace';
import browserSync from 'browser-sync';
import sourcemaps from 'gulp-sourcemaps';
import data from 'gulp-data';
import stylus from 'gulp-stylus';
import rimraf from 'rimraf';
import babel from 'gulp-babel';


const routes = {
	build: {
		html: 'build/',
		js: 'build/js/',
		css: 'build/css/',
		assets: 'build/assets/'
	},
	src: {
		html: 'src/*.html',
		js: 'src/scripts/**/*.js',
		css: 'src/styles/main.styl',
		assets: 'src/assets/**/*.*'
	},
	watch: {
		html: 'src/*.html',
		js: 'src/scripts/**/*.js',
		css: 'src/styles/**/*.styl'
	},
	clean: './build'
};


const serverConfig = {
	server: {
		baseDir: './build'
	},
	tunnel: true,
	host: 'localhost',
	port: '8080',
	logPrefix: 'multimedia-ya'
};

const reload = browserSync.reload;

gulp.task('html', function() {
	gulp.src(routes.src.html)
		.pipe(htmlreplace({
			'css': 'css/bundle.css',
			'js': 'js/bundle.js'
		}))
		.pipe(gulp.dest(routes.build.html))
		.pipe(reload({
			stream: true
		}));
});

gulp.task('script', function() {
	gulp.src(routes.src.js)
		.pipe(sourcemaps.init())
		.pipe(babel({
			presets: ['es2015']
		}))
		.pipe(concatJs('bundle.js'))
		.pipe(uglify())
		.pipe(sourcemaps.write())
		.pipe(gulp.dest(routes.build.js))
		.pipe(reload({
			stream: true
		}));
});

gulp.task('style', function() {
	gulp.src(routes.src.css)
		.pipe(sourcemaps.init())
		.pipe(stylus())
		.pipe(autoprefixer())
		.pipe(concatCss('bundle.css'))
		.pipe(cleanCss())
		.pipe(sourcemaps.write())
		.pipe(gulp.dest(routes.build.css))
		.pipe(reload({
			stream: true
		}));
});

gulp.task('assets', function() {
	gulp.src(routes.src.assets)
		.pipe(gulp.dest(routes.build.assets))
		.pipe(reload({
			stream: true
		}));
});

gulp.task('build', [
	'html',
	'script',
	'style',
	'assets'
]);

gulp.task('watch', function() {
	watch([routes.watch.html], function(event, cb) {
		gulp.start('html');
	});
	watch([routes.watch.css], function(event, cb) {
		gulp.start('style');
	});
	watch([routes.watch.js], function(event, cb) {
		gulp.start('script');
	});
});

gulp.task('clean', function(cb) {
	rimraf(routes.clean, cb);
});

gulp.task('serve', function() {
	browserSync(serverConfig);
});

gulp.task('default', ['build', 'serve', 'watch']);