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
			subsUrl: this.appEl.querySelector('#subUrl').value,
			audioUrl: this.appEl.querySelector('#audioUrl').value,
		};
		this.appEl.querySelector('.initial-page').classList.add('initial-page_hidden');
		this.appEl.querySelector('.video-page').classList.remove('video-page_hidden');

		this.canvas = new Canvas(this.appEl.querySelector('.canvas'));
		this.subs = new Subs(this.urlMap);
		this.player = new Player(this.appEl.querySelector('.video'), this.urlMap, this.canvas, this.subs);
	};
};

class Player {
	constructor(el, urlMap, canvas, subs) {
		this.playerEl = el;
		this.videoUrl = urlMap.videoUrl;
		this.subsUrl = urlMap.subsUrl;
		this.canvas = canvas;
		this.subs = subs;
		this.subsCurrСue = 0;
		this.videoSourceEl = document.createElement('source');
		this.videoSourceEl.setAttribute('src', this.videoUrl);
		this.playerEl.appendChild(this.videoSourceEl);
		this.playerEl.addEventListener('play', this._onVideoStartToPlay.bind(this));
		this.playerEl.addEventListener('seeking', this._onVideoSeeking.bind(this));
	};

	_onVideoStartToPlay(e) {
		if (this.checkSubsAvailability(e) === false) {
			return;
		};
		this.setCanvasSizesToVideoSizes();
		this.startTimeСountup();
		this.watchTheVideo();
	};

	_onVideoSeeking(e) {
		filterParsedSubs();
	};

	checkSubsAvailability(e) {
		if (!this.subs.ready) {
			e.preventDefault();
			this.playerEl.pause();
			this.playerEl.currentTime = 0;
			return false;
		};
	};

	setCanvasSizesToVideoSizes() {
		this.videoWidth = this.playerEl.clientWidth;
		this.videoHeight = this.playerEl.clientHeight;
		this.canvas.canvasEl.width = this.videoWidth;
		this.canvas.canvasEl.height = this.videoHeight;
	};

	getNeededSubsForThisTime() {
		let currentTime = parseInt(this.playerEl.currentTime * 1000);
		let filteredSubs = this.subs.parsedSubs.filter(item => {
			if (item.endTime >= currentTime) {
				return true;
			};
		});
		return filteredSubs;
	};

	filterParsedSubs() {
		if (to) {
			clearTimeout(to);
		};
		let to = setTimeout(() => {
			this.subs.parsedSubs = this.getNeededSubsForThisTime();
		}, 10);

	};

	startTimeСountup() {
		
		let marginToStartOfSubs = this.subs.parsedSubs[this.subsCurrСue].endTime - parseInt(this.playerEl.currentTime);
		let nearestPauseDuration = this.subs.parsedSubs[this.subsCurrСue].endTime - this.subs.parsedSubs[this.subsCurrСue].startTime;

		console.log(marginToStartOfSubs, nearestPauseDuration);

		let t1 = setTimeout(() => {
			this.playerEl.pause();
			clearTimeout(t1);
			let t2 = setTimeout(() => {
				this.playerEl.play();
				this.subsCurrСue++;
				marginToStartOfSubs = this.subs.parsedSubs[this.subsCurrСue].endTime - parseInt(this.playerEl.currentTime);
				nearestPauseDuration = this.subs.parsedSubs[this.subsCurrСue].endTime - this.subs.parsedSubs[this.subsCurrСue].startTime;
				clearTimeout(t2);
			}, nearestPauseDuration);
		}, marginToStartOfSubs);
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
	};
};

class Canvas {
	constructor(el) {
		this.canvasEl = el;
		this.context = this.canvasEl.getContext("2d");
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

const app = new App(document.querySelector('.app'));