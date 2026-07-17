#!/usr/bin/env python3
"""Scan lead websites and infer section blueprints per trade bucket."""
from __future__ import annotations

import json
import re
import sys
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from csv import DictReader
from datetime import datetime, timezone
from pathlib import Path

CSV_PATH = Path(r"e:\MasterVault\Moonrise\LeadFinderCloud\data\all-leads.csv")
OUT_PATH = Path(r"e:\MasterVault\Moonrise\moonrise-studio\worker\scripts\lead-structure-analysis.json")
LIMIT = int(sys.argv[1]) if len(sys.argv) > 1 else 350
CONCURRENCY = 10
TIMEOUT = 12

TRADE_BUCKETS = [
    ("barber_salon", re.compile(r"barber|hair salon|beauty salon|nail salon|spa|massage", re.I)),
    ("dental_medical", re.compile(r"dental|dentist|orthodont|chiropract|physical therapy|clinic|doctor|medical|urgent care|optomet|dermatolog|pediatric", re.I)),
    ("restaurant_food", re.compile(r"restaurant|cafe|coffee|bakery|pizza|food|catering|juice|\bbar\b|grill|kitchen|diner", re.I)),
    ("fitness", re.compile(r"gym|fitness|yoga|pilates|crossfit|martial|training|sport", re.I)),
    ("home_services", re.compile(r"plumb|electric|hvac|roof|landscap|lawn|pest|clean|paint|handyman|pressure wash|pool|flooring|carpet|tree service|contractor|construction|garage door", re.I)),
    ("auto", re.compile(r"auto repair|car detail|tire|oil change|body shop|towing|mechanic", re.I)),
    ("legal_finance", re.compile(r"attorney|law firm|lawyer|legal|accounting|insurance|financial|real estate", re.I)),
    ("pet", re.compile(r"veterinar|pet groom|dog train|pet board|animal", re.I)),
    ("professional", re.compile(r"marketing|agency|consult|design|photograph|software|tech", re.I)),
]
DEFAULT_BUCKET = "local_service"

SECTION_DETECTORS: dict[str, re.Pattern[str]] = {
    "navigation": re.compile(r"\b(nav|navbar|site-header|main-menu|menu-toggle)\b|<nav[\s>]", re.I),
    "hero": re.compile(r"\b(hero|banner|jumbotron|masthead|page-header)\b|class=\"[^\"]*hero", re.I),
    "credibility": re.compile(r"\b(licensed|insured|certified|accredited|years of experience|since 19|since 20|\b\d+\+?\s*years\b|bbb|award|trusted by|as seen on)\b", re.I),
    "services": re.compile(r"\b(our services|services we offer|what we do|service area|service menu)\b|\bservices\b", re.I),
    "about": re.compile(r"\b(about us|who we are|our story|meet the team|our team|our mission)\b", re.I),
    "gallery": re.compile(r"\b(gallery|portfolio|our work|before and after|photo gallery|project gallery)\b", re.I),
    "testimonials": re.compile(r"\b(testimonial|what (our )?clients say|customer reviews|google reviews|review carousel|client stories)\b|\breviews\b", re.I),
    "pricing": re.compile(r"\b(pricing|our rates|price list|packages|plans)\b", re.I),
    "faq": re.compile(r"\b(faq|frequently asked)\b", re.I),
    "team": re.compile(r"\b(meet (the )?team|our (staff|dentists|doctors|barbers|stylists|trainers|attorneys))\b", re.I),
    "hours_location": re.compile(r"\b(hours of operation|business hours|find us|visit us|directions|service area)\b|\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b.*\b(am|pm|closed)\b", re.I),
    "map": re.compile(r"\b(google\.com/maps|maps\.google|iframe[^>]+maps|data-map|mapbox)\b", re.I),
    "contact_form": re.compile(r"<form[\s\S]{0,2500}?(name|phone|email|message|submit)", re.I),
    "cta_band": re.compile(r"\b(book (now|online|appointment)|schedule (a )?(consultation|appointment)|get (a )?quote|call now|contact us today|free estimate)\b", re.I),
    "footer": re.compile(r"<footer[\s>]", re.I),
}

CANONICAL_ORDER = [
    "navigation",
    "hero",
    "credibility",
    "services",
    "about",
    "gallery",
    "testimonials",
    "pricing",
    "team",
    "faq",
    "hours_location",
    "map",
    "cta_band",
    "contact_form",
    "footer",
]

SECTION_LABELS = {
    "navigation": "Navigation",
    "hero": "Hero",
    "credibility": "Credibility / trust strip",
    "services": "Services",
    "about": "About",
    "gallery": "Photo gallery / portfolio",
    "testimonials": "Testimonials / reviews",
    "pricing": "Pricing / packages",
    "team": "Team / staff",
    "faq": "FAQ",
    "hours_location": "Hours & location",
    "map": "Map embed",
    "cta_band": "CTA band",
    "contact_form": "Contact form",
    "footer": "Footer",
}


def trade_bucket(category: str, name: str) -> str:
    hay = f"{category} {name}"
    for bid, pat in TRADE_BUCKETS:
        if pat.search(hay):
            return bid
    return DEFAULT_BUCKET


