// ORBIT eşzamanlılık senaryosu (plan 04 §5). Jetonlar test dışında basılır (jetonlar.json).
import http from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";
import { Counter, Trend } from "k6/metrics";

const users = new SharedArray("users", () => JSON.parse(open("./jetonlar.json")));
const BASE = __ENV.API_URL;           // http://127.0.0.1:54321
const ANON = __ENV.ANON_KEY;
const MODE = __ENV.MODE || "mix";     // mix | admin | contention | refused
const SESSION = __ENV.SESSION_ID || "";
const ORG = __ENV.ORG_ID || "";
const OTHER_ORG = __ENV.OTHER_ORG_ID || "";

export const options = {
  scenarios: __ENV.VUS ? {
    sabit: { executor: "constant-vus", vus: Number(__ENV.VUS), duration: __ENV.DUR || "40s", gracefulStop: "5s" },
  } : {
    ramp: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: __ENV.SHORT ? [
        { duration: "15s", target: 10 }, { duration: "30s", target: 10 },
        { duration: "15s", target: 50 }, { duration: "30s", target: 50 },
        { duration: "15s", target: 100 }, { duration: "30s", target: 100 },
        { duration: "10s", target: 0 },
      ] : [
        { duration: "20s", target: 10 }, { duration: "60s", target: 10 },
        { duration: "20s", target: 25 }, { duration: "60s", target: 25 },
        { duration: "20s", target: 50 }, { duration: "60s", target: 50 },
        { duration: "20s", target: 100 }, { duration: "60s", target: 100 },
        { duration: "20s", target: 200 }, { duration: "60s", target: 200 },
        { duration: "15s", target: 0 },
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: { http_req_failed: ["rate<0.5"] },
  summaryTrendStats: ["avg", "med", "p(95)", "p(99)", "max"],
};

const codes = new Counter("http_status");
const st2 = new Counter("status_2xx"), st4 = new Counter("status_4xx"), st5 = new Counter("status_5xx"), st0 = new Counter("status_other");
function tally(r) { if (r.status >= 200 && r.status < 300) st2.add(1); else if (r.status >= 400 && r.status < 500) st4.add(1); else if (r.status >= 500) st5.add(1); else st0.add(1); }
const byRole = {
  admin: new Trend("lat_admin", true), teacher: new Trend("lat_teacher", true),
  student: new Trend("lat_student", true), parent: new Trend("lat_parent", true),
};

function pickUser() {
  if (MODE === "admin") { const a = users.filter(u => u.orbitRole === "admin"); return a[__VU % a.length]; }
  if (MODE === "contention") { const t = users.filter(u => u.orbitRole === "admin" || u.orbitRole === "teacher"); return t[__VU % t.length]; }
  return users[(__VU * 7919 + __ITER) % users.length];
}

function h(tok, extra) { return { headers: Object.assign({ apikey: ANON, Authorization: `Bearer ${tok}`, "Content-Type": "application/json" }, extra || {}), tags: {} }; }

function get(u, path, name) {
  const r = http.get(`${BASE}/rest/v1/${path}`, Object.assign(h(u.token), { tags: { name } }));
  codes.add(1, { code: String(r.status), name }); tally(r);
  byRole[u.orbitRole].add(r.timings.duration);
  check(r, { "2xx": x => x.status >= 200 && x.status < 300 });
  return r;
}
function rpc(u, fn, body, name) {
  const r = http.post(`${BASE}/rest/v1/rpc/${fn}`, JSON.stringify(body), Object.assign(h(u.token), { tags: { name } }));
  codes.add(1, { code: String(r.status), name }); tally(r);
  byRole[u.orbitRole].add(r.timings.duration);
  check(r, { "2xx": x => x.status >= 200 && x.status < 300 });
  return r;
}

export default function () {
  const u = pickUser();
  const org = u.org;
  if (MODE === "refused") {
    // yanlış kuruma ait id'lerle istek yağmuru (reddedilen okuma ucuz mu?)
    get(u, `students?select=id,full_name&organization_id=eq.${OTHER_ORG}&limit=100`, "refused_students");
    get(u, `audit_events?select=id&organization_id=eq.${OTHER_ORG}&limit=100`, "refused_audit");
    sleep(0.2); return;
  }
  if (MODE === "contention") {
    // 20+ VU aynı yoklama oturumuna yazıyor
    const r = get(u, `class_enrollments?select=student_id&class_id=eq.${__ENV.CLASS_ID}&limit=50`, "enrollments");
    let ids = []; try { ids = r.json().map(x => x.student_id); } catch (e) {}
    const status = ["present", "late", "absent", "excused"][__ITER % 4];
    rpc(u, "record_attendance", { target_session_id: SESSION, entries: ids.map(id => ({ student_id: id, status })) }, "record_attendance");
    sleep(0.5); return;
  }
  // mix / admin: Genel Bakış (RPC'ler) → liste → detay → %10 yazma
  if (u.orbitRole === "admin" || u.orbitRole === "teacher") {
    rpc(u, "payment_overview_counts", {}, "overview_payment");
    rpc(u, "report_attendance_weeks", {}, "report_attendance");
    rpc(u, "report_exam_averages", {}, "report_exams");
    const sl = get(u, `students?select=id,full_name,student_number,branch_id&organization_id=eq.${org}&archived_at=is.null&order=full_name&limit=100`, "students_list");
    let sids = []; try { sids = sl.json().map(x => x.id); } catch (e) {}
    rpc(u, "student_attendance_counts", { target_student_ids: sids }, "attendance_counts");
    rpc(u, "student_latest_exam_scores", { target_student_ids: sids }, "latest_scores");
    get(u, `classes?select=id,name,program,capacity&organization_id=eq.${org}&limit=100`, "classes_list");
    get(u, `audit_events?select=id,action,entity_type,created_at,actor_user_id&organization_id=eq.${org}&order=created_at.desc&limit=50`, "audit_list");
  } else {
    // Öğrenci/veli turu — arayüzün attığı sorgu biçimleri (educationQueries): son sınav → o sınavın sonuçları; program; ödevler; akış; (veli) ödeme özeti
    const ex = get(u, `exams?select=id,name,exam_date,max_score,class_id&organization_id=eq.${org}&archived_at=is.null&order=exam_date.desc&limit=1`, "latest_exam");
    let exId = null; try { exId = ex.json()[0]?.id ?? null; } catch (e) {}
    if (exId) get(u, `exam_results?select=id,student_id,score&organization_id=eq.${org}&exam_id=eq.${exId}`, "exam_results_by_exam");
    get(u, `schedule_entries?select=id,day_of_week,starts_at,ends_at,class_id,subject_id,membership_id&organization_id=eq.${org}&archived_at=is.null&limit=1000`, "schedule");
    get(u, `homework_assignments?select=id,title,due_date,class_id,submissions_recorded_at&organization_id=eq.${org}&archived_at=is.null&order=due_date.desc&limit=100`, "homework");
    get(u, `daily_feed_posts?select=id,title,body,class_id,created_at&organization_id=eq.${org}&archived_at=is.null&order=created_at.desc&limit=100`, "feed");
    if (u.orbitRole === "parent") rpc(u, "payment_plan_summaries", {}, "payment_summaries");
  }
  if (__ITER % 10 === 0 && (u.orbitRole === "admin" || u.orbitRole === "teacher") && SESSION) {
    rpc(u, "record_attendance", { target_session_id: SESSION, entries: [] }, "write_attendance_noop");
  }
  sleep(1);
}
