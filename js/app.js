function musicMaker() {
  this.BPM;
  this.TICKS;
  this.INTERVAL;
  this.tracks = [];
  this.sounds = [];
  this.STATE = "CREATED";
  this.audioCtx;
  this.grid;
  this.controls;
  this.soundSelector;
}

musicMaker.prototype.init = function (id, id1, id2) {
  var that = this;
  var req = new XMLHttpRequest();
  req.open('GET', "sound_data.json", true);
  req.responseType = 'json';
  req.onload = function() {
    that.BPM = req.response.default_BPM;
    that.TICKS = req.response.default_ticks;
    that.INTERVAL = that.getInterval();
    that.tracks = req.response.default_tracks;
    that.sounds = req.response.sounds;

    try {
      that.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) {
      alert('Sorry, Web Audio API is not supported by this browser.');
    }

    var fragment = document.createElement('div');
    fragment.setAttribute('id', '_sound-selector_');

    var close = document.createElement('span');
    close.innerHTML = "&#x2716;";
    close.addEventListener('click', function() {
      that.soundSelector.classList.remove("visible");
    }, false);
    fragment.appendChild(close);

    for(var i = 0; i < that.sounds.length; i++) {
      var group = document.createElement('p');
      group.innerHTML = that.sounds[i].group;
      
      var div = document.createElement('div');
      for(var j = 0; j < that.sounds[i].files.length; j++) {
        var el = document.createElement('p');
        el.innerHTML = that.sounds[i].files[j].name;
        el.setAttribute("group", that.sounds[i].group);
        el.setAttribute("name", that.sounds[i].files[j].name);
        el.setAttribute("url", that.sounds[i].files[j].url);
        el.className = "_sound_";
        div.appendChild(el);
      }

      fragment.appendChild(group);
      fragment.appendChild(div);
    }

    document.getElementById(id2).innerHTML = "";
    document.getElementById(id2).appendChild(fragment);
    that.soundSelector = document.getElementById('_sound-selector_');

    that.STATE = "INITIALIZED";

    that.render(id, id1);
  };
  req.send();
}

musicMaker.prototype.render = function (id, id1) {
  var that = this;

  this.grid = document.getElementById(id);
  this.grid.innerHTML = "";

  var gridWrapper = document.createElement('div');

  for (var i = 0; i < this.tracks.length; i++) {
    (function (i) {
      var req = new XMLHttpRequest();
      req.open('GET', that.tracks[i].url, true);
      req.responseType = 'arraybuffer';
      req.onload = function() {
        that.audioCtx.decodeAudioData(req.response, function(buffer) {
          that.tracks[i].buffer = buffer;
        });
      };
      req.send();
    })(i);

    var track = document.createElement('div');
    track.setAttribute('class', '_track_');

    var sound = document.createElement('span');
    sound.id = "track" + i;
    sound.innerHTML = this.tracks[i].group + " (" + this.tracks[i].name + ")";
    (function (i) {
      sound.addEventListener('click', function() {
        that.initSoundSelection(i);
      }, false);
    })(i);
    track.appendChild(sound);

    for (var t = 0; t < this.TICKS; ++t) {
      var btn = document.createElement('button');
      btn.className = 'beat';
      btn.addEventListener('click', function() {
        this.classList.toggle('on');
      }, false);
      if(t%4 == 0 && t != 0) {
        btn.style.marginLeft = "15px";
      }
      track.appendChild(btn);
    }
    track.style.width = 50*this.TICKS + (Math.ceil(this.TICKS/4) - 1)*10 + 250 + 50 + "px";

    var remove = document.createElement('i');
    remove.innerHTML = "&#x2716;";
    (function (i) {
      remove.addEventListener('click', function() {
      that.removeTrack(i);
    }, false);
    })(i);
    track.appendChild(remove);

    gridWrapper.appendChild(track);
  }

  this.grid.appendChild(gridWrapper);

  this.controls = document.getElementById(id1);
  this.controls.innerHTML = "";

  var controls = document.createElement('div');
  controls.setAttribute('id', '_controls_');

  var controlsInnerWrapper = document.createElement('div');

  var bpm = document.createElement('input');
  bpm.setAttribute('type', 'text');
  bpm.setAttribute('value', 'BPM');
  bpm.addEventListener('click', function () {
    this.value = that.BPM;
  });
  bpm.addEventListener('blur', function () {
    that.updateBPM(this.value);
    this.value = "BPM";
  });
  controlsInnerWrapper.appendChild(bpm);

  var addTrack = document.createElement('span');
  addTrack.innerHTML = "ADD TRACK";
  addTrack.addEventListener('click', function () {
    that.initSoundSelection(-1);
  });
  controlsInnerWrapper.appendChild(addTrack);

  var play = document.createElement('span');
  play.innerHTML = "PLAY";
  play.setAttribute('id', '_play_');
  play.addEventListener('click', function () {
    if(this.innerHTML == "PLAY") {
      that.play();
    } else {
      that.pause();
    }
  });
  controlsInnerWrapper.appendChild(play);

  var stop = document.createElement('span');
  stop.innerHTML = "STOP";
  stop.addEventListener('click', function () {
    that.stop();
  });
  controlsInnerWrapper.appendChild(stop);

  var ticks = document.createElement('input');
  ticks.setAttribute('type', 'text');
  ticks.setAttribute('value', 'TICKS');
  ticks.addEventListener('click', function () {
    this.value = that.TICKS;
  });
  ticks.addEventListener('blur', function () {
    that.updateTicks(this.value);
    this.value = "TICKS";
  });
  controlsInnerWrapper.appendChild(ticks);
  
  controls.appendChild(controlsInnerWrapper);

  this.controls.appendChild(controls);

  this.grid.style.marginBottom = this.controls.offsetHeight + 60 + "px";
  
  this.STATE = "RENDERED";
}

