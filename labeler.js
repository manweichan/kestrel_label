// labeler.js
// Handles loading CSV, displaying data, and labeling

// Utility to parse CSV
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    // Only split on first 3 commas, rest is data
    const [day, station, satellite, ...dataArr] = line.split(',');
    let dataStr = dataArr.join(',').trim();
    // Remove leading/trailing quotes (single or double)
    dataStr = dataStr.replace(/^['"]+|['"]+$/g, '');
    let data;
    try {
      data = JSON.parse(dataStr);
      if (!Array.isArray(data)) throw new Error('Data is not array');
    } catch (e) {
      console.error('Failed to parse data field:', {raw: dataArr.join(','), cleaned: dataStr, error: e});
      data = [];
    }
    return {
      day: day && day.trim(),
      station: station && station.trim(),
      satellite: satellite && satellite.trim(),
      data
    };
  }).filter(entry => Array.isArray(entry.data) && entry.data.length > 0);
}

// Load CSV file
async function loadCSV(url) {
  const resp = await fetch(url);
  const text = await resp.text();
  return parseCSV(text);
}

// Plot data using Canvas
function plotData(data) {
  const canvas = document.getElementById('dataPlot');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Find min/max for scaling
  const min = Math.min(...data);
  const max = Math.max(...data);
  const w = canvas.width;
  const h = canvas.height;
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
}

let threshold = 0.7; // Default, will be loaded from Firebase
let userId = null;

// Fetch threshold from Firebase
function fetchThreshold() {
  return firebase.database().ref('config/labeling_threshold').once('value').then(snapshot => {
    const val = snapshot.val();
    if (typeof val === 'number') threshold = val;
  });
}

// Fetch all labels for a given entry
function fetchLabelsForEntry(entry) {
  return firebase.database().ref('test_labels').orderByChild('entryKey').equalTo(entryKey(entry)).once('value').then(snapshot => {
    const labels = [];
    snapshot.forEach(child => {
      labels.push(child.val());
    });
    return labels;
  });
}

// Helper to create a unique key for each entry
function entryKey(entry) {
  return `${entry.day}|${entry.station}|${entry.satellite}`;
}

// Show current entry info and consensus
async function showEntry(entry) {
  document.getElementById('entryInfo').textContent = `Day: ${entry.day} | Station: ${entry.station} | Satellite: ${entry.satellite}`;
  plotData(entry.data);
  // Fetch and display consensus
  const labels = await fetchLabelsForEntry(entry);
  const goodCount = labels.filter(l => l.label === 'good').length;
  const total = labels.length;
  let consensusText = 'Consensus: Not enough data';
  if (total > 0) {
    const percentGood = goodCount / total;
    consensusText = `Consensus: ${percentGood >= threshold ? 'Good' : 'Bad'} (${(percentGood*100).toFixed(1)}% good, threshold ${(threshold*100).toFixed(1)}%)`;
  }
  let consensusDiv = document.getElementById('consensusInfo');
  if (!consensusDiv) {
    consensusDiv = document.createElement('div');
    consensusDiv.id = 'consensusInfo';
    consensusDiv.style = 'font-size:1.1em; margin: 10px 0; text-align:center;';
    document.getElementById('entryInfo').after(consensusDiv);
  }
  consensusDiv.textContent = consensusText;
}

// Save label to Firebase (allow multiple labels per user/entry)
function saveLabel(entry, label) {
  if (!userId) return;
  const labelObj = {
    userId,
    day: entry.day,
    station: entry.station,
    satellite: entry.satellite,
    label,
    timestamp: Date.now(),
    entryKey: entryKey(entry)
  };
  firebase.database().ref('test_labels').push(labelObj);
}

// Track which entries the current user has labeled in this session
let labeledKeys = new Set();
let entries = [];
let currentIdx = null;

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

// Admin UI for threshold adjustment (only show on localhost)
function setupAdminThresholdUI() {
  const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const adminDiv = document.getElementById('adminThresholdUI');
  if (!adminDiv || !isLocalhost) return;
  adminDiv.style.display = '';
  const input = document.getElementById('thresholdInput');
  const btn = document.getElementById('setThresholdBtn');
  const status = document.getElementById('thresholdStatus');
  // Load current threshold
  firebase.database().ref('config/labeling_threshold').once('value').then(snap => {
    const val = snap.val();
    if (typeof val === 'number') input.value = val;
    else input.value = threshold;
  });
  btn.onclick = () => {
    const val = parseFloat(input.value);
    if (isNaN(val) || val < 0 || val > 1) {
      status.textContent = 'Enter a value between 0 and 1';
      status.style.color = 'red';
      return;
    }
    firebase.database().ref('config/labeling_threshold').set(val).then(() => {
      status.textContent = 'Threshold updated!';
      status.style.color = 'green';
      threshold = val;
    }).catch(err => {
      status.textContent = 'Error updating threshold';
      status.style.color = 'red';
    });
  };
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
    await fetchThreshold();
    entries = await loadCSV('test_data.csv');
    // Fetch all labels by this user to initialize labeledKeys
    const userLabelsSnap = await firebase.database().ref('test_labels').orderByChild('userId').equalTo(userId).once('value');
    userLabelsSnap.forEach(child => {
      const val = child.val();
      if (val.entryKey) labeledKeys.add(val.entryKey);
    });
    showRandomEntry();
    setupAdminThresholdUI();
  });
}

// On load, show password overlay and block app until correct password
window.addEventListener('DOMContentLoaded', () => {
  setupPasswordOverlay();
}); 