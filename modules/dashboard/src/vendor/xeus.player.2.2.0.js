/* eslint-disable */
var console = window.console || {
    log: function() { }
};
console.log("Xeus-Gate Player VER: 2.2.0 2022-0905-0000");

var XeusGate = {
    Player: null,
    Source: null,
    Renderer: {},
    debug: false,
    Now: function() {
        return window.performance ? window.performance.now() / 1e3 : Date.now() / 1e3
    },

    ToHex: function(byteArray) {
        return Array.prototype.map.call(byteArray, function(byte) {
            return ('00' + (byte & 0xFF).toString(16)).slice(-2);
        }).join(' ');
    },

    Log: function(msg) {
        if (this.debug) {
            console.log(">>>  " + msg);
        }
    },

    Queue: function() {
        var queue = [];
        var offset = 0;
        var capability = 10;

        this.getLength = function() {
            return (queue.length - offset);
        }

        this.isEmpty = function() {
            return (queue.length == 0);
        }

        this.enqueue = function(item) {
            if ((queue.length - offset) > this.capability) {
                this.dequeue();
            }
            queue.push(item);
        }

        this.dequeue = function() {
            if (queue.length == 0) return undefined;
            var item = queue[offset];
            if (++offset * 2 >= queue.length) {
                queue = queue.slice(offset);
                offset = 0;
            }
            return item;
        }

        this.peek = function() {
            return (queue.length > 0 ? queue[offset] : undefined);
        }
    }
};

// ///////////////////////////////////////////
// XeusGate.Player
// ///////////////////////////////////////////

