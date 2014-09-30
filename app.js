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
      return this.config.autosound;
    },
    set autosound(val) {
      this.config.autosound = val;
      this.update();
    },
    get testtypeFunc() {
      switch (this.config.testtype.random()) {
        case "e2c":
          return genE2CQ;
        case "c2e":
          return genC2EQ;
        case "listen":
          return genListening;
      }
    },
    get testtype() {
      return this.config.testtype;
    },
    set testtype(type) {
      this.config.testtype = type;
      this.update();
    },
    update: function() {
      localStorage['SATVocabSetting'] = JSON.stringify(this.config);
    }
  }
  var stored = localStorage['SATVocabSetting'];
  if (stored) {
    stored = JSON.parse(stored);
  } else {
    stored = {};
  }
  stored = $.extend({
    autosound: true,
    testtype: ["e2c", "c2e", "listen"],
  }, stored);
  setting.config = stored;
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

var currentTest;

function testVocab(test, callback) {
  if (test.voice) {
    $("#pron").show();
  } else {
    $("#pron").hide();
  }
  currentTest = test;
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
    voice: vocab,
    question: vocab,
    answer: answer,
    choices: exp
  };
}

function genListening() {
  var vocab = vocabularies.random();
  var answer = lookup(vocab);
  var exp = [answer];
  while (exp.length != 5) {
    var e = explanations.random();
    if (exp.indexOf(e) == -1) {
      exp.push(e);
    }
  }
  pronounce(vocab);
  return {
    voice: vocab,
    question: "Listening Test",
    answer: answer,
    choices: exp
  };
}

function genC2EQ() {
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
    voice: null,
    question: vocab,
    answer: answer,
    choices: exp
  };
}

function showVocabTest() {
  testVocab(Setting.testtypeFunc(), function() {
    showVocabTest();
  });
}

$(document).on("pagebeforeshow", "#test", function(event) {
  showVocabTest();
});

$(document).on("pagebeforeshow", "#setting", function(event) {
  $("#autosound").prop('checked', Setting.autosound);
  $("#autosound").flipswitch('refresh');
  $("#testtype").val(Setting.testtype);
  $("#testtype").selectmenu('refresh');
});