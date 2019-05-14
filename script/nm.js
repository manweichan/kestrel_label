var headerValues = {
  ".header": {
    "width": {
      start: 0,
      end: 150 
    },
    "font-size": {
      start: 48,
      end: 30
    }
  },
  ".hdr-intro-inner": {
    "padding-left": {
      start: 15,
      end: 5
    },
    "padding-right": {
      start: 15,
      end: 5
    }
  },
  ".hdr-subtitle": {
    "font-size": {
      start:35,
      end:17
    }
  },
  ".hdr-title": {
    "margin-top":{
      start: 5,
      end: 0
    }
  },
  ".hdr-img": {
    "width": {
      start: 300,
      end: 145
    }
  },
  ".hdr-intro-cont hr": {
    "height": {
      start: 3,
      end: 2
    }
  },
  ".hdr-link-btn": {
    "width": {
      start: 100,
      end: 85
    },
    "height": {
      start: 40,
      end: 30
    },
    "font-size": {
      start: 18,
      end:14
    }
  },
  ".scroll-btn": {
    "opacity": {
      start: 1,
      end: -5
    }
  }
};
var headerScale = 2.5;

$(document).ready(function(){
  initialize();
});

$('#scroll-down-btn').click(function() {
  let dest = $('.main').position().top;
  $('html,body').animate({scrollTop: dest}, {duration: 600});
});

$('.hdr-btn').click(function() {
  let which = $(this).children()[0].id;
  let dest = $('#'+which+'-bar').position().top + $('.main').position().top;
  $('html,body').animate({scrollTop: dest}, {duration: 600});
});

function initialize() {
  headerValues['.header']['width']['start'] = $(window).width()+3;
  headerTransition();
  $(window).scroll();
};

window.onresize = function(event) {
  initialize();
};

$('<img/>').attr('src', 'img/space_bg_md.jpeg').on('load', function() {
  $(this).remove();
  $('.hdr-bg-fg').addClass('hdr-bg-full-img');
  $('.hdr-bg-fg img').remove();
});


function headerTransition() {
  var $w = $(window);
  let winHeight = $w.height();
  $w.scroll(function() {
    let winTop = $w.scrollTop();
    let percent = 1 - (winTop/winHeight)*headerScale;
    if(percent<=0) {
      percent = 0;
    }
    else if (percent>=1) {
      percent = 1;
    }
    partialHeaderTransition(percent);
  });
};

function partialHeaderTransition(percent) {

  for (target in headerValues) {
    for (cssKey in headerValues[target]) {
      let start = headerValues[target][cssKey]['start'];
      let end   = headerValues[target][cssKey]['end'];
      let value = Math.min(start,end) + percent*Math.abs(start-end);
      
      if (cssKey == "opacity") {
        $(target).css(cssKey, value);
        if($(target).css('opacity') <=0) {
          $(target).css('display', 'none');
        }
        else {
          $(target).css('display', 'block');
        }
      }
      else {
        $(target).css(cssKey, value+'px');
      }
    }
  }
};