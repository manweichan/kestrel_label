var database = firebase.database()

$(document).ready(function(){
  findBest();
});

function wait(ms){
   var start = new Date().getTime();
   var end = start;
   while(end < start + ms) {
     end = new Date().getTime();
  }
}

async function getResults() {
  let results = Array(111).fill(0);
  let nObj = 110;

  var snapshot = await database.ref().once('value');

  if(snapshot.exists()) {
    return snapshot.val();
  }
}

function findBest() {
  // this took us 3 hours
  nObj = 110
  results = []
  blah = getResults();
  blah.then(function(arr) {
    for (let i = 1; i < nObj+1; i++) {
      let score = 0;
      let j;
      for (j=1; j<nObj+1; j++) {
        let x = arr[i][j];
        if (x !== undefined) {
          score+=arr[i][j];  
        }
      }
      results[i] = score
    }

    inds = findIndicesOfMax(results,4)
    var ind1 = inds[1]
    var ind2 = inds[2]
    var ind3 = inds[3]

    var str1 = 'img/M'+ind1+'.jpg'
    var str2 = 'img/M'+ind2+'.jpg'
    var str3 = 'img/M'+ind3+'.jpg'

    $(".top_1 .top_container__image").attr('src',str1)
    $(".top_2 .top_container__image").attr('src',str2)
    $(".top_3 .top_container__image").attr('src',str3)

    $(".top_1 .top_container__title").text('M'+ind1)
    $(".top_2 .top_container__title").text('M'+ind2)
    $(".top_3 .top_container__title").text('M'+ind3)

  });
}

function findIndicesOfMax(inp, count) {
    var outp = [];
    for (var i = 0; i < inp.length; i++) {
        outp.push(i); // add index to output array
        if (outp.length > count) {
            outp.sort(function(a, b) { return inp[b] - inp[a]; }); // descending sort the output array
            outp.pop(); // remove the last index (index of smallest element in output array)
        }
    }
    return outp;
}