XeusGate.Player = function() {
    "user strict";

    var setStyles = function(element, styles) {
        for (var name in styles) {
            element.style[name] = styles[name]
        }
    };

    var Player = function(options) {
        this.options = options || {};
        if (this.options.debug) {
            XeusGate.debug = this.options.debug;
        }

        if ((this.options.codec == undefined) || (this.options.codec == 'auto')) {
            this.options.codec = 'h264';
        }

        if (this.options.reconnect == undefined) {
            this.options.reconnect = true;
        }

        if (this.options.timeout == undefined) {
            this.options.timeout = 20; //대기 시간 20초
        }

        if (this.options.reconnectWaitTime == undefined) {
            this.options.reconnectWaitTime = 10;
        }


        this.playerElement = document.getElementById(this.options.playerId);
        this.playerVisible = true;

        if (this.options.codec == 'h264') {
            this.createVideoElement('video');
            this.renderer = new XeusGate.Renderer.H264(this, this.options);
            XeusGate.Log("Player create renderer : XeusGate.Renderer.H264");
        } else if (this.options.codec == 'mjpeg') {
            this.createVideoElement('img');
            this.renderer = new XeusGate.Renderer.MJPEG(this, this.options);
            XeusGate.Log("Player create renderer : XeusGate.Renderer.MJPEG");
        } else {
            XeusGate.Log("unsupported codec name: " + this.options.codec);
        }

        this.createTextElement();
        this.source = new XeusGate.Source(this, this.renderer, this.options);
        this.start();
    };

    Player.prototype.start = function() {
        if (this.renderer && this.source) {
            this.renderer.start();
            this.source.start();
            XeusGate.Log("Player started...");
        } else {
            XeusGate.Log("Player start: renderer or source is null.");
        }
    };

    Player.prototype.isPlayerVisible = function() {
        return this.playerVisible;
    };

    Player.prototype.showText = function(txt) {
        this.options.spanElement.innerHTML = txt;
        this.visible(this.options.textElement, true);
    };

    Player.prototype.visible = function(element, visible) {
        element.style.visibility = (visible) ? 'visible' : 'hidden';
    };

    Player.prototype.createTextElement = function() {
        var wrap = document.createElement('div');
        setStyles(wrap, {
            'display': "block",
            'width': '100%',
            'height': '100%',
            'position': 'absolute',
            'left': '0px',
            'top': '0px',
            'text-align': 'center',
            'background-color': 'rgb(34, 34, 34)'
        });
        var div = document.createElement('div');
        setStyles(div, {
            'position': 'relative',
            'top': '50%',
            'margin-top': '-1em',
            'background-color': 'rgb(34, 34, 34)'
        });
        var span = document.createElement('span');
        setStyles(span, {
            'font-size': '13px',
            'display': 'block',
            'color': 'rgb(180, 180, 180)'
        });
        div.appendChild(span);
        wrap.appendChild(div);
        this.playerElement.appendChild(wrap);
        this.options.textElement = wrap;
        this.options.spanElement = span;
        this.showText("연결을 시도합니다.");
        XeusGate.Log("Player TextElement created...");
    };

    Player.prototype.createVideoElement = function(elementName) {
        var w = '100%';
        var h = '100%';
        if (this.options.width) {
            w = this.options.width;
        }
        if (this.options.heigh) {
            h = this.options.height;
        }

        var video = document.createElement(elementName);
        if (elementName == 'video') {
            video.autoplay = true;
            video.muted = true;
            video.controls = false;
            video.loop = false;
            video.setAttribute('oncontextmenu', 'return false;');
        }
        setStyles(video, {
            'display': "block",
            'width': w,
            'height': h,
            // 'position': 'absolute',
            'left': '0px',
            'top': '0px',
            'transform': 'translateZ(0)',
            'background-color': 'rgb(34, 34, 34)'
        });
        this.playerElement.appendChild(video);
        this.options.videoElement = video;
        XeusGate.Log("Player VideoElement created...");
    };

    //not supported function
    Player.prototype.moveto = function(time) {
        if (this.source) {
            this.source.moveto(time);
        }
    };

    //not supported function
    Player.prototype.speed = function(spd) {
        if (this.source) {
            this.source.speed(spd);
        }
    };

    //not supported function
    Player.prototype.pause = function() {
        if (this.source) {
            this.source.pause();
        }
    };

    //not supported function
    Player.prototype.resume = function() {
        if (this.source) {
            this.source.resume();
        }
    };

    //not supported function
    Player.prototype.forward = function() {
        if (this.source) {
            this.source.forward();
        }
    };

    //not supported function
    Player.prototype.backward = function() {
        if (this.source) {
            this.source.backward();
        }
    };

    Player.prototype.close = function() { //!! 2
        if (this.source) {
            this.source.close();
        }
        if (this.renderer) {
            this.renderer.close();
        }
        XeusGate.Log("Player closed...");
    };

    Player.prototype.destroy = function() {
        this.close();

        if (this.options.videoElement) {
            this.playerElement.removeChild(this.options.videoElement);
            this.options.videoElement = undefined;
        }
        if (this.options.textElement) {
            this.playerElement.removeChild(this.options.textElement);
            this.options.textElement = undefined;
        }
        if (this.source) {
            this.source.destroy();
        }
        if (this.renderer) {
            this.renderer.destroy();
        }
        // [수정] 무조건 console.log 하던 것 → debug 플래그 기반 Log 로 통일.
        //   CCTV 5개 × 30초 순환 + StrictMode 이중 마운트로 로그가 과도하게 쌓였음.
        XeusGate.Log("Player destroyed... " + this.options.cctvMgrNo);
    };
    return Player;
}();


