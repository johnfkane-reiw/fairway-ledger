/* Proxies golfcourseapi.com so the API key never reaches the browser.
   GET /api/course-search?q=<text>   -> { results: [{externalId, name, club, location}] }
   GET /api/course-search?id=<id>    -> { course: { name, tees:[{name,rating,slope,par,holes}] } }
   Requires a GOLF_API_KEY environment variable on the Pages project. */

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

const API = "https://api.golfcourseapi.com";

export async function onRequest(context) {
  const { request, env } = context;
  const key = env.GOLF_API_KEY;
  if (!key) return json({ error: "Course lookup isn't configured (missing GOLF_API_KEY)." }, 500);

  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  const id = url.searchParams.get("id");
  const headers = { Authorization: "Key " + key };

  try {
    if (id) {
      const r = await fetch(`${API}/v1/courses/${encodeURIComponent(id)}`, { headers });
      if (!r.ok) return json({ error: `Course lookup failed (${r.status}).` }, 502);
      const data = await r.json();
      return json({ course: mapCourse(data.course || data) });
    }
    if (q && q.trim().length >= 2) {
      const r = await fetch(`${API}/v1/search?search_query=${encodeURIComponent(q.trim())}`, { headers });
      if (!r.ok) return json({ error: `Search failed (${r.status}).` }, 502);
      const data = await r.json();
      const results = (data.courses || []).map((c) => ({
        externalId: c.id,
        name: c.course_name || c.club_name || "Course",
        club: c.club_name || "",
        location: [c.location?.city, c.location?.state].filter(Boolean).join(", "),
      }));
      return json({ results });
    }
    return json({ error: "Provide a search term (q) or a course id." }, 400);
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
}

function mapTee(t, i) {
  const holes =
    Array.isArray(t.holes) && t.holes.length === 18
      ? t.holes.map((h, k) => ({
          par: Number(h.par) || 4,
          si: Number(h.handicap) || k + 1,
          yd: Number(h.yardage) || null,
        }))
      : null;
  const par =
    Number(t.par_total) || (holes ? holes.reduce((s, h) => s + h.par, 0) : 72);
  return {
    name: t.tee_name || `Tee ${i + 1}`,
    rating: Number(t.course_rating) || null,
    slope: Number(t.slope_rating) || null,
    par,
    holes,
  };
}

function mapCourse(c) {
  const male = (c.tees?.male || []).map(mapTee);
  const female = (c.tees?.female || []).map(mapTee);
  const maleNames = new Set(male.map((t) => t.name));
  // tag women's tees only when the name collides with a men's tee
  const femaleTagged = female.map((t) =>
    maleNames.has(t.name) ? { ...t, name: `${t.name} (W)` } : t
  );
  const tees = [...male, ...femaleTagged].filter((t) => t.rating && t.slope);
  return { name: c.course_name || c.club_name || "Course", tees };
}
