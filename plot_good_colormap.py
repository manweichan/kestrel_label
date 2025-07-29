import pandas as pd
import numpy as np
import ast
import matplotlib.pyplot as plt

# Constants for launch event indices
LAUNCH_IDX = 126
LAUNCH10_IDX = 146

# Filename of the CSV produced by analyze_labels
CSV_FILE = 'good_data_entries_glenn.csv'

def plot_good_entries_heatmap(csv_path=CSV_FILE):
    """
    Plots all good data streams as a heatmap for easy comparison.
    Args:
        csv_path (str): path to the CSV file with good entries.
    """
    # Load CSV and parse the 'data' column into Python lists
    df = pd.read_csv(csv_path)
    data_list = df['data'].apply(ast.literal_eval).tolist()
    data_matrix = np.array(data_list, dtype=float)

    # Create heatmap
    plt.figure(figsize=(10, 6))
    im = plt.imshow(data_matrix, aspect='auto', interpolation='nearest')
    cbar = plt.colorbar(im, label='VTEC Value')

    # Overlay vertical lines for launch events
    plt.axvline(LAUNCH_IDX, color='red', linestyle='--', linewidth=1, label='Launch (07:03)')
    plt.axvline(LAUNCH10_IDX, color='blue', linestyle='--', linewidth=1, label='Launch +10 min (07:13)')

    # Labels and title
    plt.xlabel('Frame Index')
    plt.ylabel('Entry Index')
    plt.title('Heatmap of Good Data Streams with Launch Markers')
    plt.legend(loc='upper right')
    plt.tight_layout()
    plt.show()

if __name__ == '__main__':
    plot_good_entries_heatmap()