XeusGate.Source = function() {
    "use strict";

    var WsSource = function(player, renderer, options) {
        this.options = options || {};
        this.socket = null;
        this.player = player;
        this.renderer = renderer;

        this.reconnectIntervalId = 0; // 영상재요청 대기시간 알림용
        this.connectIntervalId = 0; // 데이터 수신 대기시간 체크용

        this.serverError = null; //서버에서 전달된 메세지
        this.playing = false;
    };

    WsSource.prototype.start = function() {
        this.playing = false;
        this.socket = new WebSocket(this.options.url);
        this.socket.binaryType = "arraybuffer";
        this.socket.onmessage = this.onMessage.bind(this);
        this.socket.onopen = this.onOpen.bind(this);
        this.socket.onerror = this.onClose.bind(this);
        this.socket.onclose = this.onClose.bind(this);
        XeusGate.Log("WsSource Started...");
    };

    WsSource.prototype.onOpen = function() {
        XeusGate.Log("WsSource Opened...");
        this.playing = false;
        var cmd = "{" +
            "\"cmd\":\"open\"," +
            "\"cctvMgrNo\":\"" + this.options.cctvMgrNo + "\"," +
            "\"size\":\"" + this.options.size + "\"," +
            "\"bitrate\":\"" + this.options.bitrate + "\"," +
            "\"framerate\":\"" + this.options.framerate + "\"," +
            "\"userId\":\"" + this.options.userId + "\", " +
            "\"evtType\":\"" + this.options.evtType + "\", " +
            "\"timestamp\":\"" + this.options.timestamp + "\", " +
            "\"speed\":\"" + this.options.speed + "\", " +
            "\"codec\":\"" + this.options.codec + "\", " +
            "\"src\":\"" + this.options.rtspUrl + "\" " +
            "}";

        XeusGate.Log(cmd);
        this.socket.send(cmd);
        //timeout(20초) 동안 데이터 수신 없으면 close
        var connectWaitTime = 0;
        this.connectIntervalId = setInterval(function() {
            this.player.showText("데이터 수신 대기중... (" + connectWaitTime + "초)");
            if (connectWaitTime >= this.options.timeout) { // 20초
                clearInterval(this.connectIntervalId);
                this.close();
            }
            connectWaitTime++;
        }.bind(this), 1000); // 초
    };


    WsSource.prototype.onClose = function() {
        clearInterval(this.connectIntervalId); // 데이터 수신 대기시간 체크용
        clearInterval(this.reconnectIntervalId); // 영상재요청 대기시간 알림용

        if (this.options.reconnect) {
            XeusGate.Log("retry connection...");
            if (this.player) {
                this.player.close();
                //
                var waitSeconds = this.options.reconnectWaitTime;
                this.reconnectIntervalId = setInterval(function() {
                    var message = (this.serverError != null) ? this.serverError : "연결 종료"
                    this.player.showText(message + "!.  " + waitSeconds + "초 후 연결 재 시도...");
                    waitSeconds--;
                    if (waitSeconds <= 0) {
                        this.player.showText(message + "!.  연결 재시도 중...");
                        clearInterval(this.reconnectIntervalId);
                        this.player.start();
                    }
                }.bind(this), 1000); // 초
            }
        } else {
            XeusGate.Log("WsSource onClosing...");
            if (this.player) {
                this.player.showText("연결이 종료 되었습니다.");
                this.player.close(); //!! 1
            }
        }
    };

    WsSource.prototype.onMessage = function(ev) {
        if (this.playing == false) {
            clearInterval(this.reconnectIntervalId);
            clearInterval(this.connectIntervalId);  //수신대기 timer
            // [수정] '==' 오타라 늘 false 였음 → 영상 조각마다 타이머 정리를 다시 돌았다.
            this.playing = true;
        }

        if (this.renderer) {
            var packet = new Uint8Array(ev.data);

            var code = packet[0];
            if (code == 110) { // error
                // var err = packet[1];
                switch (packet[1]) { // error code
                    case 11:
                        this.serverError = "카메라 정보 없음.";
                        break;
                    case 12:
                        this.serverError = "영상 수신대기 초과.";
                        break;
                    case 13:
                        this.serverError = "영상 연결요청 실패.";
                        break;
                    case 14:
                        this.serverError = "Bridge 요청 오류.";
                        break;
                    case 15:
                        this.serverError = "요청처리 실패.";
                        break;
                    case 90:
                        this.serverError = "요청처리 실패.";
                        break;
                    default:
                        this.serverError = "연결종료.";
                        break;
                }
                // [수정] Log.log 는 없는 함수라 서버 오류가 오면 여기서 에러가 났다.
                XeusGate.Log("서버에러:" + this.serverError);
                // console.log("에러............." + packet[1] );
            } else if (code == 112) { // video
                this.renderer.feed(packet.subarray(1));
            }
        }
    };

    WsSource.prototype.moveto = function(time) {
        var cmd = "{" +
            "\"cmd\":\"playback\"," +
            "\"cctvMgrNo\":\"" + this.options.cctvMgrNo + "\"," +
            "\"mode\":\"GoTo\"," +
            "\"timestamp\":\"" + time + "\"" +
            "}";
        if (this.socket.readyState === this.socket.OPEN) {
            this.socket.send(cmd);
        }
    };

    WsSource.prototype.speed = function(spd) {
        var cmd = "{" +
            "\"cmd\":\"playback\"," +
            "\"cctvMgrNo\":\"" + this.options.cctvMgrNo + "\"," +
            "\"mode\":\"Speed\"," +
            "\"speed\":\"" + spd + "\"" +
            "}";
        if (this.socket.readyState === this.socket.OPEN) {
            this.socket.send(cmd);
        }
    };

    WsSource.prototype.pause = function() {
        var cmd = "{" +
            "\"cmd\":\"playback\"," +
            "\"cctvMgrNo\":\"" + this.options.cctvMgrNo + "\"," +
            "\"mode\":\"Pause\"" +
            "}";
        if (this.socket.readyState === this.socket.OPEN) {
            this.socket.send(cmd);
        }
    };

    WsSource.prototype.resume = function() {
        var cmd = "{" +
            "\"cmd\":\"playback\"," +
            "\"cctvMgrNo\":\"" + this.options.cctvMgrNo + "\"," +
            "\"mode\":\"Resume\"" +
            "}";
        if (this.socket.readyState === this.socket.OPEN) {
            this.socket.send(cmd);
        }
    };

    WsSource.prototype.forward = function() {
        var cmd = "{" +
            "\"cmd\":\"playback\"," +
            "\"cctvMgrNo\":\"" + this.options.cctvMgrNo + "\"," +
            "\"mode\":\"Forward\"" +
            "}";
        if (this.socket.readyState === this.socket.OPEN) {
            this.socket.send(cmd);
        }
    };

    WsSource.prototype.backward = function() {
        var cmd = "{" +
            "\"cmd\":\"playback\"," +
            "\"cctvMgrNo\":\"" + this.options.cctvMgrNo + "\"," +
            "\"mode\":\"Backward\"" +
            "}";
        if (this.socket.readyState === this.socket.OPEN) {
            this.socket.send(cmd);
        }
    };

    WsSource.prototype.close = function() { //!! 3
        clearInterval(this.reconnectIntervalId);
        clearInterval(this.connectIntervalId);

        var cmd = "{" +
            "\"cmd\":\"close\"," +
            "\"cctvMgrNo\":\"" + this.options.cctvMgrNo + "\"," +
            "\"size\":\"" + this.options.size + "\"," +
            "\"bitrate\":\"" + this.options.bitrate + "\"," +
            "\"framerate\":\"" + this.options.framerate + "\"," +
            "\"userId\":\"" + this.options.userId + "\", " +
            "\"evtType\":\"" + this.options.evtType + "\", " +
            "\"timestamp\":\"" + this.options.timestamp + "\", " +
            "\"speed\":\"" + this.options.speed + "\", " +
            "\"codec\":\"" + this.options.codec + "\", " +
            "\"src\":\"" + this.options.rtspUrl + "\" " +
            "}";
        if (this.socket.readyState === this.socket.OPEN) {
            this.socket.send(cmd);
        }

        this.playing == false;
        this.socket.close();
        XeusGate.Log("WsSource closed...");
    };

    WsSource.prototype.destroy = function() {
        // [수정] 닫은 뒤 늦게 오는 소켓 이벤트가 다시 연결·영상 붙이기를 하지 않게 끊는다.
        if (this.socket) {
            this.socket.onmessage = null;
            this.socket.onopen = null;
            this.socket.onerror = null;
            this.socket.onclose = null;
            this.socket = null;
        }
        this.player = null;
        this.renderer = null;
        XeusGate.Log("WsSource destroyed...");
    };

    return WsSource;
}();



