// labeler.js
// Handles loading CSV, displaying data, and labeling

function parseCSV(text) {
     const lines = text.trim().split('\n');
     return lines.slice(1).map(line => {
         // split on commas outside quotes
           const parts = [], re = /(".*?"|[^",\s]+)(?=\s*,|\s*$)/g;
         line.match(re).forEach(s => parts.push(s.replace(/^"|"$/g, '')));
    
           const [day, station, satellite] = parts;
         // helper to JSON‑parse one of the 3 array columns in order
           function getArray(startIdx) {
               let str = parts[startIdx];
               // if it doesn’t end in ']', keep appending next parts
                 let idx = startIdx;
               while (!str.trim().endsWith(']') && ++idx < parts.length) {
                   str += ',' + parts[idx];
                 }
                str = str.replace(/\bnan\b/gi, 'null');
               return JSON.parse(str);
             }
      
           const data = getArray(3);
         const lat = getArray(4);
         const lon = getArray(5);
    
          return { day, station, satellite, data, lat, lon };
      });
  }

    


// Load CSV file
async function loadCSV(url) {
  const resp = await fetch(url);
  const text = await resp.text();
  return parseCSV(text);
}

// // Plot data using Canvas
function plotData(data) {
  const canvas = document.getElementById('dataPlot');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const w = canvas.width;
  const h = canvas.height;

  // Find min/max for scaling
  const min = Math.min(...data);
  const max = Math.max(...data);

  // Draw data line
  ctx.beginPath();
  data.forEach((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min + 1e-6)) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#0074D9';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Title annotation for launch lines
  ctx.fillStyle = '#000';
  ctx.font = '16px sans-serif';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  ctx.fillText('Red line = 07:03 (launch); Blue line = 07:13 (launch +10 min)', w / 2, 5);

  // Time reference labels
  ctx.fillStyle = '#000';
  ctx.font = '14px sans-serif';
  ctx.textBaseline = 'bottom';

  // Start and end times
  const startTime = '06:00:00';
  const endTime = '08:02:30';

  // Bottom-left label
  ctx.textAlign = 'left';
  ctx.fillText(startTime, 5, h - 5);

  // Bottom-right label
  ctx.textAlign = 'right';
  ctx.fillText(endTime, w - 5, h - 5);

  // Vertical lines for launch events
  const launchIdx = 126;
  const launch10Idx = 146;
  const xLaunch = (launchIdx / (data.length - 1)) * w;
  const xLaunch10 = (launch10Idx / (data.length - 1)) * w;

  // Launch line (red)
  ctx.beginPath();
  ctx.moveTo(xLaunch, 0);
  ctx.lineTo(xLaunch, h);
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Launch +10min line (blue)
  ctx.beginPath();
  ctx.moveTo(xLaunch10, 0);
  ctx.lineTo(xLaunch10, h);
  ctx.strokeStyle = 'blue';
  ctx.lineWidth = 1;
  ctx.stroke();
}

let map;  // Leaflet map instance

function initMap() {
  map = L.map('mapPlot', {
    // center & zoom so you see the whole box initially:
    center: [(10 + 35) / 2, (-90 + -60) / 2],
    zoom: 4,

    // lock the viewport so it can’t pan/zoom outside:
    maxBounds: [[10, -90], [35, -60]],
    maxBoundsViscosity: 1.0,

    // optional: turn off zoom control if you like
    // zoomControl: false
  });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
}

// Plot lat/lon points with custom colors (green default)
function plotMap(latArr, lonArr) {
  if (!map) initMap();
  // remove previous circleMarkers
  map.eachLayer(layer => { if (layer instanceof L.CircleMarker) map.removeLayer(layer); });

  const launchIdx = 126, launch10Idx = 146;

  // First plot all green points (excluding launch and +10)
  latArr.forEach((lat, i) => {
    if (i === launchIdx || i === launch10Idx) return;
    const lon = lonArr[i];
    if (isNaN(lat) || isNaN(lon)) return;
    L.circleMarker([lat, lon], { radius: 4, color: 'green', fillOpacity: 0.7 }).addTo(map);
  });

  // Then plot launch (red)
  let lat0 = latArr[launchIdx], lon0 = lonArr[launchIdx];
  if (!isNaN(lat0) && !isNaN(lon0)) {
    L.circleMarker([lat0, lon0], { radius: 6, color: 'red', fillOpacity: 1.0 }).addTo(map);
  }

  // Then plot +10min (blue)
  let lat1 = latArr[launch10Idx], lon1 = lonArr[launch10Idx];
  if (!isNaN(lat1) && !isNaN(lon1)) {
    L.circleMarker([lat1, lon1], { radius: 6, color: 'blue', fillOpacity: 1.0 }).addTo(map);
  }
}


// // Show current entry info
// function showEntry(entry) {
//   document.getElementById('entryInfo').textContent = `Day: ${entry.day} | Station: ${entry.station} | Satellite: ${entry.satellite}`;
//   plotData(entry.data);
// }

// Display a selected entry
function showEntry(entry) {
  document.getElementById('entryInfo').textContent =
    `Day: ${entry.day} | Station: ${entry.station} | Satellite: ${entry.satellite}`;
  plotData(entry.data);
  plotMap(entry.lat, entry.lon);
}

// Save label to Firebase
function saveLabel(entry, label) {
  if (!userId) return;
  const labelObj = {
    userId,
    day: entry.day,
    station: entry.station,
    satellite: entry.satellite,
    label,
    timestamp: Date.now()
  };
  firebase.database().ref('glenn_data').push(labelObj);
}

// Track which entries the current user has labeled in this session
let labeledKeys = new Set();
let entries = [];
let currentIdx = null;
let userId = null;
let isDragging = false;
let startX = 0;
let currentX = 0;
let plotElement = null;

function showRandomEntry() {
  // Find entries not labeled in this session
  const unlabeled = entries.filter((e, i) => !labeledKeys.has(entryKey(e)));
  if (unlabeled.length === 0) {
    // Reset for recycling
    labeledKeys.clear();
    alert('All entries labeled once. Recycling for continued labeling.');
    showRandomEntry();
    return;
  }
  const idx = Math.floor(Math.random() * unlabeled.length);
  currentIdx = entries.indexOf(unlabeled[idx]);
  showEntry(entries[currentIdx]);
}

// Helper to create a unique key for each entry
function entryKey(entry) {
  return `${entry.day}|${entry.station}|${entry.satellite}`;
}

function handleLabel(label) {
  if (currentIdx === null) return;
  saveLabel(entries[currentIdx], label);
  labeledKeys.add(entryKey(entries[currentIdx]));
  showRandomEntry();
}

// Keyboard event
window.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft') handleLabel('bad');
  if (e.key === 'ArrowRight') handleLabel('good');
});

