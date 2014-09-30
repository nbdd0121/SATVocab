var AudioPlayer = {
  audio: $('<audio>')[0],
  play: function(src) {
    this.audio.src = src;
    this.audio.play();
  }
};

var Setting = (function() {
  var setting = {
    get autosound() {
      return this._autosound;
    },
    set autosound(val) {
      this._autosound = val;
      this.update();
    },
    update: function() {
      localStorage['SATVocabSetting'] = JSON.stringify({
        autosound: this._autosound
      })
    }
  }
  var stored = localStorage['SATVocabSetting'];
  if (stored) {
    stored = JSON.parse(stored);
    setting._autosound = stored.autosound;
  } else {
    setting._autosound = true;
  }
  return setting;
})();



function pronounce(word) {
  AudioPlayer.play('http://dict.youdao.com/dictvoice?audio=' + word);
}

Array.prototype.random = function() {
  var id = Math.floor(Math.random() * this.length);
  return this[id];
}

Array.prototype.shuffle = function() {
  for (var j, x, i = this.length; i; j = Math.floor(Math.random() * i), x =
    this[--i], this[i] = this[j], this[j] = x);
}

function lookup(word) {
  return explanations[vocabId["-" + word]];
}

function lookupInv(exp) {
  for (var i = 0; i < explanations.length; i++) {
    if (explanations[i] == exp) {
      return vocabularies[i];
    }
  }
}

function toggleDisplay(word) {
  if (word.timeout != null) {
    clearTimeout(word.timeout);
  }
  if (word.translated) {
    word.textContent = lookupInv(word.textContent);
    word.translated = false;
  } else {
    word.timeout = setTimeout(function() {
      word.timeout = null;
      if (word.translated) {
        toggleDisplay(word);
      }
    }, 5000);
    pronounce(word.textContent);
    word.textContent = lookup(word.textContent);
    word.translated = true;
  }
}

$(document).on("pagebeforecreate", "#allvocab", function(event) {
  var allvocablist = $("#allvocablist");
  vocabularies.forEach(function(a) {
    allvocablist.append(
      '<li data-icon="false"><a onclick="toggleDisplay(this);">' + a +
      "</a></li>");
  })
});

function testVocab(test, callback) {
  $("#test-vocab").text(test.question);
  test.choices.shuffle();
  for (var i = 0; i < 5; i++) {
    var sel = $(".option:nth-child(" + (i + 1) + ")");
    sel.text(test.choices[i]);
    sel.removeClass('ui-disabled');
  }
  var handler = function(event) {
    var ans = event.target.textContent;
    if (test.answer == ans) {
      $(".option").unbind('click', handler);
      callback();
    } else {
      $(event.target).addClass('ui-disabled');
    }
  };
  $(".option").click(handler);
}

function genE2CQ() {
  $("#pron").show();
  var vocab = vocabularies.random();
  var answer = lookup(vocab);
  var exp = [answer];
  while (exp.length != 5) {
    var e = explanations.random();
    if (exp.indexOf(e) == -1) {
      exp.push(e);
    }
  }
  if (Setting.autosound) {
    pronounce(vocab);
  }
  return {
    question: vocab,
    answer: answer,
    choices: exp
  };
}

function genC2EQ() {
  $("#pron").hide();
  var answer = vocabularies.random();
  var vocab = lookup(answer);
  var exp = [answer];
  while (exp.length != 5) {
    var e = vocabularies.random();
    if (exp.indexOf(e) == -1) {
      exp.push(e);
    }
  }
  return {
    question: vocab,
    answer: answer,
    choices: exp
  };
}

function showVocabTest() {
  testVocab(genE2CQ(), function() {
    showVocabTest();
  });
}

$(document).on("pagebeforeshow", "#test", function(event) {
  showVocabTest();
});

$(document).on("pagebeforeshow", "#setting", function(event) {
  $("#autosound").prop('checked', Setting.autosound);
  $("#autosound").flipswitch('refresh');
});