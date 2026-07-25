import pandas as pd

try:
    df = pd.read_csv('core/market_training_data.csv')
    
    # We will search for 'levelling' or 'uprooting' or 'rubbish' across all string columns
    for col in df.columns:
        if df[col].dtype == 'object':
            mask = df[col].str.contains('Cleaning and levelling the site', case=False, na=False)
            if mask.any():
                print(f"Found in column {col}:")
                print(df[mask])
                
            mask2 = df[col].str.contains('without any disturbance and spillage', case=False, na=False)
            if mask2.any():
                print(f"Found mask2 in column {col}:")
                print(df[mask2])
                
except Exception as e:
    print(f"Error: {e}")
