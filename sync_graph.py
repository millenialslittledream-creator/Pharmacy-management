"""Sync graphify's knowledge graph into the pharrmasy Obsidian vault.

Run after code changes (or via the graphify git hook) to keep the vault current.
Usage: python sync_graph.py [--force]
"""
import json
import shutil
import sys
from pathlib import Path

import networkx as nx
from graphify.wiki import to_wiki

PROJECT_ROOT = Path(__file__).parent
GRAPH_JSON = PROJECT_ROOT / "graphify-out" / "graph.json"
ANALYSIS_JSON = PROJECT_ROOT / "graphify-out" / "analysis.json"
VAULT = Path.home() / "Documents" / "Obsidian Vault" / "pharrmasy"


def main() -> None:
    if not GRAPH_JSON.exists():
        print(f"No graph found at {GRAPH_JSON}. Run `python -m graphify update <src>` first.")
        sys.exit(1)

    graph_data = json.loads(GRAPH_JSON.read_text(encoding="utf-8"))
    G = nx.node_link_graph(graph_data, edges="links") if "links" in graph_data else nx.node_link_graph(graph_data)

    # Current graphify (0.8.x) stores each node's cluster as a `community` attribute
    # on the node itself rather than a separate analysis.json — group node ids by it.
    if ANALYSIS_JSON.exists():
        analysis = json.loads(ANALYSIS_JSON.read_text(encoding="utf-8"))
        communities = {int(k): v for k, v in analysis.get("communities", {}).items()}
        community_labels = analysis.get("community_labels")
        cohesion = analysis.get("cohesion")
        god_nodes_data = analysis.get("god_nodes")
    else:
        communities = {}
        for node_id, attrs in G.nodes(data=True):
            cid = attrs.get("community")
            if cid is None:
                continue
            communities.setdefault(int(cid), []).append(node_id)
        community_labels = None
        cohesion = None
        god_nodes_data = None

    wiki_dir = PROJECT_ROOT / "graphify-out" / "wiki"
    count = to_wiki(
        G,
        communities,
        wiki_dir,
        community_labels=community_labels,
        cohesion=cohesion,
        god_nodes_data=god_nodes_data,
    )
    print(f"Generated {count} wiki articles in {wiki_dir}")

    VAULT.mkdir(parents=True, exist_ok=True)
    dest = VAULT / "graphify"
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(wiki_dir, dest)
    print(f"Synced to Obsidian vault: {dest}")


if __name__ == "__main__":
    main()
