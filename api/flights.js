const ICAO = 'OIIE'; // فرودگاه امام خمینی

function todayRangesTehran() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tehran' }));
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const base = `${y}-${m}-${d}`;
  return [
    [`${base}T00:00`, `${base}T11:59`],
    [`${base}T12:00`, `${base}T23:59`]
  ];
}

async function fetchWindow(from, to, keys) {
  const url = `https://aerodatabox.p.rapidapi.com/flights/airports/icao/${ICAO}/${from}/${to}?direction=Departure&withLeg=true&withCancelled=true&withCodeshared=true`;
  let lastErr = null;
  for (const key of keys) {
    try {
      const r = await fetch(url, {
        headers: {
          'X-RapidAPI-Key': key,
          'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com'
        }
      });
      if (r.ok) {
        return await r.json();
      }
      lastErr = `HTTP ${r.status}: ${await r.text()}`;
    } catch (e) {
      lastErr = String(e);
    }
  }
  throw new Error(lastErr || 'no keys configured');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const keys = [
      process.env.AERODATABOX_KEY_1,
      process.env.AERODATABOX_KEY_2,
      process.env.AERODATABOX_KEY_3
    ].filter(Boolean);

    const ranges = todayRangesTehran();
    const results = await Promise.allSettled(ranges.map(([f, t]) => fetchWindow(f, t, keys)));
    let departures = [];
    let windowsOk = 0;
    const debug = [];
    for (const r of results) {
      if (r.status === 'fulfilled') {
        windowsOk++;
        departures = departures.concat(r.value.departures || []);
      } else {
        debug.push(String(r.reason));
      }
    }
    res.status(200).json({ departures, windowsOk, debug });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
};