// ///////////////////////////////////////////
// XeusGate.Renderer
// ///////////////////////////////////////////

XeusGate.Renderer.H264 = function() {
    "user strict";

    var H264Renderer = function(player, options) {
        this.CLEAN_INTERVAL = 10000; // 10초
        this.options = options || {};
        this.player = player;
        this.mediaSource = null;
        this.sourceBuffer = null;

        this.mediaSourceReady = false;
        this.initSegmentReady = false;
        this.codecSupported = true;
        this.initialized = false;
        this.codec = null;
        this.queue = null;
        // [수정] 영상 그릇 주소 — 닫을 때 버린다 (안 버리면 닫기·순환·재연결마다 그릇이 남는다).
        this.mediaSourceUrl = null;
        // [수정] 지난 영상 지우기 — CLEAN_INTERVAL 마다, 지금 보는 곳보다 KEEP_SECONDS 넘게 지난 것.
        this.KEEP_SECONDS = 30;
        this.lastClean = 0;
    };

    H264Renderer.prototype.appendByteArray = function(buffer1, buffer2) {
        var tmp = new Uint8Array((buffer1.byteLength | 0) + (buffer2.byteLength | 0));
        tmp.set(buffer1, 0);
        tmp.set(buffer2, buffer1.byteLength | 0);
        return tmp;
    };

    H264Renderer.prototype.start = function() {
        window.MediaSource = window.MediaSource || window.WebKitMediaSource;
        var isMSESupported = !!window.MediaSource;
        if (!isMSESupported) {
            XeusGate.Log('Oops! Browser does not support Media Source Extension.');
            this.player.destroy();
            return;
        }
        this.queue = new Uint8Array();
        this.mediaSource = new MediaSource();
        this.mediaSourceUrl = URL.createObjectURL(this.mediaSource);
        this.options.videoElement.setAttribute('src', this.mediaSourceUrl);
        this.lastClean = Date.now();

        this.mediaSource.addEventListener('sourceopen', this.onMSEOpen.bind(this));
        this.mediaSource.addEventListener('sourceclose', this.onMSEClose.bind(this));
        this.mediaSource.addEventListener('webkitsourceopen', this.onMSEOpen.bind(this));
        this.mediaSource.addEventListener('webkitsourceclose', this.onMSEClose.bind(this));
        XeusGate.Log("H264Renderer Started...");
    };

    H264Renderer.prototype.onMSEOpen = function() {
        this.mediaSourceReady = true;
    };

    H264Renderer.prototype.onMSEClose = function() {
        XeusGate.Log("H264Renderer onMSEClose...");
    };

    H264Renderer.prototype.feed = function(data) {
        if (data.byteLength == 0) {
            return;
        }
        // [수정] 닫힌 뒤(queue 없음)에 온 조각은 버린다.
        if (!this.queue) {
            return;
        }
        if (!this.codecSupported) {
            XeusGate.Log("Video codec not supported. " + this.codec);
            return;
        }
        var packet = new Uint8Array(data);
        if (!this.initSegmentReady) {
            this.options.videoElement.pause();
            var str = String.fromCharCode.apply(null, packet.subarray(0, 6));
            this.codec = 'video/mp4; codecs="avc1.' + str + '"';
            XeusGate.Log("H264Renderer codec: " + this.codec);

            if (!MediaSource.isTypeSupported(this.codec)) {
                this.codecSupported = false;
                XeusGate.Log("Video codec not supported. " + this.codec);
                return;
            }
            this.queue = this.appendByteArray(this.queue, packet.subarray(6));
            this.initSegmentReady = true;
        }

        if (this.initSegmentReady && this.mediaSourceReady) {
            if (!this.initialized) {
                var sb = this.mediaSource.addSourceBuffer(this.codec);
                this.sourceBuffer = sb;
                this.sourceBuffer.mode = 'sequence';
                this.initialized = true;
                XeusGate.Log("H264Renderer Initialized... ");
            } else {

                this.queue = this.appendByteArray(this.queue, packet);
            }
        }

        if (this.initialized) {
            if ((this.options.textElement.style.visibility == 'visible')) {
                this.player.visible(this.options.textElement, false);
                //if (this.options.videoElement.paused) {
                //    this.options.videoElement.play(); // play시작
                //    XeusGate.Log("H264Renderer playing....");
                //}
            }
            if (this.options.videoElement.paused) {
                this.options.videoElement.play(); // play시작
                XeusGate.Log("H264Renderer playing....");
            }
            this.update();
        }
    };

    H264Renderer.prototype.update = function() {
        if (!this.queue.length) {
            return;
        }

        try {
            // [수정] 지난 영상 지우기 — 지우는 동안엔 붙이지 못하니 이번 조각은 다음에 같이 붙인다.
            if (!this.sourceBuffer.updating && this.clean()) {
                return;
            }
            if (!this.sourceBuffer.updating) {
                this.sourceBuffer.appendBuffer(this.queue);
                this.queue = new Uint8Array();
            }
        } catch (e) {
            XeusGate.Log(e.name + " : sourceBuffer.appendBuffer error");
        }
    };

    // [수정] 받은 영상을 붙이기만 해서 그릇이 계속 커졌다. 지웠으면 true.
    H264Renderer.prototype.clean = function() {
        var now = Date.now();
        if (now - this.lastClean < this.CLEAN_INTERVAL) {
            return false;
        }
        this.lastClean = now;
        var buffered = this.sourceBuffer.buffered;
        if (!buffered.length) {
            return false;
        }
        var start = buffered.start(0);
        var end = this.options.videoElement.currentTime - this.KEEP_SECONDS;
        if (end <= start) {
            return false;
        }
        this.sourceBuffer.remove(start, end);
        XeusGate.Log("H264Renderer cleaned " + start.toFixed(1) + " ~ " + end.toFixed(1));
        return true;
    };

    H264Renderer.prototype.pause = function() {
        this.options.videoElement.pause();
    };

    H264Renderer.prototype.play = function() {
        this.options.videoElement.play();
    };

    H264Renderer.prototype.close = function() {
        if (this.mediaSource) {
            try {
                this.mediaSource.removeSourceBuffer(this.sourceBuffer);
                this.mediaSource.endOfStream();
            } catch (e) { }
            this.mediaSource = null;
        }
        // [수정] 그릇 주소를 버리고 영상 요소를 비워 영상 푸는 장치(디코더)를 바로 돌려준다.
        if (this.mediaSourceUrl) {
            URL.revokeObjectURL(this.mediaSourceUrl);
            this.mediaSourceUrl = null;
        }
        var video = this.options.videoElement;
        if (video) {
            video.pause();
            video.removeAttribute('src');
            video.load();
        }
        this.sourceBuffer = null;
        this.initialized = false;
        this.queue = null;
        this.mediaSourceReady = false;
        this.initSegmentReady = false;
        XeusGate.Log("H264Renderer closed...");
    };

    H264Renderer.prototype.destroy = function() {
        XeusGate.Log("H264Renderer destroyed...");
    };
    return H264Renderer;
}();