// Mobile touch/swipe functionality
function setupMobileTouch() {
  plotElement = document.getElementById('dataPlot');
  if (!plotElement) return;

  // Detect mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
  const mobileHint = document.getElementById('mobileHint');
  const desktopHint = document.getElementById('desktopHint');
  
  if (isMobile) {
    if (mobileHint) mobileHint.style.display = 'inline';
    if (desktopHint) desktopHint.style.display = 'none';
  }

  // Safari-specific CSS fixes
  if (isSafari) {
    plotElement.style.webkitTouchCallout = 'none';
    plotElement.style.webkitUserSelect = 'none';
    plotElement.style.khtmlUserSelect = 'none';
    plotElement.style.mozUserSelect = 'none';
    plotElement.style.msUserSelect = 'none';
    plotElement.style.userSelect = 'none';
  }

  // Prevent default touch behaviors that interfere with swiping
  plotElement.addEventListener('touchstart', function(e) {
    console.log('Touch start detected');
    e.preventDefault();
    e.stopPropagation();
    isDragging = true;
    startX = e.touches[0].clientX;
    currentX = startX;
    plotElement.style.transition = 'none';
    plotElement.style.userSelect = 'none';
    plotElement.style.webkitUserSelect = 'none';
    return false; // Prevent default for Safari
  }, { passive: false, capture: true });

  plotElement.addEventListener('touchmove', function(e) {
    console.log('Touch move detected');
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) return;
    
    currentX = e.touches[0].clientX;
    const deltaX = currentX - startX;
    const maxDelta = 150; // Increased maximum drag distance
    
    // Limit the drag distance
    const limitedDelta = Math.max(-maxDelta, Math.min(maxDelta, deltaX));
    
    // Move the plot with the finger
    plotElement.style.transform = `translateX(${limitedDelta}px)`;
    
    // Change background color based on direction
    if (limitedDelta > 30) {
      plotElement.style.backgroundColor = 'rgba(0, 255, 0, 0.2)'; // Green for good
    } else if (limitedDelta < -30) {
      plotElement.style.backgroundColor = 'rgba(255, 0, 0, 0.2)'; // Red for bad
    } else {
      plotElement.style.backgroundColor = 'transparent';
    }
    return false; // Prevent default for Safari
  }, { passive: false, capture: true });

  plotElement.addEventListener('touchend', function(e) {
    console.log('Touch end detected');
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) return;
    
    isDragging = false;
    const deltaX = currentX - startX;
    const threshold = 80; // Increased threshold for mobile
    
    // Reset plot position with animation
    plotElement.style.transition = 'transform 0.3s ease, background-color 0.3s ease';
    plotElement.style.transform = 'translateX(0px)';
    plotElement.style.backgroundColor = 'transparent';
    plotElement.style.userSelect = '';
    plotElement.style.webkitUserSelect = '';
    
    // Trigger labeling if swipe distance is sufficient
    if (deltaX > threshold) {
      console.log('Swipe right - labeling as good');
      handleLabel('good');
    } else if (deltaX < -threshold) {
      console.log('Swipe left - labeling as bad');
      handleLabel('bad');
    }
    return false; // Prevent default for Safari
  }, { passive: false, capture: true });

  // Mouse events for desktop testing (keep existing)
  plotElement.addEventListener('mousedown', function(e) {
    isDragging = true;
    startX = e.clientX;
    currentX = startX;
    plotElement.style.transition = 'none';
  });

  plotElement.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    
    currentX = e.clientX;
    const deltaX = currentX - startX;
    const maxDelta = 100;
    
    const limitedDelta = Math.max(-maxDelta, Math.min(maxDelta, deltaX));
    plotElement.style.transform = `translateX(${limitedDelta}px)`;
    
    if (limitedDelta > 20) {
      plotElement.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
    } else if (limitedDelta < -20) {
      plotElement.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
    } else {
      plotElement.style.backgroundColor = 'transparent';
    }
  });

  plotElement.addEventListener('mouseup', function(e) {
    if (!isDragging) return;
    
    isDragging = false;
    const deltaX = currentX - startX;
    const threshold = 50;
    
    plotElement.style.transition = 'transform 0.3s ease, background-color 0.3s ease';
    plotElement.style.transform = 'translateX(0px)';
    plotElement.style.backgroundColor = 'transparent';
    
    if (deltaX > threshold) {
      handleLabel('good');
    } else if (deltaX < -threshold) {
      handleLabel('bad');
    }
  });

  // Prevent text selection during drag
  plotElement.addEventListener('selectstart', function(e) {
    if (isDragging) e.preventDefault();
  });

  // Add touch-action CSS to prevent browser handling
  plotElement.style.touchAction = 'none';
  
  // Additional Safari-specific event prevention
  if (isSafari) {
    plotElement.addEventListener('gesturestart', function(e) {
      e.preventDefault();
    }, { passive: false });
    
    plotElement.addEventListener('gesturechange', function(e) {
      e.preventDefault();
    }, { passive: false });
    
    plotElement.addEventListener('gestureend', function(e) {
      e.preventDefault();
    }, { passive: false });
  }
}

