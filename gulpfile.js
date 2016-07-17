"use strict";

var gulp = require('gulp'),
	autoprefixer = require('gulp-autoprefixer'),
	cleanCss = require('gulp-clean-css'),
	concatCss = require('gulp-concat-css'),
	uglify = require('gulp-uglify'),
	concatJs = require('gulp-concat'),
	watch = require('gulp-watch'),
	htmlreplace = require('gulp-html-replace'),
	browserSync = require("browser-sync"),
	data = require('gulp-data'),
	stylus = require('gulp-stylus');


var routes = {
	build: {
		html: 'build/',
		js: 'build/js/',
		css: 'build/css/',
		img: 'build/img/'
	},
	src: {
		html: 'src/*.html',
		js: ['src/js/doorBase.js', 'src/js/doorOthers.js', 'src/js/app.js'],
		css: 'src/css/*.css',
		img: 'src/img/*.*'
	},
	watch: {
		html: 'src/*.html',
		js: 'src/js/*.js',
		css: 'src/css/*.css'
	},
	clean: './build'
};


var serverConfig = {
	server: {
		baseDir: './build'
	},
	tunnel: true,
	host: 'localhost',
	port: '8080',
	logPrefix: 'multimedia-ya'
};

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
		.pipe(concatJs('bundle.js'))
		.pipe(uglify())
		.pipe(gulp.dest(routes.build.js))
		.pipe(reload({
			stream: true
		}));
});

gulp.task('style', function() {
	gulp.src(routes.src.css)
		.pipe(autoprefixer())
		.pipe(concatCss('bundle.css'))
		.pipe(cleanCss())
		.pipe(gulp.dest(routes.build.css))
		.pipe(reload({
			stream: true
		}));
});

gulp.task('image', function() {
	gulp.src(routes.src.img)
		.pipe(gulp.dest(routes.build.img))
		.pipe(reload({
			stream: true
		}));
});

gulp.task('build', [
	'html',
	'script',
	'style',
	'image'
]);