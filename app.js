Array.prototype.random = function() {
  var id = Math.floor(Math.random() * this.length);
  return this[id];
}

Array.prototype.shuffle = function() {
  for (var j, x, i = this.length; i; j = Math.floor(Math.random() * i), x =
    this[--i], this[i] = this[j], this[j] = x);
  return this;
}

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
    get autoreview() {
      return this.config.autoreview;
    },
    set autoreview(val) {
      this.config.autoreview = val;
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
    autoreview: true,
    testtype: ["e2c", "c2e", "listen"],
  }, stored);
  setting.config = stored;
  return setting;
})();

var WordData = (function() {
  var data = {
    get: function(word) {
      if (!this.data[word]) {
        this.data[word] = {
          w: false
        };
      }
      return this.data[word];
    },
    update: function() {
      localStorage['SATVocabData'] = JSON.stringify(this.data);
    },
    clear: function() {
      this.data = [];
      this.update();
    },
    whitelist: function(word) {
      var data = this.get(vocabId["-" + word]);
      data.w = true;
      this.update();
    },
    reset: function(word) {
      var data = this.get(vocabId["-" + word]);
      data.w = false;
      this.update();
    }
  }
  var stored = localStorage['SATVocabData'];
  if (stored) {
    stored = JSON.parse(stored);
  } else {
    stored = [];
  }
  data.data = stored;
  return data;
})();

var WordQueue;

function refreshWordQueue() {
  WordQueue = [];
  for (var i = 0; i < vocabularies.length; i++) {
    var data = WordData.get(i);
    if (!data.w) {
      WordQueue.push(i);
    }
  }
  WordQueue.shuffle();
}

refreshWordQueue();

