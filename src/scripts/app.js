"use strict";

/*класс приложения*/
class App {
	constructor(el) {
		this.appEl = el;
		this.form = this.appEl.querySelector('.source-links-form');
		this.form.addEventListener('submit', this._onSourceLinksFormSubmit.bind(this));
	};

	/*обработчик события отправки формы. Собирает данные из поле и осуществляет инициализацию элементов второй страницы*/
	_onSourceLinksFormSubmit(e) {
		e.preventDefault();
		let overlayVideoUrl = './assets/video/overlay.mp4'; //видео для создания эффекта старины
		this.overlayCanvas = this.appEl.querySelector('.canvas-overlay'); //узел канваса для отрисовки эфекта старины

		/*урлы видео, аудио и субтитров введенные пользователем*/
		this.urlMap = {
			videoUrl: this.appEl.querySelector('#videoUrl').value,
			subsUrl: this.appEl.querySelector('#subUrl').value,
			audioUrl: this.appEl.querySelector('#audioUrl').value,
		};
		this.appEl.querySelector('.initial-page').classList.add('initial-page_hidden'); //страница с формой
		this.appEl.querySelector('.video-page').classList.remove('video-page_hidden'); //страница с видео
		this.subs = new Subs(this.urlMap); //инстанс класса для работы с субтитрами
		this.player = new Player(this.appEl.querySelector('.video-custom'), this.urlMap.videoUrl, this.subs); //инстанс плеера для проигрывания загруженного видео
		this.overlayPlayer = new Player(this.appEl.querySelector('.video-overlay'), overlayVideoUrl, this.subs); //инстанс плеера для проирывания видео с эффектом старины
		this.audio = new Audio(this.appEl.querySelector('.audio'), this.urlMap.audioUrl); //инстанс для работы с аудио
		this.canvas = new Canvas(this.appEl.querySelector('.canvas'), this.player, this.overlayPlayer, this.subs, this.overlayCanvas, this.audio);
	};
};


/*класс для инициализации видеоплеера*/
class Player {
	constructor(el, url, subs) {
		this.playerEl = el;
		this.videoUrl = url;
		this.isPlaying = false;
		this.width = 640; //ширина видео
		this.height = 360; //высота видео
		this.playerEl.width = this.width;
		this.playerEl.height = this.height;
		this.videoSourceEl = document.createElement('source'); //создать элемент <source>
		this.videoSourceEl.setAttribute('src', this.videoUrl); //установить источник
		this.playerEl.appendChild(this.videoSourceEl); //добавить <source> внутрь <video>
	};

	play() {
		this.playerEl.play(); //воспроизведение видео
	};

	pause() {
		this.playerEl.pause(); //пауза
	};
};

/*класс для инициализации канваса*/
class Canvas {
	constructor(el, player, overlayPlayer, subs, overlayCanvas, audio) {
		this.canvasEl = el; //узел <canvas> на котором будем рисовать
		this.overlayCanvas = overlayCanvas; // узкл <canvas> для отрисовки эфеекта старины
		this.player = player; //плеер для проигрывания загруженного видео
		this.overlayPlayer = overlayPlayer; //плеер для проигрывания видео с эффектом
		this.subs = subs; //объект с распарсенными субтитрами
		this.audio = audio; //аудиоплеер
		this.overlayCanvasContext = this.overlayCanvas.getContext("2d");
		this.subsCurrСue = 0; //позиция текущей реплики в субтитрах, меняяется после показа каждой фразы
		this.context = this.canvasEl.getContext("2d");
		this.canvasEl.addEventListener('click', this._onCanvasClick.bind(this)); //воспроизведение/пауза по клику
		this.canvasEl.width = this.player.width; //размеры канваса для равны размеру видеоплеера
		this.canvasEl.height = this.player.height;
		this.context.fillStyle = 'rgb(30, 30, 30)';
		this.context.fillRect(0, 0, this.canvasEl.width, this.canvasEl.height);
	};

