// deploy: v3
// Finalises a call: summarises transcript, stores notes, posts MoM card to chat,
// and emails the MoM document to all participants.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildMomMd = (opts: {
  title: string;
  date: string;
  attendees: string[];
  summary_md: string;
  decisions: string[];
  action_items: { task: string; owner?: string; due?: string }[];
  risks: string[];
  transcript_md: string;
}) => {
  const ai = opts.action_items
    .map((a) => `- [ ] ${a.task}${a.owner ? ` _(owner: ${a.owner})_` : ""}${a.due ? ` _(due: ${a.due})_` : ""}`)
    .join("\n") || "_None._";
  const dec = opts.decisions.map((d) => `- ${d}`).join("\n") || "_None._";
  const rsk = opts.risks.map((r) => `- ${r}`).join("\n") || "_None._";
  const att = opts.attendees.map((a) => `- ${a}`).join("\n") || "_Not recorded._";

  return `# Minutes of Meeting — ${opts.title}

**Date:** ${opts.date}

## Attendees
${att}

## Summary
${opts.summary_md}

## Decisions
${dec}

## Action items
${ai}

## Risks flagged
${rsk}

---

## Full transcript
${opts.transcript_md ? `\n\`\`\`\n${opts.transcript_md.trim()}\n\`\`\`\n` : "_(no transcript captured)_"}
`;
};

const buildMomHtml = (opts: {
  title: string;
  date: string;
  attendees: string[];
  summary_md: string;
  decisions: string[];
  action_items: { task: string; owner?: string; due?: string }[];
  risks: string[];
  download_url?: string;
}) => {
  const ai = opts.action_items.length
    ? `<ul style="margin:0 0 16px;padding-left:18px;color:#3f3f46;font-size:14px;line-height:1.6">${
        opts.action_items
          .map(
            (a) =>
              `<li>${escapeHtml(a.task)}${a.owner ? ` — <span style="color:#71717a">${escapeHtml(a.owner)}</span>` : ""}${a.due ? ` — <span style="color:#71717a">due ${escapeHtml(a.due)}</span>` : ""}</li>`,
          )
          .join("")
      }</ul>`
    : `<p style="margin:0 0 16px;color:#a1a1aa;font-size:14px">No action items.</p>`;
  const dec = opts.decisions.length
    ? `<ul style="margin:0 0 16px;padding-left:18px;color:#3f3f46;font-size:14px;line-height:1.6">${opts.decisions.map((d) => `<li>${escapeHtml(d)}</li>`).join("")}</ul>`
    : `<p style="margin:0 0 16px;color:#a1a1aa;font-size:14px">No decisions logged.</p>`;
  const rsk = opts.risks.length
    ? `<ul style="margin:0 0 0;padding-left:18px;color:#3f3f46;font-size:14px;line-height:1.6">${opts.risks.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>`
    : `<p style="margin:0;color:#a1a1aa;font-size:14px">No risks flagged.</p>`;

  const downloadBtn = opts.download_url
    ? `<p style="margin:24px 0 0"><a href="${opts.download_url}" style="display:inline-block;padding:10px 18px;border-radius:999px;background:#18181b;color:#ffffff;text-decoration:none;font-size:13px;font-weight:500">Download minutes (PDF)</a></p>`
    : "";

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px">
    <div style="background:#ffffff;border:1px solid #e4e4e7;border-radius:16px;padding:32px">
      <p style="margin:0 0 4px;color:#a1a1aa;font-size:11px;text-transform:uppercase;letter-spacing:0.08em">Minutes of meeting</p>
      <h1 style="margin:0 0 4px;color:#18181b;font-size:22px;font-weight:600">${escapeHtml(opts.title)}</h1>
      <p style="margin:0 0 24px;color:#71717a;font-size:13px">${escapeHtml(opts.date)}</p>

      <h2 style="margin:0 0 8px;color:#18181b;font-size:14px;font-weight:600">Summary</h2>
      <div style="margin:0 0 20px;color:#3f3f46;font-size:14px;line-height:1.6;white-space:pre-wrap">${escapeHtml(opts.summary_md)}</div>

      <h2 style="margin:0 0 8px;color:#18181b;font-size:14px;font-weight:600">Decisions</h2>
      ${dec}

      <h2 style="margin:0 0 8px;color:#18181b;font-size:14px;font-weight:600">Action items</h2>
      ${ai}

      <h2 style="margin:0 0 8px;color:#18181b;font-size:14px;font-weight:600">Risks</h2>
      ${rsk}

      ${downloadBtn}
    </div>
    <p style="margin:16px 0 0;color:#a1a1aa;font-size:11px;text-align:center">Sent by Colab Companion · automated meeting recap</p>
  </div>
</body></html>`;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { meeting_id, transcript_md } = await req.json();
    if (!meeting_id) return json({ error: "meeting_id is required" }, 400);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: u } = await userClient.auth.getUser();
    const user = u?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { data: meeting } = await service
      .from("talent_meetings")
      .select("id, project_id, title, scheduled_for")
      .eq("id", meeting_id)
      .maybeSingle();
    if (!meeting) return json({ error: "Meeting not found" }, 404);

    const { data: ok } = await service.rpc("is_talent_project_participant", {
      _project_id: meeting.project_id,
      _user_id: user.id,
    });
    if (!ok) return json({ error: "Forbidden" }, 403);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    // 1. Summarise transcript via tool-call.
    const SYSTEM = `You are an AI notetaker. Given a meeting transcript, produce a tight summary,
clear action items (with owner if mentioned), decisions made, and risks flagged. Be concrete; avoid filler.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: `MEETING: ${meeting.title}\n\nTRANSCRIPT:\n${transcript_md || "(empty)"}\n\nReturn the structured notes via the tool call.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "meeting_notes",
              parameters: {
                type: "object",
                properties: {
                  summary_md: { type: "string", description: "Markdown summary, 2-5 bullets." },
                  action_items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        task: { type: "string" },
                        owner: { type: "string" },
                        due: { type: "string" },
                      },
                      required: ["task"],
                    },
                  },
                  decisions: { type: "array", items: { type: "string" } },
                  risks: { type: "array", items: { type: "string" } },
                },
                required: ["summary_md", "action_items", "decisions", "risks"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "meeting_notes" } },
      }),
    });
    if (resp.status === 429) return json({ error: "Rate limited" }, 429);
    if (resp.status === 402) return json({ error: "AI credits exhausted" }, 402);
    if (!resp.ok) {
      const t = await resp.text();
      console.error("[talent-finalize-call] AI error", resp.status, t);
      return json({ error: "AI gateway error" }, 502);
    }
    const data = await resp.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : null;
    if (!parsed) return json({ error: "Could not summarise" }, 500);

    // 2. Persist notes.
    const { data: note, error: nErr } = await service
      .from("talent_call_notes")
      .insert({
        meeting_id,
        project_id: meeting.project_id,
        transcript_md: transcript_md || null,
        summary_md: parsed.summary_md,
        action_items: parsed.action_items ?? [],
        decisions: parsed.decisions ?? [],
        risks: parsed.risks ?? [],
      })
      .select("id")
      .single();
    if (nErr) return json({ error: nErr.message }, 400);

    await service
      .from("talent_meetings")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", meeting_id);

    // 3. Resolve project + ALL participants (owner, assigned freelancer,
    //    curated team assignees, anyone who chatted in the project).
    const { data: project } = await service
      .from("talent_projects")
      .select("title, user_id, assigned_freelancer_id, team_composition")
      .eq("id", meeting.project_id)
      .maybeSingle();

    const teamAssignees: string[] =
      (project?.team_composition as any)?.roles
        ?.map((r: any) => r?.assignee?.user_id)
        ?.filter(Boolean) ?? [];

    const { data: chatPosters } = await service
      .from("talent_messages")
      .select("user_id")
      .eq("project_id", meeting.project_id)
      .neq("role", "ai")
      .neq("role", "system")
      .not("user_id", "is", null);

    const participantIds = Array.from(
      new Set(
        [
          project?.user_id,
          project?.assigned_freelancer_id,
          ...teamAssignees,
          ...((chatPosters ?? []).map((c: any) => c.user_id)),
        ].filter(Boolean) as string[],
      ),
    );

    // Pull emails + names from profiles.
    let recipients: { id: string; email: string; name?: string }[] = [];
    if (participantIds.length > 0) {
      const { data: profiles } = await service
        .from("profiles")
        .select("id, email, full_name")
        .in("id", participantIds);
      recipients = (profiles ?? [])
        .filter((p: any) => p.email)
        .map((p: any) => ({ id: p.id, email: p.email, name: p.full_name || undefined }));
    }

    // 4. Build the MoM Markdown document and upload it.
    const meetingDate = new Date(meeting.scheduled_for || Date.now()).toLocaleString();
    const attendeeNames = recipients.map((r) => r.name || r.email);

    const momMd = buildMomMd({
      title: project?.title || meeting.title || "Working session",
      date: meetingDate,
      attendees: attendeeNames,
      summary_md: parsed.summary_md,
      decisions: parsed.decisions ?? [],
      action_items: parsed.action_items ?? [],
      risks: parsed.risks ?? [],
      transcript_md: transcript_md || "",
    });

    const filename = `MoM-${(project?.title || "session").replace(/[^a-z0-9-_ ]/gi, "_").slice(0, 40)}-${meeting_id.slice(0, 8)}.md`;
    const storagePath = `${project?.user_id || user.id}/talent-mom/${meeting_id}.md`;

    let downloadUrl: string | null = null;
    try {
      const { error: upErr } = await service.storage
        .from("design-assets")
        .upload(storagePath, new Blob([momMd], { type: "text/markdown" }), {
          contentType: "text/markdown",
          upsert: true,
        });
      if (upErr) console.warn("[talent-finalize-call] upload error", upErr.message);
      const { data: urlData } = service.storage.from("design-assets").getPublicUrl(storagePath);
      downloadUrl = urlData.publicUrl;
    } catch (e) {
      console.warn("[talent-finalize-call] upload exception", e);
    }

    // 5. Post chat summary (existing kind) + MoM document card (new kind).
    await service.from("talent_messages").insert({
      project_id: meeting.project_id,
      user_id: user.id,
      role: "ai",
      kind: "ai_note",
      content: parsed.summary_md,
      metadata: {
        meeting_id,
        note_id: note?.id,
        action_items: parsed.action_items ?? [],
        decisions: parsed.decisions ?? [],
        risks: parsed.risks ?? [],
      },
    });

    const emailedTo = recipients.map((r) => r.email);
    const rumiEmail = Deno.env.get("RUMI_NOTIFICATIONS_EMAIL") || null;

    if (downloadUrl) {
      await service.from("talent_messages").insert({
        project_id: meeting.project_id,
        user_id: user.id,
        role: "ai",
        kind: "mom_document",
        content: `Minutes of meeting — ${project?.title || meeting.title || "Session"}`,
        metadata: {
          meeting_id,
          note_id: note?.id,
          url: downloadUrl,
          filename,
          summary_md: parsed.summary_md,
          emailed_to: emailedTo,
          cc_rumi: !!rumiEmail,
        },
      });
    }

    // 6. Email all participants via Lovable Emails (queued, idempotent).
    const rumiCcEmail = rumiEmail;
    const templateData = {
      project_title: project?.title || meeting.title || "Working session",
      meeting_date: meetingDate,
      attendees: attendeeNames,
      summary_md: parsed.summary_md,
      decisions: parsed.decisions ?? [],
      action_items: parsed.action_items ?? [],
      risks: parsed.risks ?? [],
      download_url: downloadUrl ?? undefined,
      cc_rumi: !!rumiCcEmail,
    };

    await Promise.all(
      recipients.map((r) =>
        service.functions
          .invoke("send-transactional-email", {
            body: {
              templateName: "meeting-mom",
              recipientEmail: r.email,
              idempotencyKey: `mom-${meeting_id}-${r.email}`,
              templateData: { ...templateData, recipient_name: r.name },
            },
          })
          .catch((e: unknown) =>
            console.warn("[talent-finalize-call] send error", e),
          ),
      ),
    );

    // CC RUMI as a separate send (Lovable Emails = 1 recipient per send).
    if (rumiCcEmail) {
      await service.functions
        .invoke("send-transactional-email", {
          body: {
            templateName: "meeting-mom",
            recipientEmail: rumiCcEmail,
            idempotencyKey: `mom-${meeting_id}-rumi`,
            templateData: { ...templateData, recipient_name: "RUMi" },
          },
        })
        .catch((e: unknown) =>
          console.warn("[talent-finalize-call] rumi cc error", e),
        );
    }

    return json({
      success: true,
      note_id: note?.id,
      summary: parsed,
      mom_url: downloadUrl,
      emailed: recipients.length,
    });
  } catch (e) {
    console.error("[talent-finalize-call]", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});
