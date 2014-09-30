var AudioService = {
  audio: $('<audio>')[0],
  play: function(src) {
    this.audio.src = src;
    this.audio.play();
  },
  pronounce: function(word) {
    AudioService.play('http://dict.youdao.com/dictvoice?audio=' + word);
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

var TestService = (function() {
  function getWord() {
    return vocabularies.random();
  }
  var service = {
    current: null,
    data: null,
    helper: {
      mcqClick: function(btn) {
        var ans = btn.textContent;
        if (!service.answer(ans)) {
          $(btn).addClass("ui-disabled");
        } else {
          $(".option").removeClass("ui-disabled");
          service.next();
        }
      },
      mcqSetup: function(data) {
        service.data = data;
        $("#test-vocab").text(data.title);
        if (data.hasVoice)
          $("#pron").show();
        else
          $("#pron").hide();
        for (var i = 0; i < 5; i++) {
          $(".option:nth-child(" + (i + 1) + ")").text(data.choices[i]);
        }
      },
      mcqHint: function() {
        var leftAnswers = $(".option").not(".ui-disabled");
        for (var i = 0; i < leftAnswers.length; i++) {
          if (leftAnswers[i].textContent == service.data.answer) {
            leftAnswers.splice(i, 1);
          }
        }
        if (leftAnswers.length != 0) {
          $(Array.prototype.random.call(leftAnswers)).addClass(
            "ui-disabled");
        }
      },
      mcqVoice: function() {
        AudioService.pronounce(service.data.word);
      },
      mcqAnswer: function(ans) {
        return ans == service.data.answer;
      },
      mcqWrapper: function(generator) {
        var wrapped = {
          next: function(word) {
            var data = generator(word);
            service.helper.mcqSetup(data);
          },
          answer: service.helper.mcqAnswer,
          voice: service.helper.mcqVoice,
          hint: service.helper.mcqHint
        };
        return wrapped;
      }
    },
    next: function() {
      service.current = service.pool[Setting.testtype.random()];
      service.current.next(getWord());
    },
    hint: function() {
      return service.current.hint();
    },
    answer: function(ans) {
      return service.current.answer(ans);
    },
    voice: function() {
      return service.current.voice();
    },
    pool: {}
  };

  return service;
})();

TestService.pool.e2c = TestService.helper.mcqWrapper(function(word) {
  var answer = lookup(word);
  var exp = [answer];
  while (exp.length != 5) {
    var e = explanations.random();
    if (exp.indexOf(e) == -1) {
      exp.push(e);
    }
  }
  var data = {
    word: word,
    title: word,
    choices: exp.shuffle(),
    hasVoice: true,
    answer: answer,
  };
  if (Setting.autosound) {
    AudioService.pronounce(word);
  }
  return data;
});

TestService.pool.c2e = TestService.helper.mcqWrapper(function(word) {
  var title = lookup(word);
  var exp = [word];
  while (exp.length != 5) {
    var e = vocabularies.random();
    if (exp.indexOf(e) == -1) {
      exp.push(e);
    }
  }
  var data = {
    word: word,
    title: title,
    choices: exp.shuffle(),
    hasVoice: false,
    answer: word,
  };
  return data;
});

TestService.pool.listen = $.extend(TestService.helper.mcqWrapper(function(word) {
  var answer = lookup(word);
  var exp = [answer];
  while (exp.length != 5) {
    var e = explanations.random();
    if (exp.indexOf(e) == -1) {
      exp.push(e);
    }
  }
  var data = {
    word: word,
    title: "Listening Test",
    choices: exp.shuffle(),
    hasVoice: true,
    answer: answer,
  };
  AudioService.pronounce(word);
  return data;
}), {
  hint: function() {
    if (TestService.data.title == "Listening Test") {
      $("#test-vocab").text(TestService.data.title = TestService.data.word);
    } else {
      TestService.helper.mcqHint();
    }
  }
});

Array.prototype.random = function() {
  var id = Math.floor(Math.random() * this.length);
  return this[id];
}

Array.prototype.shuffle = function() {
  for (var j, x, i = this.length; i; j = Math.floor(Math.random() * i), x =
    this[--i], this[i] = this[j], this[j] = x);
  return this;
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
    AudioService.pronounce(word.textContent);
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

$(document).on("pagebeforeshow", "#test", function(event) {
  TestService.next();
});

$(document).on("pagebeforeshow", "#setting", function(event) {
  $("#autosound").prop('checked', Setting.autosound);
  $("#autosound").flipswitch('refresh');
  $("#testtype").val(Setting.testtype);
  $("#testtype").selectmenu('refresh');
});