def valid_site(url: str) -> bool:
    u = (url or "").strip()
    if not re.match(r"^https?://", u, re.I):
        return False
    if re.search(r"google\.(com|ca)|gstatic\.com|facebook\.com/pg|instagram\.com|yelp\.com|bbb\.org", u, re.I):
        return False
    return True


def fetch_html(url: str) -> str:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "MoonriseStudioStructureBot/1.0",
            "Accept": "text/html,application/xhtml+xml",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as res:
            ct = res.headers.get("Content-Type", "")
            if "html" not in ct.lower() and "text" not in ct.lower():
                return ""
            data = res.read(1_500_000)
            return data.decode("utf-8", errors="replace")
    except (urllib.error.URLError, TimeoutError, ValueError):
        return ""


def detect_sections(html: str) -> dict[str, bool]:
    return {k: bool(p.search(html)) for k, p in SECTION_DETECTORS.items()}


def order_sections(sections: dict[str, bool]) -> list[str]:
    return [s for s in CANONICAL_ORDER if sections.get(s)]


def pct(n: int, d: int) -> int:
    return round((n / d) * 100) if d else 0


def typical_order(samples: list[list[str]]) -> list[str]:
    pos: dict[str, list[int]] = defaultdict(list)
    counts: Counter[str] = Counter()
    for order in samples:
        for idx, sec in enumerate(order):
            pos[sec].append(idx)
            counts[sec] += 1
    min_hits = max(3, int(len(samples) * 0.2))
    ranked = [s for s, c in counts.items() if c >= min_hits]
    return sorted(ranked, key=lambda s: sum(pos[s]) / len(pos[s]))


def build_blueprint(scanned: int, hits: Counter[str], order_samples: list[list[str]]) -> dict:
    freq = {s: pct(hits[s], scanned) for s in SECTION_DETECTORS}
    ranked = sorted(freq.items(), key=lambda x: -x[1])
    core = [s for s, r in ranked if r >= 55]
    common = [s for s, r in ranked if 30 <= r < 55]
    optional = [s for s, r in ranked if 15 <= r < 30]
    if not core:
        core = [s for s, _ in ranked[:6]]
    return {
        "sampleSize": scanned,
        "coreSections": core,
        "commonSections": common,
        "optionalSections": optional,
        "frequencies": freq,
        "typicalOrder": typical_order(order_samples),
        "structure": [SECTION_LABELS.get(s, s) for s in typical_order(order_samples) or core],
    }


def main() -> None:
    if not CSV_PATH.exists():
        raise SystemExit(f"Missing CSV: {CSV_PATH}")

    with CSV_PATH.open("r", encoding="utf-8", errors="replace", newline="") as f:
        rows = list(DictReader(f))

    candidates = []
    for row in rows:
        url = (row.get("website_url") or row.get("website") or "").strip()
        if not valid_site(url):
            continue
        category = (row.get("category_group") or row.get("category") or "").strip()
        name = (row.get("business_name") or "").strip()
        candidates.append(
            {
                "url": url,
                "category": category,
                "name": name,
                "bucket": trade_bucket(category, name),
            }
        )

    by_bucket: dict[str, list[dict]] = defaultdict(list)
    for c in candidates:
        by_bucket[c["bucket"]].append(c)

    per_bucket = max(12, (LIMIT + len(by_bucket) - 1) // len(by_bucket))
    sample: list[dict] = []
    for lst in by_bucket.values():
        sample.extend(lst[:per_bucket])
        if len(sample) >= LIMIT:
            break
    sample = sample[:LIMIT]

    print(f"Scanning {len(sample)} sites from {len(candidates)} with websites across {len(by_bucket)} buckets...")

    bucket_hits: dict[str, Counter[str]] = defaultdict(Counter)
    bucket_orders: dict[str, list[list[str]]] = defaultdict(list)
    bucket_scanned: Counter[str] = Counter()

    def scan_one(item: dict) -> tuple[str, dict[str, bool] | None]:
        html = fetch_html(item["url"])
        if not html or len(html) < 400:
            return item["bucket"], None
        sections = detect_sections(html)
        return item["bucket"], sections

    done = 0
    with ThreadPoolExecutor(max_workers=CONCURRENCY) as pool:
        futures = {pool.submit(scan_one, item): item for item in sample}
        for fut in as_completed(futures):
            done += 1
            if done % 25 == 0:
                print(f"  {done}/{len(sample)}")
            try:
                bucket, sections = fut.result()
            except Exception:
                continue
            if not sections:
                continue
            order = order_sections(sections)
            bucket_scanned[bucket] += 1
            for k, v in sections.items():
                if v:
                    bucket_hits[bucket][k] += 1
            if order:
                bucket_orders[bucket].append(order)

    blueprints = {
        bucket: build_blueprint(
            bucket_scanned[bucket],
            bucket_hits[bucket],
            bucket_orders[bucket],
        )
        for bucket in sorted(set(list(by_bucket.keys()) + [DEFAULT_BUCKET]))
        if bucket_scanned[bucket] > 0
    }

    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "csvPath": str(CSV_PATH),
        "totalWithWebsite": len(candidates),
        "scanned": sum(bucket_scanned.values()),
        "blueprints": blueprints,
    }
    OUT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print("Wrote", OUT_PATH)
    for bucket, bp in blueprints.items():
        print(f"\n{bucket} (n={bp['sampleSize']})")
        print("  →", " → ".join(bp["structure"]))


if __name__ == "__main__":
    main()
