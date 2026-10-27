// Edge Function: thong-bao-thach-dau
// Trigger _bao_thach_dau gọi hàm này khi có lời thách mới; hàm gửi Web Push tới mọi máy của người được thách.
// Tự kiểm tra header x-hook-secret (so với Vault), nên tắt verify_jwt.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
const GAME = "https://miquangbk.com/";
const DIFF: Record<string, string> = { thuong: "Thường", kho: "Khó", dianguc: "Địa ngục", bk: "Bách Khoa" };
const MODE: Record<string, string> = { sinh_ton: "Sinh tồn", diem: "Điểm cao" };
let cfg: { pub: string; priv: string; hook: string } | null = null;

async function config() {
  if (cfg) return cfg;
  const { data, error } = await sb.rpc("_push_cau_hinh");
  if (error) throw error;
  if (!data?.pub || !data?.priv || !data?.hook) throw new Error("Thiếu khoá trong Vault");
  webpush.setVapidDetails(GAME, data.pub, data.priv);
  cfg = data;
  return cfg!;
}
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  try {
    const c = await config();
    if (req.headers.get("x-hook-secret") !== c.hook) return json({ error: "forbidden" }, 403);
    const { id } = await req.json();
    const { data: t } = await sb.from("thach_dau").select("id,a,b,do_kho,che_do,trang_thai,het_han").eq("id", id).maybeSingle();
    if (!t || t.trang_thai !== "cho") return json({ sent: 0, why: "khong_con_cho" });
    const ttl = Math.max(5, Math.floor((new Date(t.het_han).getTime() - Date.now()) / 1000));
    const { data: a } = await sb.from("profiles").select("ten,lop,elo").eq("id", t.a).maybeSingle();
    const { data: subs } = await sb.from("push_sub").select("id,endpoint,p256dh,auth").eq("user_id", t.b);
    const payload = JSON.stringify({
      title: `${a?.ten ?? "Một bạn"} đang thách đấu bạn!`,
      body: `${a?.lop ? a.lop + " · " : ""}Elo ${a?.elo ?? "—"} · ${DIFF[t.do_kho]} · ${MODE[t.che_do]}. Bấm để mở game và trả lời trong 60 giây.`,
      tag: `thach-${t.id}`,
      url: `${GAME}?thach=${t.id}`,
      id: t.id,
      het_han: t.het_han,
    });
    let sent = 0;
    await Promise.all((subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload,
          { TTL: ttl, urgency: "high", topic: `thach${t.id}` });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await sb.from("push_sub").delete().eq("id", s.id); // máy đã huỷ đăng ký
        else console.error("push loi", code, String(e));
      }
    }));
    return json({ sent, total: subs?.length ?? 0 });
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});
