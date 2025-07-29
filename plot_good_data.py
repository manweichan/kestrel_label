import pandas as pd
import ast
import matplotlib.pyplot as plt

# Constants for launch event indices
LAUNCH_IDX = 126
LAUNCH10_IDX = 146

# Filename of the CSV produced by analyze_labels
CSV_FILE = 'good_data_entries_glenn.csv'


def plot_good_entries(csv_path=CSV_FILE):
    # Load the CSV of good entries
    df = pd.read_csv(csv_path)

    # Parse the 'data' column (stored as a JSON-like list) into actual Python lists
    df['data_values'] = df['data'].apply(ast.literal_eval)

    # Iterate through each "good" entry and plot
    for idx, row in df.iterrows():
        station = row['station']
        satellite = row['satellite']
        data = row['data_values']

        plt.figure(figsize=(8, 4))
        plt.plot(data, label=f'{station} - {satellite}')
        # Vertical lines for launch and +10 min
        plt.axvline(LAUNCH_IDX, color='red', linestyle='--', linewidth=1, label='Launch (07:03)')
        plt.axvline(LAUNCH10_IDX, color='blue', linestyle='--', linewidth=1, label='Launch +10 min (07:13)')

        plt.title(f'Good Data Stream: {station} | {satellite}')
        plt.xlabel('Frame Index')
        plt.ylabel('VTEC Value')
        plt.legend(loc='upper right')
        plt.tight_layout()
        plt.show()


if __name__ == '__main__':
    plot_good_entries()
