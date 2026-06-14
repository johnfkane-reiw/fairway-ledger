/* Cloudflare Pages Functions — single catch-all router for /api/*
   Binding: env.DB (D1). Auth: reads Cf-Access-Authenticated-User-Email
   when Cloudflare Access is enabled (currently captured, not enforced). */

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

const userEmail = (request) =>
  request.headers.get("Cf-Access-Authenticated-User-Email") || null;

export async function onRequest(context) {
  const { request, env } = context;
  const { DB } = env;
  const url = new URL(request.url);
  const parts = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const method = request.method;
  const body = ["POST", "PUT", "PATCH"].includes(method)
    ? await request.json().catch(() => ({}))
    : {};

  try {
    // GET /api/state — full dataset for the client engine
    if (parts[0] === "state" && method === "GET") {
      return json(await getState(DB));
    }

    // /api/golfers
    if (parts[0] === "golfers") {
      if (method === "POST") {
        const { id } = await DB.prepare("INSERT INTO golfers (name, email) VALUES (?, ?)")
          .bind(body.name?.trim(), body.email || null)
          .run()
          .then((r) => ({ id: r.meta.last_row_id }));
        return json({ id });
      }
      if (method === "DELETE" && parts[1]) {
        const id = Number(parts[1]);
        await DB.batch([
          DB.prepare("DELETE FROM scores WHERE golfer_id = ?").bind(id),
          DB.prepare("DELETE FROM league_members WHERE golfer_id = ?").bind(id),
          DB.prepare("DELETE FROM golfers WHERE id = ?").bind(id),
        ]);
        return json({ ok: true });
      }
    }

    // /api/courses
    if (parts[0] === "courses") {
      if (method === "POST" || (method === "PUT" && parts[1])) {
        const courseId = await upsertCourse(DB, method === "PUT" ? Number(parts[1]) : null, body);
        return json({ id: courseId });
      }
      if (method === "DELETE" && parts[1]) {
        const id = Number(parts[1]);
        await DB.batch([
          DB.prepare("DELETE FROM scores WHERE course_id = ?").bind(id),
          DB.prepare("DELETE FROM tees WHERE course_id = ?").bind(id),
          DB.prepare("DELETE FROM courses WHERE id = ?").bind(id),
        ]);
        return json({ ok: true });
      }
    }

    // /api/scores
    if (parts[0] === "scores") {
      if (method === "POST") {
        const r = await DB.prepare(
          `INSERT INTO scores (golfer_id, course_id, tee_id, date, pcc, adjusted_gross, hole_scores, posted_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            body.golferId, body.courseId, body.teeId, body.date, body.pcc || 0,
            body.adjustedGross ?? null,
            body.holeScores ? JSON.stringify(body.holeScores) : null,
            userEmail(request)
          )
          .run();
        return json({ id: r.meta.last_row_id });
      }
      if (method === "DELETE" && parts[1]) {
        await DB.prepare("DELETE FROM scores WHERE id = ?").bind(Number(parts[1])).run();
        return json({ ok: true });
      }
    }

    // /api/leagues  and  /api/leagues/:id/members[/:golferId]
    if (parts[0] === "leagues") {
      if (method === "POST" && !parts[1]) {
        const r = await DB.prepare("INSERT INTO leagues (name) VALUES (?)")
          .bind(body.name?.trim()).run();
        return json({ id: r.meta.last_row_id });
      }
      if (method === "DELETE" && parts[1] && !parts[2]) {
        const id = Number(parts[1]);
        await DB.batch([
          DB.prepare("DELETE FROM league_members WHERE league_id = ?").bind(id),
          DB.prepare("DELETE FROM leagues WHERE id = ?").bind(id),
        ]);
        return json({ ok: true });
      }
      if (parts[2] === "members") {
        const lid = Number(parts[1]);
        if (method === "POST") {
          await DB.prepare(
            "INSERT OR IGNORE INTO league_members (league_id, golfer_id) VALUES (?, ?)"
          ).bind(lid, body.golferId).run();
          return json({ ok: true });
        }
        if (method === "DELETE" && parts[3]) {
          await DB.prepare(
            "DELETE FROM league_members WHERE league_id = ? AND golfer_id = ?"
          ).bind(lid, Number(parts[3])).run();
          return json({ ok: true });
        }
      }
    }

    return json({ error: "Not found", path: url.pathname, method }, 404);
  } catch (err) {
    return json({ error: String(err?.message || err) }, 500);
  }
}

async function upsertCourse(DB, courseId, body) {
  if (courseId) {
    await DB.prepare("UPDATE courses SET name = ? WHERE id = ?").bind(body.name.trim(), courseId).run();
    await DB.prepare("DELETE FROM tees WHERE course_id = ?").bind(courseId).run();
  } else {
    const r = await DB.prepare("INSERT INTO courses (name) VALUES (?)").bind(body.name.trim()).run();
    courseId = r.meta.last_row_id;
  }
  for (const t of body.tees || []) {
    await DB.prepare(
      "INSERT INTO tees (course_id, name, rating, slope, par, holes) VALUES (?, ?, ?, ?, ?, ?)"
    )
      .bind(courseId, t.name, t.rating, t.slope, t.par, t.holes ? JSON.stringify(t.holes) : null)
      .run();
  }
  return courseId;
}

async function getState(DB) {
  const [golfers, courses, tees, scores, leagues, members] = await Promise.all([
    DB.prepare("SELECT id, name, email FROM golfers ORDER BY name").all(),
    DB.prepare("SELECT id, name FROM courses ORDER BY name").all(),
    DB.prepare("SELECT id, course_id, name, rating, slope, par, holes FROM tees").all(),
    DB.prepare("SELECT id, golfer_id, course_id, tee_id, date, pcc, adjusted_gross, hole_scores FROM scores").all(),
    DB.prepare("SELECT id, name FROM leagues ORDER BY name").all(),
    DB.prepare("SELECT league_id, golfer_id FROM league_members").all(),
  ]);

  const teesByCourse = {};
  for (const t of tees.results) {
    (teesByCourse[t.course_id] ||= []).push({
      id: t.id, name: t.name, rating: t.rating, slope: t.slope, par: t.par,
      holes: t.holes ? JSON.parse(t.holes) : null,
    });
  }

  return {
    golfers: golfers.results,
    courses: courses.results.map((c) => ({ ...c, tees: teesByCourse[c.id] || [] })),
    scores: scores.results.map((s) => ({
      id: s.id, golferId: s.golfer_id, courseId: s.course_id, teeId: s.tee_id,
      date: s.date, pcc: s.pcc,
      adjustedGross: s.adjusted_gross,
      holeScores: s.hole_scores ? JSON.parse(s.hole_scores) : null,
    })),
    leagues: leagues.results.map((l) => ({
      ...l,
      golferIds: members.results.filter((m) => m.league_id === l.id).map((m) => m.golfer_id),
    })),
    settings: { allowance: 100 },
  };
}
