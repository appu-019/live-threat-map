"use strict";

const W = 1000;
const H = 500;
const SVG_NS = "http://www.w3.org/2000/svg";
const FEED_URL = "https://raw.githubusercontent.com/stamparm/ipsum/master/ipsum.txt";

// Equirectangular projection onto the 1000x500 viewBox.
function project(lat, lng) {
  return [(lng + 180) / 360 * W, (90 - lat) / 180 * H];
}

// Natural Earth's long names don't fit the side panels.
const SHORT_NAMES = { "United States of America": "United States", "Dominican Rep.": "Dominican Republic" };
const countryName = name => SHORT_NAMES[name] || name;

function svg(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function drawLand(features) {
  let d = "";
  for (const f of features) {
    const polygons = f.t === "Polygon" ? [f.g] : f.g;
    for (const polygon of polygons) {
      for (const ring of polygon) {
        d += "M" + ring.map(([lng, lat]) => project(lat, lng).map(n => n.toFixed(1)).join(" ")).join("L") + "Z";
      }
    }
  }
  document.getElementById("countries").appendChild(svg("path", { d, class: "land" }));
}

// Single sensor that all arcs point at. Location is arbitrary (New York).
const SENSOR = project(40.7, -74.0);

function drawSensor() {
  const g = document.getElementById("sensor");
  const ring = svg("circle", { cx: SENSOR[0], cy: SENSOR[1], r: 4, fill: "none", stroke: "#1f2328", "stroke-width": 1 });
  g.append(svg("circle", { cx: SENSOR[0], cy: SENSOR[1], r: 3, fill: "#1f2328" }), ring);

  let t = 0;
  (function pulse() {
    t = (t + 0.012) % 1;
    ring.setAttribute("r", 3 + t * 14);
    ring.setAttribute("stroke-opacity", (1 - t).toFixed(2));
    requestAnimationFrame(pulse);
  })();
}

function fillCountryTable(attacks) {
  const counts = {};
  for (const a of attacks) counts[countryName(a.country)] = (counts[countryName(a.country)] || 0) + 1;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = top[0][1];

  document.getElementById("by-country").innerHTML = top.map(([name, n]) => `
    <tr><td>${name}</td><td class="n">${n}</td></tr>
    <tr><td colspan="2"><div class="bar" style="width:${(n / max * 100).toFixed(0)}%"></div></td></tr>`
  ).join("");
}

// --- animation ---

const arcsLayer = document.getElementById("arcs");
const rows = document.getElementById("rows");
const inFlight = [];
let shown = 0;

function launch(attacks) {
  const a = attacks[Math.floor(Math.random() * attacks.length)];
  const [x0, y0] = project(a.lat, a.lng);
  const [x1, y1] = SENSOR;
  // control point above the midpoint, higher for longer arcs
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2 - Math.hypot(x1 - x0, y1 - y0) * 0.3;

  const path = svg("path", { d: `M${x0} ${y0} Q${cx} ${cy} ${x1} ${y1}`, class: "arc" });
  const origin = svg("circle", { cx: x0, cy: y0, r: 1.8, class: "origin" });
  arcsLayer.append(path, origin);

  const length = path.getTotalLength();
  path.style.strokeDasharray = length;
  path.style.strokeDashoffset = length;
  inFlight.push({ path, origin, length, progress: 0 });

  const li = document.createElement("li");
  li.innerHTML = `<span class="ip">${a.ip.padEnd(15)}</span> <span class="meta">${a.cc}  ${a.hits} lists</span>`;
  rows.prepend(li);
  while (rows.children.length > 8) rows.lastChild.remove();

  shown++;
  updateSummary();
}

function step() {
  for (let i = inFlight.length - 1; i >= 0; i--) {
    const arc = inFlight[i];
    arc.progress = Math.min(arc.progress + 0.008, 1);
    arc.path.style.strokeDashoffset = arc.length * (1 - arc.progress);

    if (arc.progress === 1) {
      inFlight.splice(i, 1);
      for (const node of [arc.path, arc.origin]) {
        node.style.transition = "opacity 1.5s";
        node.style.opacity = 0;
        setTimeout(() => node.remove(), 1500);
      }
    }
  }
  requestAnimationFrame(step);
}

// --- header / footer ---

let feedSize = null;

function updateSummary() {
  const parts = [
    `${ATTACKS.length.toLocaleString()} IPs loaded`,
    `${shown.toLocaleString()} shown`,
  ];
  if (feedSize !== null) parts.push(`${feedSize.toLocaleString()} on the feed right now`);
  document.getElementById("summary").textContent = parts.join(" · ");
}

function fillCredits(meta) {
  document.getElementById("credits").innerHTML =
    `Top ${ATTACKS.length.toLocaleString()} IPs from <a href="https://github.com/stamparm/ipsum">IPsum</a>, ` +
    `snapshot ${meta.generated}. IP geolocation by <a href="https://db-ip.com">DB-IP</a>. ` +
    `Borders: Natural Earth. Arcs are illustrative: these are known-bad hosts, not traffic seen by a real sensor.`;
}

// Current feed size, so the header reflects today's list even though the plotted
// points are a snapshot. Fails silently offline.
function fetchFeedSize() {
  fetch(FEED_URL, { cache: "no-store" })
    .then(r => (r.ok ? r.text() : Promise.reject(r.status)))
    .then(text => {
      feedSize = text.split("\n").filter(l => l && !l.startsWith("#")).length;
      updateSummary();
    })
    .catch(() => {});
}

// --- start ---

const ATTACKS = window.ATTACKS || [];
const META = window.ATTACK_META || {};

drawLand(window.WORLD || []);
drawSensor();
fillCountryTable(ATTACKS);
fillCredits(META);
updateSummary();
fetchFeedSize();

if (ATTACKS.length) {
  for (let i = 0; i < 8; i++) setTimeout(() => launch(ATTACKS), i * 120);
  setInterval(() => launch(ATTACKS), 250);
  requestAnimationFrame(step);
}
