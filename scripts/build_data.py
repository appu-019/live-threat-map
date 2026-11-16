#!/usr/bin/env python3
"""Rebuild data/world.js and data/attacks.js from the upstream sources.

  IPs:          https://github.com/stamparm/ipsum
  geolocation:  https://github.com/sapics/ip-location-db (DB-IP Lite, country level)
  borders:      Natural Earth 1:110m

Run from anywhere:  python3 scripts/build_data.py
Standard library only.
"""
import json, csv, bisect, random, urllib.request, io, datetime, os

IPSUM = "https://raw.githubusercontent.com/stamparm/ipsum/master/ipsum.txt"
DBIP  = "https://raw.githubusercontent.com/sapics/ip-location-db/main/dbip-country/dbip-country-ipv4.csv"
WORLD = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson"
MAX_POINTS = 1500
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")

def get(url):
    print("fetching", url)
    return urllib.request.urlopen(url, timeout=120).read().decode("utf-8", "replace")

def ip2int(s):
    a = s.split("."); return (int(a[0])<<24)+(int(a[1])<<16)+(int(a[2])<<8)+int(a[3])

def main():
    random.seed(7)

    starts, ends, ccs = [], [], []
    for row in csv.reader(io.StringIO(get(DBIP))):
        if len(row) != 3: continue
        try: starts.append(ip2int(row[0])); ends.append(ip2int(row[1])); ccs.append(row[2])
        except Exception: pass
    def lookup(ipi):
        i = bisect.bisect_right(starts, ipi) - 1
        return ccs[i] if 0 <= i < len(starts) and starts[i] <= ipi <= ends[i] else None

    # Natural Earth label points are better placed than polygon averages
    world = json.loads(get(WORLD))
    cent, names = {}, {}
    for ft in world["features"]:
        p = ft["properties"]; cc = p.get("ISO_A2") or p.get("ISO_A2_EH")
        if not cc or cc == "-99": continue
        lx, ly = p.get("LABEL_X"), p.get("LABEL_Y")
        if lx is None or ly is None:
            xs, ys = [], []
            def walk(c):
                if isinstance(c, list) and c and isinstance(c[0], (int, float)): xs.append(c[0]); ys.append(c[1])
                elif isinstance(c, list):
                    for x in c: walk(x)
            walk(ft["geometry"]["coordinates"]); lx = sum(xs)/len(xs); ly = sum(ys)/len(ys)
        cent[cc] = (round(ly, 2), round(lx, 2)); names[cc] = p.get("NAME")

    # most-listed first
    rows = []
    for line in get(IPSUM).splitlines():
        if line.startswith("#") or not line.strip(): continue
        ip, cnt = line.split("\t"); rows.append((ip, int(cnt)))
    rows.sort(key=lambda r: -r[1])

    attacks = []
    for ip, cnt in rows:
        if len(attacks) >= MAX_POINTS: break
        cc = lookup(ip2int(ip))
        if not cc or cc not in cent: continue
        lat, lng = cent[cc]
        attacks.append({"ip": ip, "cc": cc, "country": names.get(cc, cc),
                        "lat": round(lat + random.uniform(-2, 2), 2),
                        "lng": round(lng + random.uniform(-2, 2), 2), "hits": cnt})

    def rnd(c):
        if isinstance(c, list) and c and isinstance(c[0], (int, float)): return [round(c[0], 2), round(c[1], 2)]
        return [rnd(x) for x in c]
    feats = [{"n": ft["properties"].get("NAME"), "g": rnd(ft["geometry"]["coordinates"]),
              "t": ft["geometry"]["type"]} for ft in world["features"]]

    with open(os.path.join(DATA_DIR, "world.js"), "w") as f:
        f.write("window.WORLD=" + json.dumps(feats, separators=(",", ":")) + ";")
    meta = {"generated": datetime.date.today().isoformat(), "source_feed": "stamparm/ipsum",
            "source_geo": "sapics/ip-location-db (DB-IP)", "total_feed_ips": len(rows)}
    with open(os.path.join(DATA_DIR, "attacks.js"), "w") as f:
        f.write("window.ATTACKS=" + json.dumps(attacks, separators=(",", ":")) +
                ";\nwindow.ATTACK_META=" + json.dumps(meta) + ";")
    print(f"wrote {len(attacks)} attacks, {len(feats)} countries")

if __name__ == "__main__":
    main()