// Quick and dirty password protection
let PASSWORD = "stelluvia"; // Change this to your desired password

function setupPasswordOverlay() {
  const overlay = document.getElementById('passwordOverlay');
  const input = document.getElementById('passwordInput');
  const btn = document.getElementById('passwordBtn');
  const errorDiv = document.getElementById('passwordError');
  function checkPassword() {
    if (input.value === PASSWORD) {
      overlay.style.display = 'none';
      // Now allow the rest of the app to run
      startApp();
    } else {
      errorDiv.textContent = 'Incorrect password.';
      input.value = '';
    }
  }
  btn.onclick = checkPassword;
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') checkPassword();
  });
  // Focus input on load
  setTimeout(() => input.focus(), 100);
}

// Wrap all app logic in a function to be called after password entry
function startApp() {
  // Sign in anonymously
  firebase.auth().signInAnonymously().catch(console.error).then(async () => {
    userId = firebase.auth().currentUser ? firebase.auth().currentUser.uid : null;
    // entries = await loadCSV('test_data.csv');
    entries = await loadCSV('real_data_with_latlon.csv');
    // Fetch all labels by this user to initialize labeledKeys
    const userLabelsSnap = await firebase.database().ref('glenn_data').orderByChild('userId').equalTo(userId).once('value');
    userLabelsSnap.forEach(child => {
      const val = child.val();
      if (val.entryKey) labeledKeys.add(val.entryKey);
    });
    showRandomEntry();
    setupMobileTouch(); // Add mobile touch functionality
  });
}

// On load, show password overlay and block app until correct password
window.addEventListener('DOMContentLoaded', () => {
  setupPasswordOverlay();
}); 