	/*воспроизведение/пауза*/
	_onCanvasClick(e) {
		if (this.player.isPlaying) {
			this.player.pause(); //останавливаем плеер с загруженным видео и видео с эффектом
			this.overlayPlayer.pause();
			this.audio.pause();
			clearTimeout(this.t1); //очищаем интервалы показа субтитров
			clearTimeout(this.t2);
			cancelAnimationFrame(this.textReq); //очищаем frame requestы отрисовывающие текст и изображение
			cancelAnimationFrame(this.videoReq);
			this.player.isPlaying = !this.player.isPlaying;
		} else {
			if (this.checkSubsAvailability(e) === false) { //проверяем доступны ли субтитры
				return;
			};
			this.subs.parsedSubs = this.getNeededSubsForThisTime(); //фильтруем масив с субтитрами в соответсявии с текущим временем проигрывания
			this.subsCurrСue = 0; //начинаем с первой реплики
			this.player.play();
			this.overlayPlayer.play();
			this.audio.play();
			this.prepareShaders();
			this.startTimeСountup(); //начинаем вычислять время до показа субтитров
			cancelAnimationFrame(this.textReq);
			this.videoReq = requestAnimationFrame(this.watchTheVideo.bind(this)); //отрисовываем кадр
			this.player.isPlaying = !this.player.isPlaying;
		};
	};

	/*функция для фильтрации субтитров при воспроизведении после паузы или перемотки*/
	getNeededSubsForThisTime() {
		let currentTime = parseInt(this.player.playerEl.currentTime * 1000);
		let filteredSubs = this.subs.parsedSubs.filter(item => {
			if (item.endTime >= currentTime) {
				return true;
			};
		});
		return filteredSubs; //возвтращаем массив с репликами начиная с ближайшей
	};

	/*продолжаем воспроизведение видео, после показа субтитров*/
	resumePlayAfterSubs() {
		this.player.play();
		this.startTimeСountup();
		cancelAnimationFrame(this.textReq);
		this.videoReq = requestAnimationFrame(this.watchTheVideo.bind(this));
	};

	startTimeСountup() {
		/*вычисляем время до начала показа субтитров*/
		let delayToStartOfSubs = this.subs.parsedSubs[this.subsCurrСue].endTime - (parseInt(this.player.playerEl.currentTime) * 1000);
		/*вычисляем время показа*/
		let pauseDuration = this.subs.parsedSubs[this.subsCurrСue].endTime - this.subs.parsedSubs[this.subsCurrСue].startTime;

		/*ждем пока прийдет время показать субтитры*/
		this.t1 = setTimeout(() => {
			this.player.pause();
			cancelAnimationFrame(this.videoReq);
			//рисуем субтитры
			this.textReq = requestAnimationFrame(this.drawText.bind(this));
			clearTimeout(this.t1);

			/*ждем пока прийдет время продолжить воспроизведение*/
			this.t2 = setTimeout(() => {
				/*проверяем не закончились ли субтитры*/
				if (this.subsCurrСue < (this.subs.parsedSubs.length - 1)) {
					this.subsCurrСue++;
				} else {
					this.subsCurrСue = 0;
				}
				this.resumePlayAfterSubs();
				clearTimeout(this.t2);
			}, pauseDuration);
		}, delayToStartOfSubs);
	};

	//рисуем кадр с переодичностью кадров в сек
	watchTheVideo() {
		this.paintFrame();
		cancelAnimationFrame(this.textReq);
		this.videoReq = requestAnimationFrame(this.watchTheVideo.bind(this));
	};

	//функция отрисовки кадра с эффектом grayscale
	paintFrame() {
		this.context.drawImage(this.player.playerEl, 0, 0, this.player.width, this.player.height);
		//режим наложения позволяет добится черно-белой картинки
		this.context.globalCompositeOperation = 'color';
		this.context.fillStyle = 'rgb(255, 255, 255)';
		this.context.fillRect(0, 0, this.canvasEl.width, this.canvasEl.height);
		//рисуем эффект старины
		this.paintOverlayEffect();
	};

