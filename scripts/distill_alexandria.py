#!/usr/bin/env python3
"""
🧬 DISTILL ALEXANDRIA - SOVEREIGN HARVESTER HOOK
Parses scientific research synthesis files from KNOWLEDGE_ISLES,
processes them semantically, and builds the catalog for GitHub Pages.
"""

import os
import sys
import re
import json
import math
from pathlib import Path

# Paths
ICM_DIR = Path("/Users/robbitcarrot/ICM")
KNOWLEDGE_ISLES_DIR = ICM_DIR / "KNOWLEDGE_ISLES"
PAGES_PROJECT_DIR = Path("/Users/robbitcarrot/projects/alexandria-library")
CATALOG_PATH = PAGES_PROJECT_DIR / "data" / "catalog.json"

# Category mapping
TOPIC_MAPPING = {
    "Neuro-Soberanía": "neuro-sovereignty",
    "Sovereign AI": "sovereign-ai",
    "Bio-Hacking Local": "biological-autonomy",
    "Privacy Textiles": "privacy-wearables",
    "Neural-Fashion": "privacy-wearables"
}

def clean_text(text):
    text = re.sub(r'^(Learning|Possibilities):\s*', '', text, flags=re.IGNORECASE)
    return text.strip()

def tokenize(text):
    # Standard lowercase tokenization for TF-IDF overlap
    words = re.findall(r'\w+', text.lower())
    return [w for w in words if len(w) > 3]

def calculate_cosine_similarity(tokens1, tokens2):
    if not tokens1 or not tokens2:
        return 0.0
    
    # Simple word count vec
    vec1 = {}
    vec2 = {}
    for t in tokens1:
        vec1[t] = vec1.get(t, 0) + 1
    for t in tokens2:
        vec2[t] = vec2.get(t, 0) + 1
        
    # Dot product
    intersection = set(vec1.keys()) & set(vec2.keys())
    dot_product = sum(vec1[x] * vec2[x] for x in intersection)
    
    # Magnitudes
    mag1 = math.sqrt(sum(val**2 for val in vec1.values()))
    mag2 = math.sqrt(sum(val**2 for val in vec2.values()))
    
    if mag1 == 0.0 or mag2 == 0.0:
        return 0.0
        
    return dot_product / (mag1 * mag2)

def harvest_and_distill():
    print("🧬 Starting Alexandria distillation...")
    
    if not KNOWLEDGE_ISLES_DIR.exists():
        print(f"ERROR: Knowledge Isles folder {KNOWLEDGE_ISLES_DIR} does not exist.")
        sys.exit(1)
        
    articles = []
    
    # 1. Read and parse files
    for filepath in KNOWLEDGE_ISLES_DIR.glob("synthesis_*.txt"):
        try:
            # Extract ID from filename
            match = re.search(r'synthesis_(\d+)\.txt', filepath.name)
            if not match:
                continue
            article_id = int(match.group(1))
            
            with open(filepath, "r", encoding="utf-8") as f:
                lines = [line.strip() for line in f.readlines() if line.strip()]
                
            if len(lines) < 2:
                continue
                
            # Parse Title / Topic
            title_line = lines[0]
            # Expected format: "Knowledge synthesis for Topic | Title"
            # Fallback: check if "for " in line
            topic = "General Research"
            title = title_line
            
            if "Knowledge synthesis for" in title_line:
                clean_title_line = title_line.replace("Knowledge synthesis for", "").strip()
                if "|" in clean_title_line:
                    topic_part, title_part = clean_title_line.split("|", 1)
                    topic = topic_part.strip()
                    title = title_part.strip()
                else:
                    topic = clean_title_line
                    title = clean_title_line
            
            # Category taxonomy classification
            mapped_category = "General"
            for k, val in TOPIC_MAPPING.items():
                if k.lower() in topic.lower():
                    mapped_category = val
                    break
                    
            # Parse Learning (Line 2)
            learning = clean_text(lines[1])
            
            # Parse Possibilities (Line 3 if exists)
            possibilities = ""
            if len(lines) >= 3:
                possibilities = clean_text(lines[2])
                
            # Date formatting
            from datetime import datetime
            date_str = datetime.fromtimestamp(article_id).strftime('%Y-%m-%d')
            
            articles.append({
                "id": article_id,
                "category": mapped_category,
                "title": title,
                "date": date_str,
                "learning": learning,
                "possibilities": possibilities,
                "tokens": tokenize(title + " " + learning + " " + possibilities)
            })
            
        except Exception as e:
            print(f"Warning: Failed to parse {filepath.name}: {e}")

    if not articles:
        print("No articles compiled. Keeping existing database or default seeds.")
        return

    # 2. Compute client-side semantic similarity matrix (related articles)
    print(f"Compiling relationships for {len(articles)} documents...")
    for i, art in enumerate(articles):
        scores = []
        for j, other in enumerate(articles):
            if i == j:
                continue
            # Calculate overlap score
            sim = calculate_cosine_similarity(art["tokens"], other["tokens"])
            scores.append((other["id"], sim))
        
        # Sort by similarity score (descending)
        scores.sort(key=lambda x: x[1], reverse=True)
        # Select top 3 related IDs
        art["related_ids"] = [item[0] for item in scores[:3] if item[1] > 0.0]

    # Remove tokens dictionary before writing to JSON
    for art in articles:
        if "tokens" in art:
            del art["tokens"]

    # 3. Sort articles by ID descending (newest first)
    articles.sort(key=lambda x: x["id"], reverse=True)

    # 4. Write database catalog
    os.makedirs(CATALOG_PATH.parent, exist_ok=True)
    with open(CATALOG_PATH, "w", encoding="utf-8") as out:
        json.dump(articles, out, indent=4, ensure_ascii=False)
        
    print(f"SUCCESS: Distilled {len(articles)} works to {CATALOG_PATH}")

    # 5. Git Commit & Push Hook
    git_dir = PAGES_PROJECT_DIR / ".git"
    if git_dir.exists():
        print("Checking Git status on Pages repository...")
        import subprocess
        try:
            # Check if there are changes in catalog
            status_res = subprocess.run(["git", "-C", str(PAGES_PROJECT_DIR), "status", "--porcelain"], capture_output=True, text=True)
            if status_res.stdout.strip():
                print("Changes detected. Committing changes...")
                subprocess.run(["git", "-C", str(PAGES_PROJECT_DIR), "add", "data/catalog.json"], check=True)
                subprocess.run(["git", "-C", str(PAGES_PROJECT_DIR), "commit", "-m", "🧬 Odysseus Auto-Distill Catalog Update"], check=True)
                
                # Check if a remote origin exists before pushing
                remote_res = subprocess.run(["git", "-C", str(PAGES_PROJECT_DIR), "remote"], capture_output=True, text=True)
                if "origin" in remote_res.stdout:
                    print("Pushing catalog updates to GitHub Pages remote...")
                    subprocess.run(["git", "-C", str(PAGES_PROJECT_DIR), "push"], timeout=30)
                else:
                    print("No remote 'origin' configured. Skipping push.")
            else:
                print("No database changes to commit.")
        except Exception as git_err:
            print(f"Git auto-sync failed or skipped: {git_err}")

if __name__ == "__main__":
    harvest_and_distill()
