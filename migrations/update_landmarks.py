
import re
import random

def randomize_landmarks(sql_path):
    with open(sql_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Define a list of diverse landmarks
    landmarks = [
        "Near Community Center", "Block A Market", "Opposite Metro Station", 
        "Behind Government School", "Near Sai Temple", "Sector 12 Court Road", 
        "Main Market Chowk", "Near Civil Hospital", "Railway Road", "Near Bus Stand",
        "Neelam Bata Road", "Hardware Chowk", "Near Rose Garden", 
        "Opposite Post Office", "Near Police Station", "Sector 21 Market",
        "Near SRS Mall", "Bata Flyover", "Near Town Park", "Badkhal Lake Road"
    ]

    # Pattern to find 'Near Landmark' literal string and replace it
    # We use a simple counting replacement to cycle through landmarks or random choice
    
    # Let's verify how many we have
    count = content.count("'Near Landmark'")
    print(f"Found {count} instances of 'Near Landmark'. Replacing...")

    def replace_match(match):
        return f"'{random.choice(landmarks)}'"

    new_content = re.sub(r"'Near Landmark'", replace_match, content)

    with open(sql_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print("Done.")

if __name__ == "__main__":
    randomize_landmarks("c:/Users/kunal/Downloads/temp download/DTI V1/DTI V1/complaints_data.sql")
