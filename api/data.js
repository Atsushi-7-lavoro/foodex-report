// FOODEX 2026 データAPI
// Supabase: ANANAS Japan (bmamhlvdvwzbrppmhzrz) / foodex_* テーブル
// service_role キーはサーバー側のみで使う。3テーブルは RLS 有効・ポリシー無しなので
// ブラウザから anon キーで直接叩くことはできない（= 名刺の個人情報が露出しない）。
const T = { cards: "foodex_cards", gallery: "foodex_gallery", reports: "foodex_reports" };
const DEFAULT_RID = "foodex-2026";

export default async function handler(req, res) {
  const SB = process.env.SUPABASE_URL, SK = process.env.SUPABASE_SERVICE_KEY;
  if (!SB || !SK) return res.status(500).json({ error: "Supabase not configured" });
  const hd = { apikey: SK, Authorization: "Bearer " + SK, "Content-Type": "application/json" };

  async function sb(path, method, body, extra) {
    const o = { method: method, headers: Object.assign({}, hd, extra || {}) };
    if (body) o.body = JSON.stringify(body);
    const r = await fetch(SB + "/rest/v1/" + path, o);
    const txt = await r.text();
    if (!r.ok) throw new Error(txt || "HTTP " + r.status);
    if (!txt) return null;
    try { return JSON.parse(txt); } catch (e) { return null; }
  }

  try {
    if (req.method === "GET") {
      const rid = encodeURIComponent(req.query.report_id || DEFAULT_RID);
      const kind = req.query.kind || "all";

      if (kind === "cards") {
        const cards = await sb(T.cards + "?report_id=eq." + rid + "&select=*&order=sort_order.asc", "GET");
        return res.status(200).json({ cards: cards || [] });
      }
      // 画像は base64 で重いので必ずページングして返す（レスポンス上限を超えないため）
      if (kind === "gallery") {
        const offset = parseInt(req.query.offset || "0", 10) || 0;
        const limit = Math.min(parseInt(req.query.limit || "6", 10) || 6, 20);
        const gallery = await sb(T.gallery + "?report_id=eq." + rid + "&select=*&order=sort_order.asc&offset=" + offset + "&limit=" + limit, "GET");
        return res.status(200).json({ gallery: gallery || [] });
      }
      const rep = await sb(T.reports + "?id=eq." + rid + "&select=*", "GET");
      return res.status(200).json({ report: (rep && rep[0]) || null });
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const action = body.action, kind = body.kind === "gallery" ? "gallery" : "cards";
      const ridRaw = body.report_id || DEFAULT_RID;
      const rid = encodeURIComponent(ridRaw);
      const tbl = T[kind];

      await sb(T.reports, "POST", [{ id: ridRaw }], { Prefer: "resolution=ignore-duplicates,return=minimal" });

      // chunk: 送られてきた分だけを upsert する。先に消さないので途中で失敗しても既存データは残る。
      if (action === "chunk") {
        const rows = (body.rows || []).map(function (r) { return Object.assign({}, r, { report_id: ridRaw }); });
        if (rows.length) {
          await sb(tbl + "?on_conflict=report_id,sort_order", "POST", rows, { Prefer: "resolution=merge-duplicates,return=minimal" });
        }
        return res.status(200).json({ ok: true, saved: rows.length });
      }

      // end: 全チャンク送信後に余った末尾行を削除して件数を確定させる
      if (action === "end") {
        const count = parseInt(body.count, 10) || 0;
        await sb(tbl + "?report_id=eq." + rid + "&sort_order=gte." + count, "DELETE");
        const col = kind === "gallery" ? "gallery_count" : "card_count";
        const patch = { updated_at: new Date().toISOString() };
        patch[col] = count;
        await sb(T.reports + "?id=eq." + rid, "PATCH", patch);
        return res.status(200).json({ ok: true, count: count });
      }

      return res.status(400).json({ error: "Unknown action: " + action });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("data api error:", e);
    return res.status(500).json({ error: (e && e.message) || String(e) });
  }
}
