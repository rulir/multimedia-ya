"use strict";

class App {
	constructor(el) {
		this.appEl = el;
		this.form = this.appEl.querySelector('.source-links-form');
		this.form.addEventListener('submit', this._onSourceLinksFormSubmit.bind(this));
	};

	_onSourceLinksFormSubmit(e) {
		e.preventDefault();
		this.urlMap = {
			videoUrl: this.appEl.querySelector('#videoUrl').value,
			subUrl: this.appEl.querySelector('#subUrl').value,
			audioUrl: this.appEl.querySelector('#audioUrl').value,
		};
		this.appEl.querySelector('.initial-page').classList.add('initial-page_hidden');
		this.appEl.querySelector('.video-page').classList.remove('video-page_hidden');

		this.canvas = new Canvas(this.appEl.querySelector('.canvas'));
		this.player = new Player(this.appEl.querySelector('.video'), this.urlMap.videoUrl, this.canvas);
	};
};

class Player {
	constructor(el, videoUrl, canvas) {
		this.playerEl = el;
		this.videoUrl = videoUrl;
		this.canvas = canvas;
		this.videoSourceEl = document.createElement('source');
		this.videoSourceEl.setAttribute('src', this.videoUrl);
		this.playerEl.appendChild(this.videoSourceEl);
		this.playerEl.addEventListener('play', this._onVideoStartToPlay.bind(this));
	};

	_onVideoStartToPlay(e) {
		this.videoWidth = this.playerEl.videoWidth;
		this.videoHeight = this.playerEl.videoHeight;
		this.watchTheVideo();
	};

	watchTheVideo() {
		if (this.playerEl.paused || this.playerEl.ended) {
			return;
		};

		this.paintFrame();

		setTimeout(() => {
			this.watchTheVideo();
		}, 0);
	};

	paintFrame() {
		this.canvas.context.drawImage(this.playerEl, 0, 0, this.videoWidth, this.videoHeight);
		let frame = this.canvas.context.getImageData(0, 0, this.videoWidth, this.videoHeight);
		let length = frame.data.length / 4;

		for (let i = 0; i < length; i++) {
			let r = frame.data[i * 4 + 0];
			let g = frame.data[i * 4 + 1];
			let b = frame.data[i * 4 + 2];
			let average = 0.21 * r + 0.72 * g + 0.07 * b;
			frame.data[i * 4 + 0] = average;
			frame.data[i * 4 + 1] = average;
			frame.data[i * 4 + 2] = average;
		};

		this.canvas.context.putImageData(frame, 0, 0);


		// let data = frameData.data;
		// let iLen = frameData.width;
		// let jLen = frameData.height;
		// let index; 
		// let average;

		// for (let i = 0; i < iLen; i++) {
		// 	for (let j = 0; j < jLen; j++) {
		// 		index = (i * 4) * jLen + (j * 4);
		// 		average = (data[index] + data[index + 1] + data[index + 2]) / 3;
		// 		data[index] = average;
		// 		data[index + 1] = average;
		// 		data[index + 2] = average;
		// 	};
		// };

		// this.canvas.context.putImageData(frameData, 0, 0);
	};
};

class Canvas {
	constructor(el) {
		this.canvasEl = el;
		this.context = this.canvasEl.getContext("2d");
	};
};

const app = new App(document.querySelector('.app'));