"use strict";

class App {
	constructor(el) {
		this.appEl = el;
		this.form = this.appEl.querySelector('.source-links-form');
		this.form.addEventListener('submit', this._onSourceLinksFormSubmit.bind(this));
	};

	_onSourceLinksFormSubmit(e) {
		e.preventDefault();

		let overlayVideoUrl = './assets/video/overlay.mp4';
		this.overlayCanvas = this.appEl.querySelector('.canvas-overlay');

		this.urlMap = {
			videoUrl: this.appEl.querySelector('#videoUrl').value,
			subsUrl: this.appEl.querySelector('#subUrl').value,
			audioUrl: this.appEl.querySelector('#audioUrl').value,
		};

		this.appEl.querySelector('.initial-page').classList.add('initial-page_hidden');
		this.appEl.querySelector('.video-page').classList.remove('video-page_hidden');

		this.subs = new Subs(this.urlMap);
		this.player = new Player(this.appEl.querySelector('.video-custom'), this.urlMap.videoUrl, this.subs);
		this.overlayPlayer = new Player(this.appEl.querySelector('.video-overlay'), overlayVideoUrl, this.subs);
		this.audio = new Audio(this.appEl.querySelector('.audio'), this.urlMap.audioUrl);
		this.canvas = new Canvas(this.appEl.querySelector('.canvas'), this.player, this.overlayPlayer, this.subs, this.overlayCanvas, this.audio);
	};
};

class Player {
	constructor(el, url, subs) {
		this.playerEl = el;
		this.videoUrl = url;
		this.isPlaying = false;
		this.width = 640;
		this.height = 360;
		this.playerEl.width = this.width;
		this.playerEl.height = this.height;
		this.videoSourceEl = document.createElement('source');
		this.videoSourceEl.setAttribute('src', this.videoUrl);
		this.playerEl.appendChild(this.videoSourceEl);
	};

	play() {
		this.playerEl.play();
	};

	pause() {
		this.playerEl.pause();
	};
};

class Canvas {
	constructor(el, player, overlayPlayer, subs, overlayCanvas, audio) {
		this.canvasEl = el;
		this.overlayCanvas = overlayCanvas;
		this.player = player;
		this.overlayPlayer = overlayPlayer;
		this.overlayCanvasContext = this.overlayCanvas.getContext("2d");
		this.subs = subs;
		this.subsCurrСue = 0;
		this.audio = audio;
		this.context = this.canvasEl.getContext("2d");
		this.canvasEl.addEventListener('click', this._onCanvasClick.bind(this));
		this.canvasEl.width = this.player.width;
		this.canvasEl.height = this.player.height;
		this.context.fillStyle = 'rgb(0, 0, 0)';
		this.context.fillRect(0, 0, this.canvasEl.width, this.canvasEl.height);
	};

	_onCanvasClick(e) {
		if (this.player.isPlaying) {
			this.player.pause();
			this.overlayPlayer.pause();
			this.audio.pause();
			clearTimeout(this.t1);
			clearTimeout(this.t2);
			cancelAnimationFrame(this.textReq);
			cancelAnimationFrame(this.videoReq);
			this.player.isPlaying = !this.player.isPlaying;
		} else {
			if (this.checkSubsAvailability(e) === false) {
				return;
			};
			this.subs.parsedSubs = this.getNeededSubsForThisTime();
			this.subsCurrСue = 0;
			this.player.play();
			this.overlayPlayer.play();
			this.audio.play();
			this.startTimeСountup();
			cancelAnimationFrame(this.textReq);
			this.videoReq = requestAnimationFrame(this.watchTheVideo.bind(this));
			this.player.isPlaying = !this.player.isPlaying;
		};
	};

	getNeededSubsForThisTime() {
		let currentTime = parseInt(this.player.playerEl.currentTime * 1000);
		let filteredSubs = this.subs.parsedSubs.filter(item => {
			if (item.endTime >= currentTime) {
				return true;
			};
		});
		return filteredSubs;
	};

	resumePlayAfterSubs() {
		this.player.play();
		this.startTimeСountup();
		cancelAnimationFrame(this.textReq);
		this.videoReq = requestAnimationFrame(this.watchTheVideo.bind(this));
	};

	startTimeСountup() {
		let delayToStartOfSubs = this.subs.parsedSubs[this.subsCurrСue].endTime - (parseInt(this.player.playerEl.currentTime) * 1000);
		let pauseDuration = this.subs.parsedSubs[this.subsCurrСue].endTime - this.subs.parsedSubs[this.subsCurrСue].startTime;
		this.t1 = setTimeout(() => {
			this.player.pause();
			cancelAnimationFrame(this.videoReq);
			this.textReq = requestAnimationFrame(this.drowText.bind(this));
			clearTimeout(this.t1);
			this.t2 = setTimeout(() => {
				if (this.subsCurrСue < (this.subs.parsedSubs.length - 1)) {
					this.subsCurrСue++;
				};
				this.resumePlayAfterSubs();
				clearTimeout(this.t2);
			}, pauseDuration);
		}, delayToStartOfSubs);
	};