	prepareShaders() {
		let vertices = [-1.0, -1.0,
			1.0, -1.0, -1.0, 1.0,

			-1.0, 1.0,
			1.0, -1.0,
			1.0, 1.0
		];

		let webglCanvas = document.querySelector('.canvas-webgl');
		let gl = webglCanvas.getContext("experimental-webgl");

		let compileShader = function(shaderSource, shaderType) {
			let shader = gl.createShader(shaderType);
			gl.shaderSource(shader, shaderSource);
			gl.compileShader(shader);
			return shader;
		};

		let getShader = function(id) {
			let shaderScript = document.getElementById(id);
			let shaderSource = "";
			let textLine = shaderScript.firstChild;
			while(textLine) {
				if (textLine.nodeType == 3) {
					shaderSource += textLine.textContent;
					textLine = textLine.nextSibling;
				};
			};

			let shader;

			if (shaderScript.type == "x-shader/x-fragment") {
				shader = compileShader(shaderSource, gl.FRAGMENT_SHADER);
			} else if (shaderScript.type == "x-shader/x-vertex") {
				shader = compileShader(shaderSource, gl.VERTEX_SHADER);
			} else {
				return null;
			};
			return shader;
		};

		let vertexShader = getShader("vertex-shader");
		let fragmenthader = getShader("fragment-shader");

		console.dir(vertexShader, fragmenthader);

		let shaderProgram = gl.createProgram();
		gl.attachShader(shaderProgram, vertexShader);
		gl.attachShader(shaderProgram, fragmenthader);
		gl.linkProgram(shaderProgram);
		gl.useProgram(shaderProgram);

		gl.deleteShader(vertexShader);
		gl.deleteShader(fragmenthader);

		let vertexPositionLocation = gl.getAttribLocation(shaderProgram, "aVertexPosition");
		let buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(vertexPositionLocation);
		gl.vertexAttribPointer(vertexPositionLocation, 2, gl.FLOAT, false, 0, 0);

		let draw = function() {
			gl.drawArrays(gl.TRIANGLES, 0, 6);
		};

		let render = function() {
			requestAnimationFrame(render);
			draw();
		};

		render();
	};



	paintOverlayEffect() {
		//берем изображениие из плеера для видео с эффектом старины в канвас для отрисвоки эффекта
		this.overlayCanvasContext.drawImage(this.overlayPlayer.playerEl, 0, 0, this.overlayPlayer.width, this.overlayPlayer.height);
		let imageData = this.overlayCanvasContext.getImageData(0, 0, this.canvasEl.width, this.canvasEl.height);
		this.overlayCanvasContext.putImageData(imageData, 0, 0);
		this.context.globalCompositeOperation = 'multiply';
		//отрисовываем эффект с режимом наложения multiply
		this.context.drawImage(this.overlayCanvas, 0, 0, this.canvasEl.width, this.canvasEl.height);
		this.context.globalCompositeOperation = 'source-over';
	};

	//функция для отрисовки субтитров
	drawText(text) {
		this.context.fillStyle = 'rgb(50, 50, 50)';
		//фон
		this.context.fillRect(0, 0, this.canvasEl.width, this.canvasEl.height);
		this.context.font = '36px Oranienbaum';
		this.context.textAlign = "center";
		this.context.fillStyle = 'rgb(255, 255, 255)';
		//делаем переносы по словам
		this.wrapText(this.subs.parsedSubs[this.subsCurrСue].text, this.canvasEl.width, 40, this.canvasEl.width / 2, this.canvasEl.height / 2);
		//накладываем эффект старины
		this.paintOverlayEffect();
		cancelAnimationFrame(this.videoReq);
		this.textReq = requestAnimationFrame(this.drawText.bind(this));
	};

	//перенос субтитров по словам
	wrapText(text, maxWidth, lineHeight, marginLeft, marginTop) {
		let words = text.split(" ");
		let line = "";
		for (let i = 0; i < words.length; i++) {
			let temporaryTextLine = line + words[i] + " ";
			//получаем ширину линии текста
			let temporaryTextLineWidth = this.context.measureText(temporaryTextLine).width;
			//проверяем влазит ли в канвас
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

	//проверка доступности субтитров
	checkSubsAvailability(e) {
		//флаг устанавливается если субтитры были успешно загружены
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
		//получаем субтитры по url
		fetch(urlMap.subsUrl)
			.then(res => {
				//парсим субтитры в текст
				res.text()
					.then(data => {
						//парсим субтитры в js
						this.parsedSubs = this.parseFromSrt(data);
						this.ready = true;
					});
			});
	};

	//парсим субтитры
	parseFromSrt(srt) {
		//из текста в js, нагло, при помощи библиотеки subtitle-parser
		let parsedSubs = parser.fromSrt(srt);
		//приводим время к формату милисекунд
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