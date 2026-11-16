<h1 align="center">🌐 Live Threat Map</h1>

<p align="center"><b>Watch real malicious IPs attack a sensor, live on a neon world map.</b></p>

<p align="center">
  <img src="https://img.shields.io/badge/data-real%20blocklisted%20IPs-ff2e88?style=for-the-badge" />
  <img src="https://img.shields.io/badge/no%20install-open%20in%20browser-9d4edd?style=for-the-badge" />
  <img src="https://img.shields.io/badge/zero-dependencies-36e0ff?style=for-the-badge" />
</p>

---

## What this is

A dark, animated world map where **every dot is a real IP address** that is currently sitting on public malware and botnet blocklists. Each one is geolocated to its country and replayed as an incoming attack on a sensor node, with a live feed ticker and a top-origin-countries chart.

It's the "stop and stare" kind of security visual — but built on **real data**, not invented traffic.

**Where the data comes from (all real, all public):**
- **Malicious IPs:** [stamparm/ipsum](https://github.com/stamparm/ipsum) — an aggregated threat feed of IPs that appear on 30+ public blocklists. ~136,000 IPs; this map plots the 1,500 most-listed (most dangerous) of them.
- **Geolocation:** [DB-IP](https://db-ip.com) via [sapics/ip-location-db](https://github.com/sapics/ip-location-db) — maps each IP to a country.
- **Country outlines:** [Natural Earth](https://www.naturalearthdata.com/) (public domain).

**Honest about what it is:** the dots are real malicious IPs placed at their country; the flying arcs are a *visualization*, not a live packet capture of attacks hitting you. The "IPs on feed now" counter does refresh live from the real feed when you open it online.

---

## ▶️ Run it (no install)

```sh
git clone https://github.com/appu-019/live-threat-map
cd live-threat-map
```
Then double-click **`index.html`**. It opens in your browser and starts animating — no server, no dependencies, works offline (except the one live counter).

**Shareable live link:** turn on **Settings → Pages → Source: `main` / root**, and you'll get `https://appu-019.github.io/live-threat-map/` to drop anywhere.

---

## 🔁 Refresh the data

The map ships with a real snapshot. To pull the latest blocklist and regenerate:

```sh
python3 build_data.py
```
This re-downloads the live IPsum feed and re-geolocates it. (Script included.)

---

## 🧠 What I learned building it

- Threat feeds are noisy and huge — 136k IPs — so "which ones matter" (here, how many blocklists flagged each IP) is a real triage question.
- Geolocation is country-accurate at best from free data; an IP's country is not where the *attacker* is, just where the host sits.
- A huge share of blocklisted hosts live in a handful of countries — hosting providers, not people.

---

<sub>Built with real public threat-intel data. No real-time attack on anyone is shown; malicious IPs are visualized at their geolocated country.</sub>