	watchTheVideo() {
		if (this.player.playerEl.ended) {
			console.log('ended');
			this.audio.pause();
			this.overlayPlayer.pause();
			return;
		};
		this.paintFrame();
		cancelAnimationFrame(this.textReq);
		this.videoReq = requestAnimationFrame(this.watchTheVideo.bind(this));
	};

	cancelVideoAndAudio() {

	};

	paintFrame() {
		this.context.drawImage(this.player.playerEl, 0, 0, this.player.width, this.player.height);
		let frame = this.context.getImageData(0, 0, this.player.width, this.player.height);
		let length = frame.data.length / 4;

		for (let i = 0; i < length; i++) {
			let r = frame.data[i * 4 + 0];
			let g = frame.data[i * 4 + 1];
			let b = frame.data[i * 4 + 2];
			let average = 0.21 * r + 0.72 * g + 0.07 * b;
			frame.data[i * 4 + 0] = average;
			frame.data[i * 4 + 1] = average;
			frame.data[i * 4 + 2] = average;
			frame.data[i * 4 + 3] = 220;
		};
		this.context.putImageData(frame, 0, 0);
		this.paintOverlayEffect();
	};

	paintOverlayEffect() {
		this.overlayCanvasContext.drawImage(this.overlayPlayer.playerEl, 0, 0, this.overlayPlayer.width, this.overlayPlayer.height);
		let imageData = this.overlayCanvasContext.getImageData(0, 0, this.canvasEl.width, this.canvasEl.height);
		this.overlayCanvasContext.putImageData(imageData, 0, 0);
		this.context.globalCompositeOperation = 'multiply';
		this.context.drawImage(this.overlayCanvas, 0, 0, this.canvasEl.width, this.canvasEl.height);
		this.context.globalCompositeOperation = 'source-over';
	};

	drowText(text) {
		this.context.fillStyle = 'rgb(50, 50, 50)';
		this.context.fillRect(0, 0, this.canvasEl.width, this.canvasEl.height);
		this.context.font = '36px Oranienbaum';
		this.context.textAlign = "center";
		this.context.fillStyle = 'rgb(255, 255, 255)';
		this.wrapText(this.subs.parsedSubs[this.subsCurrСue].text, this.canvasEl.width, 40, this.canvasEl.width / 2, this.canvasEl.height / 2);
		this.paintOverlayEffect();
		cancelAnimationFrame(this.videoReq);
		this.textReq = requestAnimationFrame(this.drowText.bind(this));
	};

	wrapText(text, maxWidth, lineHeight, marginLeft, marginTop) {
		let words = text.split(" ");
		let line = "";
		for (let i = 0; i < words.length; i++) {
			let temporaryTextLine = line + words[i] + " ";
			let temporaryTextLineWidth = this.context.measureText(temporaryTextLine).width;
			if (temporaryTextLineWidth > (maxWidth - 50)) {
				this.context.fillText(line, marginLeft, marginTop);
				line = words[i] + " ";
				marginTop += lineHeight;
			} else {
				line = temporaryTextLine;
			};
		};
		this.context.fillText(line, marginLeft, marginTop);
	};

	checkSubsAvailability(e) {
		if (!this.subs.ready) {
			e.preventDefault();
			this.player.pause();
			this.player.playerEl.currentTime = 0;
			return false;
		};
	};
};

class Subs {
	constructor(urlMap) {
		this.ready = false;
		fetch(urlMap.subsUrl)
			.then(res => {
				res.text()
					.then(data => {
						this.parsedSubs = this.parseFromSrt(data);
						this.ready = true;
					});
			});
	};

	parseFromSrt(srt) {
		let parsedSubs = parser.fromSrt(srt);
		parsedSubs.map(item => {
			timeParseToMs('endTime', item);
			timeParseToMs('startTime', item);
		});

		function timeParseToMs(timeType, item) {
			let subsStartTimeBuffer = item[timeType].split(':');
			let hours = subsStartTimeBuffer[0];
			let mins = Number(subsStartTimeBuffer[1]);
			let secsAndMsecsBuffer = subsStartTimeBuffer[2].split(',');
			let secs = Number(secsAndMsecsBuffer[0]);
			let msecs = Number(secsAndMsecsBuffer[1]);
			item[timeType] = hours * 3600000 + mins * 60000 + secs * 1000 + msecs;
		};
		return parsedSubs;
	};
};

class Audio {
	constructor(el, url) {
		this.audioEl = el;
		this.url = url;
		this.audioSourceEl = document.createElement('source');
		this.audioSourceEl.setAttribute('src', this.url);
		this.audioEl.appendChild(this.audioSourceEl);
	};
	play() {
		this.audioEl.play();
	};
	pause() {
		this.audioEl.pause();
	};
};

const app = new App(document.querySelector('.app'));