musicMaker.prototype.play = function () {
  if(this.STATE != "PLAYING") {
    var that = this;
    var intervalId = setInterval(function () {
      requestAnimationFrame(function () {
        if(that.STATE == "RENDERED" || that.STATE == "STOPPED") {
          that.STATE = "PLAYING";
          that.drumLoop(0, that.TICKS - 1, new Date().getTime());
          clearInterval(intervalId);
          document.getElementById('_play_').innerHTML = "PAUSE";
        } else if(that.STATE == "PAUSED") {
          that.STATE = "PLAYING";
          clearInterval(intervalId);
          document.getElementById('_play_').innerHTML = "PAUSE";
        }
      });
    }, 250);
  }
}

musicMaker.prototype.pause = function () {
  if(this.STATE == "PLAYING") {
    this.STATE = "PAUSED";
    document.getElementById('_play_').innerHTML = "PLAY";
  }
}

musicMaker.prototype.stop = function () {
  if(this.STATE == "PLAYING" || this.STATE == "PAUSED") {
    this.STATE = "STOPPED";
    document.getElementById('_play_').innerHTML = "PLAY";
    var beats = document.getElementsByClassName('beat');
    for (var i = 0; i < beats.length; i++) {
      beats[i].classList.remove("ticked");
    }
  }
}

musicMaker.prototype.refresh = function () {
  this.stop();
  this.render(this.grid.id, this.controls.id);
  this.play();
}

musicMaker.prototype.drumLoop = function (curTick, lastTick, lastTime) {
  var that = this;

  if(this.STATE == "PLAYING") {
    var curTime = new Date().getTime();
    var beats = document.getElementsByClassName('beat');
    
    if (curTime - lastTime >= this.INTERVAL) {
      for (var i = 0; i < this.tracks.length; i++) {
        var lastBeat = beats[i*this.TICKS + lastTick];
        var curBeat  = beats[i*this.TICKS + curTick];

        lastBeat.classList.remove('ticked');
        curBeat.classList.add('ticked');

        if (curBeat.classList.contains('on')) {
          var source = this.audioCtx.createBufferSource();
          source.buffer = this.tracks[i].buffer;
          source.connect(this.audioCtx.destination);
          source.start();
        }
      };

      lastTick = curTick;
      curTick = (curTick+1) % this.TICKS;
      lastTime = curTime;
    }
  }

  if(this.STATE == "PLAYING" || this.STATE == "PAUSED") {
    requestAnimationFrame(function() {
      that.drumLoop(curTick, lastTick, lastTime);
    });
  }
}

musicMaker.prototype.getInterval = function () {
  return 1 / (4 * this.BPM / (60 * 1000));
}

musicMaker.prototype.updateBPM = function (bpm) {
  if(bpm <= 50) {
    bpm = 50;
  } else if(bpm >= 500) {
    bpm = 500;
  }
  this.BPM = bpm;
  this.INTERVAL = this.getInterval();
}

musicMaker.prototype.updateTicks = function (ticks) {
  if(ticks <= 4) {
    ticks = 4;
  } else if(ticks >= 104) {
    ticks = 104;
  }
  this.TICKS = ticks;
  this.refresh();
}

musicMaker.prototype.initSoundSelection = function (track) {
  var that = this;
  var sounds = document.getElementsByClassName("_sound_");
  for (var i = 0; i < sounds.length; i++) {
    if(track == -1) {
      sounds[i].onclick = function () {
        that.addTrack(this.getAttribute("group"), this.getAttribute("name"), this.getAttribute("url"));
        that.soundSelector.classList.remove("visible");
      }
    } else {
      sounds[i].onclick = function () {
        that.updateTrack(track, this.getAttribute("group"), this.getAttribute("name"), this.getAttribute("url"));
        that.soundSelector.classList.remove("visible");
      }
    }
  }
  this.soundSelector.classList.add("visible");
}

musicMaker.prototype.addTrack = function (group, name, url) {
  var newTrack = {
    "group": group,
    "name": name,
    "url": url
  }
  this.tracks.push(newTrack);
  this.refresh();
}

musicMaker.prototype.removeTrack = function (track) {
  this.tracks.splice(track, 1);
  this.refresh();
}

musicMaker.prototype.updateTrack = function (track, group, name, url) {
  var newTrack = {
    "group": group,
    "name": name,
    "url": url
  }
  this.tracks.splice(track, 1, newTrack);
  this.refresh();
}

var musicMakerInstance = new musicMaker();
musicMakerInstance.init("grid", "controls", "sound-selector");
musicMakerInstance.play();