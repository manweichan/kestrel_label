var currentObjects = [0,0]
var database = firebase.database()


$(document).ready(function(){
  chooseObjects();
});

// pick new messier objects to display
function chooseObjects() {
  nObj = 110;
  ind1 = getRandomInt(1, nObj);
  ind2 = getRandomInt(1, nObj);

  // Keep drawing random numbers until the two objects are different
  while(ind1 == ind2) {
    ind2 = getRandomInt(1, nObj);
  }

  currentObjects[0] = ind1
  currentObjects[1] = ind2
  
  str1 = 'img/M'+ind1+'.jpg'
  str2 = 'img/M'+ind2+'.jpg'

  $(".obj_1 .messier_image").attr('src',str1)
  $(".obj_2 .messier_image").attr('src',str2)

  $(".obj_1 .messier_label").text('M'+ind1)
  $(".obj_2 .messier_label").text('M'+ind2)
}

$(".obj_1").click(function() {
  logClick(currentObjects[0], currentObjects[1]);
  chooseObjects()
})

$(".obj_2").click(function() {
logClick(currentObjects[1], currentObjects[0]);
chooseObjects()
})

// Arrow Keys and A/D control clicking
window.onkeydown = function(event) {
  if ((event.keyCode == 65) ||(event.keyCode == 37)) {
    logClick(currentObjects[0], currentObjects[1]);
    chooseObjects()
  }
  if ((event.keyCode == 68) ||(event.keyCode == 39)) {
    logClick(currentObjects[1], currentObjects[0]);
    chooseObjects()
  }
}

// Record this vote in the database
function logClick(winner, loser) {
  var currentScore;
  var newScore;

  database.ref(''+winner).once('value', function(snapshot) {
    // Create new database entry for this matchup if needed
    if (snapshot.val() === null) {
      database.ref(''+winner).set({init: 0});
      newScore=1;
    }
    // Read current score for this matchup
    else {
      currentScore = snapshot.val()[loser];
      if (currentScore === undefined) {
        currentScore = 0;
      }

      newScore = currentScore+1;
    }
    // Publish the new score to the database
    database.ref(''+winner+'/'+loser).set(newScore)
  });
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
