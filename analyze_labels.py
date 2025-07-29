#!/usr/bin/env python3
"""
Data Label Analysis Script
Downloads Firebase labels, applies threshold, and extracts good data entries.

CONFIGURATION (edit these variables):
- FIREBASE_URL: Your Firebase Realtime Database URL
- DATA_FILE_PATH: Path to your CSV data file
- THRESHOLD: Consensus threshold (0.0 to 1.0)
- OUTPUT_FILE: Where to save the good data entries
"""

import json
import csv
import requests
from collections import defaultdict

# =============================================================================
# CONFIGURATION - EDIT THESE VARIABLES FOR YOUR DATASET
# =============================================================================

# Firebase configuration
FIREBASE_URL = "https://kestrel-labeler-default-rtdb.firebaseio.com/glenn_data.json"

# Data file paths
DATA_FILE_PATH = "real_data_with_latlon.csv"
OUTPUT_FILE = "good_data_entries_glenn.csv"

# Analysis parameters
THRESHOLD = 0.5  # 70% of users must label as "good" for consensus

# the date you used in your CSV 'day' column
LAUNCH_DATE = "01/16/2025"

# =============================================================================
# FUNCTIONS
# =============================================================================

def download_firebase_data():
    """Download all label data from Firebase."""
    print(f"Downloading data from Firebase...")
    response = requests.get(FIREBASE_URL)
    if response.status_code == 200:
        data = response.json()
        # print(f"Downloaded {len(data)} records from Firebase")  
        # for i,(k,v) in enumerate(data.items()):  
        #     if i < 5:  
        #         print("  ", k, "→", v)  
        if data is None:
            print("No data found in Firebase.")
            return {}
        return data
    else:
        print(f"Error downloading data: {response.status_code}")
        return {}

def load_csv_data():
    """Load the original CSV data file."""
    print(f"Loading CSV data from {DATA_FILE_PATH}...")
    entries = {}
    with open(DATA_FILE_PATH, 'r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            # Create unique key for each entry
            key = f"{row['day']}|{row['station']}|{row['satellite']}"
            entries[key] = row
    return entries

def calculate_consensus(labels_data):
    """Calculate consensus for each data entry."""
    print("Calculating consensus for each entry...")
    
    # Group labels by entry
    entry_labels = defaultdict(list)
    print("Label keys examples:", list(entry_labels.keys())[:5])

    for label_id, label_data in labels_data.items():
        if isinstance(label_data, dict):
            # Create unique key for the entry
            # key = f"{label_data.get('day', '')}|{label_data.get('station', '')}|{label_data.get('satellite', '')}"
            raw_day = label_data.get('day','').strip()
            # if it looks like HH:MM:SS, add the date
            if len(raw_day.split(':')) == 3 and len(raw_day) == 8:
                label_day = f"{LAUNCH_DATE} {raw_day}"
            else:
                label_day = raw_day

            key = f"{label_day}|{label_data.get('station','')}|{label_data.get('satellite','')}"
            entry_labels[key].append(label_data.get('label', ''))
    
    # Calculate consensus for each entry
    consensus_results = {}
    for entry_key, labels in entry_labels.items():
        if labels:
            good_count = sum(1 for label in labels if label == 'good')
            total_count = len(labels)
            percent_good = good_count / total_count
            is_good = percent_good >= THRESHOLD
            
            consensus_results[entry_key] = {
                'good_count': good_count,
                'total_count': total_count,
                'percent_good': percent_good,
                'is_good': is_good,
                'labels': labels
            }
    
    return consensus_results

def extract_good_data(consensus_results, csv_data):
    """Extract data entries that meet the consensus threshold."""
    print(f"Extracting good data entries (threshold: {THRESHOLD})...")
    
    good_entries = []
    for entry_key, consensus in consensus_results.items():
        if consensus['is_good'] and entry_key in csv_data:
            entry = csv_data[entry_key].copy()
            entry['consensus_percent'] = consensus['percent_good']
            entry['total_labels'] = consensus['total_count']
            entry['good_labels'] = consensus['good_count']
            good_entries.append(entry)
            
    
    return good_entries

def save_results(good_entries):
    """Save the good data entries to a CSV file."""
    if not good_entries:
        print("No good data entries found.")
        return
    
    print(f"Saving {len(good_entries)} good entries to {OUTPUT_FILE}...")
    
    # Get all field names
    fieldnames = list(good_entries[0].keys())
    
    with open(OUTPUT_FILE, 'w', newline='') as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(good_entries)
    
    print(f"Results saved to {OUTPUT_FILE}")

def print_summary(consensus_results, good_entries):
    """Print a summary of the analysis."""
    print("\n" + "="*50)
    print("ANALYSIS SUMMARY")
    print("="*50)
    print(f"Threshold: {THRESHOLD} ({THRESHOLD*100:.1f}%)")
    print(f"Total entries analyzed: {len(consensus_results)}")
    print(f"Good entries found: {len(good_entries)}")
    print(f"Bad entries: {len(consensus_results) - len(good_entries)}")
    
    if consensus_results:
        avg_percent = sum(c['percent_good'] for c in consensus_results.values()) / len(consensus_results)
        print(f"Average 'good' percentage: {avg_percent:.1f}%")
    
    print("="*50)

# =============================================================================
# MAIN EXECUTION
# =============================================================================

def main():
    """Main analysis workflow."""
    print("Starting data label analysis...")
    print(f"Configuration:")
    print(f"  - Data file: {DATA_FILE_PATH}")
    print(f"  - Threshold: {THRESHOLD}")
    print(f"  - Output file: {OUTPUT_FILE}")
    print()
    
    # Step 1: Download Firebase data
    firebase_data = download_firebase_data()
    if not firebase_data:
        print("No Firebase data available. Exiting.")
        return
    
    # Step 2: Load CSV data
    csv_data = load_csv_data()
    print("CSV keys examples:", list(csv_data.keys())[:5])
    if not csv_data:
        print(f"No CSV data found in {DATA_FILE_PATH}. Exiting.")
        return
    
    # Step 3: Calculate consensus
    consensus_results = calculate_consensus(firebase_data)
    if not consensus_results:
        print("No consensus results. Check if labels exist in Firebase.")
        return
    
    # Step 4: Extract good data
    good_entries = extract_good_data(consensus_results, csv_data)
    
    # Step 5: Save results
    save_results(good_entries)
    
    # Step 6: Print summary
    print_summary(consensus_results, good_entries)

if __name__ == "__main__":
    main() 