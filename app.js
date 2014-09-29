var allvocab = [];
for (var a in vocab) {
  allvocab.push(a.substr(1));
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
  return vocab["-" + word];
}

function lookupInv(exp) {
  for (var a in vocab) {
    if (vocab[a] == exp) {
      return a.substr(1);
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
    word.textContent = lookup(word.textContent);
    word.translated = true;
  }
}

$(document).on("pagebeforecreate", "#allvocab", function(event) {
  var allvocablist = $("#allvocablist");
  allvocab.forEach(function(a) {
    allvocablist.append(
      '<li data-icon="false"><a onclick="toggleDisplay(this);">' + a +
      "</a></li>");
  })
});

function showVocabTest() {
  var vocab = allvocab.random();
  var answer = lookup(vocab);
  var exp = [answer];
  while (exp.length != 5) {
    var e = lookup(allvocab.random());
    if (exp.indexOf(e) == -1) {
      exp.push(e);
    }
  }
  exp.shuffle();
  $("#test-vocab").text(vocab);
  for (var i = 0; i < 5; i++) {
    var sel = $(".option:nth-child(" + (i + 1) + ")");
    sel.text(exp[i]);
    sel.removeClass('ui-disabled');
  }
  var handler = function(event) {
    var ans = event.target.textContent;
    if (answer == ans) {
      $(".option").unbind('click', handler);
      event.target.blur();
      showVocabTest();
    } else {
      $(event.target).addClass('ui-disabled');
    }
  };
  $(".option").click(handler);
}

$(document).on("pagebeforeshow", "#test", function(event) {
  showVocabTest();
});