// ///////////////////////////////////////////////
// MJPEG
// ///////////////////////////////////////////////
XeusGate.Renderer.MJPEG = function() {
    "user strict";

    var DEFAULT_FPS = 20;
    var JPEG_MAGIG_NUMBER = [0xff, 0xd9];

    var MjpegRenderer = function(player, options) {
        this.options = options || {};
        this.imageElement = this.options.videoElement;
        this.player = player;
        this.isPlaying = false;
        this.isDrawing = false;
        this.jpegUrl = null;
        this.interval;
    };

    MjpegRenderer.prototype.start = function() {
        this.isPlaying = false;
        this.isDrawing = false;
        this.jpegUrl = null;
        this.queue = new XeusGate.Queue();
        this.play();
        XeusGate.Log("MjpegRenderer Started...");
    };

    MjpegRenderer.prototype.feed = function(data) {
        // console.log("feed called. create.... " + this.queue.getLength());
        if (document.visibilityState === 'hidden') {
            return;
        }

        if (!this.isPlaying) {
            return;
        }
        if (this.options.textElement.style.visibility == 'visible') {
            this.player.visible(this.options.textElement, false);
        }
        this.queue.enqueue(new Uint8Array(data));
    };

    MjpegRenderer.prototype.render = function(frame) {
        if (!frame) return;
        var len = frame.length;
        var _self = this;
        if (frame[len - 2] === JPEG_MAGIG_NUMBER[0] && frame[len - 1] === JPEG_MAGIG_NUMBER[1]) {
            _self.isDrawing = true;
            if (_self.jpegUrl) {
                URL.revokeObjectURL(_self.jpegUrl); // 메모리 해제.
            }
            _self.jpegUrl = URL.createObjectURL(new Blob([frame], {
                type: "image/jpeg"
            }));
            _self.imageElement.onload = function() {
                _self.isDrawing = false;
            };
            _self.imageElement.setAttribute('src', _self.jpegUrl);
        };
    };

    MjpegRenderer.prototype.pause = function() {
        if (this.interval) {
            clearInterval(this.interval);
        }
        this.isPlaying = false;
    };

    MjpegRenderer.prototype.play = function() {
        var _self = this;
        this.interval = setInterval(function() {
            var data = _self.queue.dequeue();
            //
            _self.render(data);
            //
        }, 1000 / _self.DEFAULT_FPS); // 24
        this.isPlaying = true;
    };

    MjpegRenderer.prototype.close = function() {
        this.isPlaying = false;
        this.isDrawing = false;
        this.jpegUrl = null;
        clearInterval(this.interval);
        XeusGate.Log("MjpegRenderer closed...");
    };

    MjpegRenderer.prototype.destroy = function() {
        XeusGate.Log("MjpegRenderer destroyed...");
    };

    return MjpegRenderer;
}();

export default XeusGate