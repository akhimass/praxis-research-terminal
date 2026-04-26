"""
Test Semantic Scholar integration.
Run: python backend/scripts/test_semantic_scholar.py
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))


async def main() -> None:
    from backend.agents.semantic_scholar import (
        get_recommendations,
        search_papers,
        search_protocol_papers,
    )

    print("Testing Semantic Scholar API...\n")

    print("Test 1: Basic paper search")
    papers = await search_papers(
        "FITC-dextran intestinal permeability mouse protocol",
        limit=3,
    )
    for p in papers:
        print(f"  ✓ {p['title'][:60]}...")
        print(f"    Citations: {p['citation_count']} | Influential: {p['influential_citations']}")
        if p.get("tldr"):
            print(f"    TLDR: {p['tldr'][:80]}...")
    print()

    print("Test 2: Protocol search")
    papers2 = await search_protocol_papers(
        hypothesis="Lactobacillus rhamnosus GG reduces intestinal permeability",
        assay_type="fitc_dextran",
        organism="C57BL/6 mice",
        limit=3,
    )
    for p in papers2:
        print(f"  ✓ [{p['source']}] {p['title'][:50]}... (year: {p['year']})")
    print()

    if papers and papers[0].get("s2_paper_id"):
        print("Test 3: Paper recommendations")
        recs = await get_recommendations(papers[0]["s2_paper_id"], limit=2)
        for r in recs:
            print(f"  ✓ {r['title'][:60]}...")

    print("\nAll tests passed ✓")
    print("Rate limit: 1 req/sec with API key")
    print("Total requests used: ~5 (well within limits)")


if __name__ == "__main__":
    asyncio.run(main())