var TestService = (function() {
  function getWord() {
    if (WordQueue.length == 0) {
      refreshWordQueue();
      if (WordQueue.length == 0) {
        alert("You have finished every single word.");
        return vocabularies[0];
      }
    }
    return vocabularies[WordQueue.pop()];
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
          service.end();
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
      mcqEnd: function(callback) {
        var disabled = $(".option.ui-disabled");
        if (disabled.length != 0) {
          $(".option").removeClass("ui-disabled");
          if (Setting.autoreview) {
            Flashcard.view(service.data.word, function() {
              Flashcard.hide();
              //callback();
            });
          } else {
            callback();
          }
        } else {
          callback();
        }
      },
      mcqWrapper: function(generator) {
        var wrapped = {
          next: function(word) {
            var data = generator(word);
            service.helper.mcqSetup(data);
          },
          answer: service.helper.mcqAnswer,
          voice: service.helper.mcqVoice,
          hint: service.helper.mcqHint,
          end: service.helper.mcqEnd,
        };
        return wrapped;
      }
    },
    whitelist: function() {
      WordData.whitelist(this.data.word);
      this.next();
    },
    end: function() {
      var c = service.current;
      service.current = null;
      c.end(service.next.bind(service));
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

var Flashcard = {
  view: function(word, callback) {
    $("#flashcard-title").text(word);
    $("#flashcard-cont").text(lookup(word));
    this.onnext = callback;
    $.mobile.changePage('#flashcard', {
      role: 'dialog'
    });
    if (Setting.autosound) {
      AudioService.pronounce(word);
    }
  },
  whitelist: function() {
    WordData.whitelist($("#flashcard-title").text());
    $("#flashcard-btn").click();
  },
  study: function(word) {
    var i = WordQueue.shift();
    WordQueue.push(i);
    this.view(vocabularies[i], Flashcard.study.bind(Flashcard));
  },
  hide: function() {
    $('#flashcard').dialog('close');
  }
};

var PopupService = (function() {
  var service = {
    popup: function(title, cont, options, val, callback) {
      $("#popup-title").html(title);
      $("#popup-cont").html(cont);
      var result;
      if (callback) {
        $("#popup").one('pagebeforehide', function() {
          callback(result);
        });
      }
      $("#popup").one('pagehide', function() {
        $("#popup-btns").controlgroup('destroy');
      });
      $("#popup-btns").html("");
      options.forEach(function(a, b) {
        var btn = $('<a data-role="button">' + a + '</a>');
        btn.one('click', function() {
          result = val[b];
          $("#popup").dialog('close');
        });
        $("#popup-btns").append(btn);
        btn.buttonMarkup();
      });
      $("#popup-btns").controlgroup();
      $.mobile.changePage('#popup', {
        role: 'dialog'
      });
    },
    prompt: function(title, cont, def, callback) {
      $("#prompt-title").html(title);
      $("#prompt-cont").html(cont);
      $("#prompt-input").val(def);
      this.result = undefined;
      $("#prompt").one('pagehide', function() {
        if (callback) callback(service.result);
      });
      $.mobile.changePage('#prompt', {
        role: 'dialog'
      });
    },
    alert: function(title, cont, callback) {
      this.popup(title, cont, ["Done"], [true], callback);
    },
    confirm: function(title, cont, callback) {
      this.popup(title, cont, ["Yes", "No"], [true, false], callback);
    }
  };
  return service;
})();

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

function resetWord(word) {
  event.preventDefault();
  PopupService.confirm('Confirmation', 'Do you want to remove the word <b>' +
    word.textContent + '</b> from whitelist?', function(res) {
      if (res) {
        WordData.reset(word.textContent);
        $("#whitelist").html("");
        $("#whitelistPage").trigger('pagebeforeshow');
      }
    });
}

$(document).on("pagebeforecreate", "#allvocab", function(event) {
  var allvocablist = $("#allvocablist");
  vocabularies.forEach(function(a, b) {
    allvocablist.append(
      '<li data-icon="false"><a onclick="toggleDisplay(this);">' + a +
      "</a></li>");
  })
});

$(document).on("pagebeforeshow", "#test", function(event) {
  TestService.next();
});

$(document).on("pagehide", "#test", function(event) {
  if (TestService.current)
    TestService.current.end(Function.prototype);
});

$(document).on("pagebeforeshow", "#setting", function(event) {
  $("#autosound").prop('checked', Setting.autosound);
  $("#autosound").flipswitch('refresh');
  $("#autoreview").prop('checked', Setting.autoreview);
  $("#autoreview").flipswitch('refresh')
  $("#testtype").val(Setting.testtype);
  $("#testtype").selectmenu('refresh');
});

$(document).on("pagebeforeshow", "#whitelistPage", function(event) {
  var whitelist = $("#whitelist");
  var swipe = function(event) {
    resetWord(event.target);
  };
  vocabularies.forEach(function(a, b) {
    if (WordData.get(b).w) {
      var w = $(
        '<li data-icon="false"><a onclick="toggleDisplay(this);">' + a +
        "</a></li>");
      w.on('swipe', swipe).on('contextmenu', swipe);
      whitelist.append(w);
    }
  });
  whitelist.listview('refresh');
});

$(document).on("pagehide", "#whitelistPage", function(event) {
  var whitelist = $("#whitelist");
  whitelist.html("");
});

$(document).on('click', '#setting-delete', function(event) {
  PopupService.confirm('Confirmation',
    'Do you really want to erase all data from the device? This process is not reversible.',
    function(res) {
      if (!res) return;
      PopupService.prompt('Confirmation',
        'If you want to delete all data, please type <b>delete</b>.', '',
        function(ans) {
          if (ans == 'delete') {
            PopupService.alert('Information', 'All data are erased.');
            WordData.clear();
          } else if (ans != null) {
            PopupService.alert('Information', 'Deletion is cancelled.');
          }
        });
    });
});

$(document).on("pagebeforeshow", "#main", function(event) {
  $("#progress").text(WordQueue.length + "/" + vocabularies.length);
});