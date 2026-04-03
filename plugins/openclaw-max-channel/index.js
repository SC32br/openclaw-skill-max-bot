/**
 * OpenClaw MAX Channel Plugin
 * MAX messenger (max.ru) — long polling inbound, REST outbound
 */

import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import {
  defineChannelPluginEntry,
  createChatChannelPlugin,
  createChannelPluginBase,
} from "openclaw/plugin-sdk/core";
import { dispatchInboundDirectDmWithRuntime } from "openclaw/plugin-sdk/channel-inbound";
import { resolveInboundDirectDmAccessWithRuntime } from "openclaw/plugin-sdk/command-auth";
import { DEFAULT_ACCOUNT_ID } from "openclaw/plugin-sdk/routing";

const MAX_API = "https://platform-api.max.ru";
const execFileAsync = promisify(execFile);

const AUDIO_FILE_RE = /\.(ogg|opus|mp3|m4a|wav|aac|webm|flac)$/i;

/** @param {string | undefined} url */
function extFromUrl(url) {
  if (!url) return "ogg";
  try {
    const p = new URL(url).pathname;
    const m = p.match(/\.([a-z0-9]+)$/i);
    return m ? m[1].toLowerCase() : "ogg";
  } catch {
    return "ogg";
  }
}

/** Pick voice/audio attachments from MAX MessageBody (see max_bot_api Attachment types). */
function collectVoiceLikeAttachments(body) {
  const list = body?.attachments;
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const att of list) {
    const t = String(att?.type || "").toLowerCase();
    const p = att?.payload || {};
    if (t === "audio" || t === "voice") {
      if (p.url || p.token) out.push({ type: t, payload: p });
      continue;
    }
    if (t === "file") {
      const fn = String(p.filename || "");
      if (AUDIO_FILE_RE.test(fn) || /voice|audio|запис/i.test(fn)) {
        if (p.url || p.token) out.push({ type: t, payload: p, filename: fn });
      }
    }
  }
  return out;
}

/**
 * @param {{ url?: string, token?: string }} payload
 * @param {string} botToken
 */
async function downloadMaxMediaPayload(payload, botToken) {
  const { url, token } = payload || {};
  const attempts = [];

  if (url) {
    attempts.push(async () => {
      const r = await fetch(url, { headers: { Authorization: botToken } });
      if (!r.ok) throw new Error(`GET url+auth ${r.status}`);
      return Buffer.from(await r.arrayBuffer());
    });
    attempts.push(async () => {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`GET url ${r.status}`);
      return Buffer.from(await r.arrayBuffer());
    });
  }
  if (token) {
    attempts.push(async () => {
      const u = `${MAX_API}/files/${encodeURIComponent(token)}`;
      const r = await fetch(u, { headers: { Authorization: botToken } });
      if (!r.ok) throw new Error(`GET /files/${token.slice(0, 8)}… ${r.status}`);
      return Buffer.from(await r.arrayBuffer());
    });
  }

  let lastErr = new Error("no url or token in attachment");
  for (const run of attempts) {
    try {
      return await run();
    } catch (e) {
      lastErr = /** @type {Error} */ (e);
    }
  }
  throw lastErr;
}

/**
 * @param {Buffer} buffer
 * @param {string} ext
 * @param {{ whisperBin: string, whisperModel: string, whisperLanguage: string }} opts
 */
async function transcribeWithWhisper(buffer, ext, opts) {
  const safeExt = ext && /^[a-z0-9]+$/i.test(ext) ? ext : "ogg";
  const dir = await mkdtemp(join(tmpdir(), "max-voice-"));
  const baseName = "audio";
  const audioPath = join(dir, `${baseName}.${safeExt}`);
  await writeFile(audioPath, buffer);
  const bin = opts.whisperBin || "whisper";
  const args = [
    audioPath,
    "--model",
    opts.whisperModel || "base",
    "--output_dir",
    dir,
    "--output_format",
    "txt",
    "--fp16",
    "False",
  ];
  const lang = opts.whisperLanguage;
  if (lang && lang !== "auto") {
    args.push("--language", lang);
  }
  await execFileAsync(bin, args, {
    maxBuffer: 32 * 1024 * 1024,
    env: process.env,
    timeout: 15 * 60 * 1000,
  });
  const txtPath = join(dir, `${baseName}.txt`);
  const text = await readFile(txtPath, "utf8");
  await rm(dir, { recursive: true, force: true });
  return text.trim();
}

async function transcribeVoiceAttachmentsFromItems(items, botToken, whisperOpts, log) {
  if (!items.length) return "";
  const parts = [];
  for (const item of items) {
    try {
      const buf = await downloadMaxMediaPayload(item.payload, botToken);
      const ext =
        item.filename && AUDIO_FILE_RE.test(item.filename)
          ? item.filename.replace(/^.*\./, "").toLowerCase()
          : extFromUrl(item.payload.url);
      const t = await transcribeWithWhisper(buf, ext, whisperOpts);
      if (t) parts.push(t);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      log?.warn?.(`[MAX] voice attachment failed: ${msg}`);
      console.warn("[MAX] voice attachment failed:", msg);
    }
  }
  return parts.join("\n\n");
}

// ─── API Client ──────────────────────────────────────────────────────────────

class MaxClient {
  constructor(token) {
    this.token = token;
    this.marker = null;
    this._active = false;
  }

  _headers() {
    return {
      Authorization: this.token,
      "Content-Type": "application/json",
    };
  }

  async _get(path, params = {}) {
    const url = new URL(MAX_API + path);
    for (const [k, v] of Object.entries(params)) {
      if (v != null) url.searchParams.set(k, String(v));
    }
    const res = await fetch(url.toString(), { headers: this._headers() });
    if (!res.ok) throw new Error(`MAX GET ${path} → ${res.status}`);
    return res.json();
  }

  async getMe() {
    return this._get("/me");
  }

  async getUpdates() {
    const params = { limit: 100, timeout: 20, types: "message_created,bot_started" };
    if (this.marker != null) params.marker = this.marker;
    const data = await this._get("/updates", params);
    if (data.marker != null) this.marker = data.marker;
    return data.updates || [];
  }

  async sendMessage(chatId, text) {
    const url = `${MAX_API}/messages?chat_id=${encodeURIComponent(chatId)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: this._headers(),
      body: JSON.stringify({ text: String(text).slice(0, 4096) }),
    });
    if (!res.ok) throw new Error(`MAX sendMessage → ${res.status}`);
    return res.json();
  }

  /**
   * Chat presence / typing (see POST /chats/{chatId}/actions).
   * @param {"typing_on"|"mark_seen"|"sending_photo"|"sending_video"|"sending_audio"|"sending_file"} action
   */
  async sendChatAction(chatId, action) {
    const id = encodeURIComponent(String(chatId));
    const url = `${MAX_API}/chats/${id}/actions`;
    const res = await fetch(url, {
      method: "POST",
      headers: this._headers(),
      body: JSON.stringify({ action }),
    });
    if (!res.ok) throw new Error(`MAX chat action ${action} → ${res.status}`);
    return res.json();
  }

  startPolling(onUpdate) {
    if (this._active) return;
    this._active = true;
    const loop = async () => {
      while (this._active) {
        try {
          const updates = await this.getUpdates();
          for (const upd of updates) {
            try { await onUpdate(upd); } catch (e) {
              console.error("[MAX] onUpdate:", e.message);
            }
          }
        } catch (e) {
          console.error("[MAX] poll:", e.message);
          await new Promise(r => setTimeout(r, 5000));
        }
      }
    };
    loop().catch(e => console.error("[MAX] loop:", e.message));
  }

  stop() { this._active = false; }
}

// ─── Config resolution ───────────────────────────────────────────────────────

function getSection(cfg) {
  return (
    cfg?.plugins?.entries?.["openclaw-max-channel"]?.config?.max ||
    cfg?.channels?.["openclaw-max-channel"] ||
    cfg?.channels?.max ||
    null
  );
}

function resolveAccount(cfg, _accountId) {
  const s = getSection(cfg);
  if (!s?.token) throw new Error("max: token is required");
  return {
    accountId: "default",
    token: s.token,
    allowFrom: (s.allowFrom || []).map(String),
    dmPolicy: s.dmPolicy || "allowlist",
    whisperBin: s.whisperBin || process.env.MAX_WHISPER_BIN || "whisper",
    whisperModel: s.whisperModel || process.env.MAX_WHISPER_MODEL || "base",
    whisperLanguage: s.whisperLanguage || process.env.MAX_WHISPER_LANGUAGE || "ru",
  };
}

/** Required by gateway health/runtime snapshot; was missing and broke listAccountIds for all channels. */
function maxListAccountIds(cfg) {
  const s = getSection(cfg);
  return s?.token ? ["default"] : [];
}

// ─── Channel plugin ──────────────────────────────────────────────────────────

const maxPlugin = createChatChannelPlugin({
  base: createChannelPluginBase({
    id: "openclaw-max-channel",
    capabilities: { nativeCommands: false },
    config: {
      listAccountIds: maxListAccountIds,
      resolveAccount: (cfg, accountId) => resolveAccount(cfg, accountId),
    },
    setup: {
      resolveAccount,
      inspectAccount(cfg, _accountId) {
        const s = getSection(cfg);
        return {
          enabled: Boolean(s?.token),
          configured: Boolean(s?.token),
          tokenStatus: s?.token ? "available" : "missing",
        };
      },
    },
  }),

  security: {
    dm: {
      channelKey: "openclaw-max-channel",
      resolvePolicy: (acc) => acc.dmPolicy,
      resolveAllowFrom: (acc) => acc.allowFrom,
      defaultPolicy: "allowlist",
    },
  },

  threading: { topLevelReplyToMode: "reply" },

  outbound: {
    attachedResults: {
      sendText: async (params) => {
        const chatId = String(params.to).replace(/^openclaw-max-channel:/, "");
        if (!_client) throw new Error("MAX: client not initialized");
        const r = await _client.sendMessage(chatId, params.text);
        return { messageId: r?.message?.mid };
      },
    },
  },
});

// ─── Global client (set in registerFull) ─────────────────────────────────────

let _client = null;
let _registerFullStarted = false;

// ─── Entry point ─────────────────────────────────────────────────────────────

export default defineChannelPluginEntry({
  id: "openclaw-max-channel",
  name: "MAX",
  description: "MAX messenger channel plugin",
  plugin: maxPlugin,

  registerFull(api) {
    if (_registerFullStarted) {
      api.logger?.warn?.("[MAX] registerFull ignored (already active)");
      return;
    }

    let account;
    try {
      account = resolveAccount(api.config);
    } catch (e) {
      console.warn("[MAX] Not configured:", e.message);
      return;
    }

    _registerFullStarted = true;

    const dmRuntime = {
      channel: {
        routing: {
          resolveAgentRoute: api.runtime.channel.routing.resolveAgentRoute,
        },
        session: {
          resolveStorePath: api.runtime.channel.session.resolveStorePath,
          readSessionUpdatedAt: api.runtime.channel.session.readSessionUpdatedAt,
          recordInboundSession: api.runtime.channel.session.recordInboundSession,
        },
        reply: {
          resolveEnvelopeFormatOptions:
            api.runtime.channel.reply.resolveEnvelopeFormatOptions,
          formatAgentEnvelope: api.runtime.channel.reply.formatAgentEnvelope,
          finalizeInboundContext: api.runtime.channel.reply.finalizeInboundContext,
          dispatchReplyWithBufferedBlockDispatcher:
            api.runtime.channel.reply.dispatchReplyWithBufferedBlockDispatcher,
        },
      },
    };

    _client = new MaxClient(account.token);

    _client.getMe().then(me => {
      const line = `[MAX] Connected as @${me.username} (${me.name || me.user_id})`;
      console.log(line);
      api.logger?.info?.(line);
    }).catch(e => {
      console.error("[MAX] getMe:", e.message);
      api.logger?.error?.(`[MAX] getMe: ${e.message}`);
    });

    // Long polling → dispatch inbound messages
    _client.startPolling(async (upd) => {
      const msg = upd.message;
      if (!msg) return;

      const senderId = String(
        msg.sender?.user_id || upd.user?.user_id || ""
      );
      const chatId =
        msg.recipient?.chat_id ||
        upd.chat?.chat_id ||
        senderId;
      const text = String(msg.body?.text || "").trim();
      const senderName = msg.sender?.name || "MAX User";

      if (!senderId || !chatId) return;

      const messageId = String(
        msg.mid ||
          msg.message_id ||
          msg.body?.mid ||
          upd.update_id ||
          `${Date.now()}-${senderId}`
      );

      const chatIdStr = String(chatId);
      const voiceItems = collectVoiceLikeAttachments(msg.body);
      const hasVoice = voiceItems.length > 0;
      if (hasVoice) {
        try {
          await _client.sendChatAction(chatIdStr, "sending_audio");
        } catch (e) {
          api.logger?.debug?.(`[MAX] sending_audio: ${e.message}`);
        }
      }

      const voiceText = await transcribeVoiceAttachmentsFromItems(
        voiceItems,
        account.token,
        {
          whisperBin: account.whisperBin,
          whisperModel: account.whisperModel,
          whisperLanguage: account.whisperLanguage,
        },
        api.logger
      );
      const rawBody = [text, voiceText].filter(Boolean).join("\n\n").trim();
      if (!rawBody) {
        if (hasVoice) {
          try {
            await _client.sendMessage(
              chatId,
              "Не удалось распознать голосовое сообщение. Напишите текстом или попробуйте ещё раз."
            );
          } catch (e) {
            api.logger?.debug?.(`[MAX] voice error reply: ${e.message}`);
          }
        } else {
          api.logger?.debug?.(`[MAX] Skip empty message senderId=${senderId}`);
        }
        return;
      }

      const resolved = await resolveInboundDirectDmAccessWithRuntime({
        cfg: api.config,
        channel: "openclaw-max-channel",
        accountId: DEFAULT_ACCOUNT_ID,
        dmPolicy: account.dmPolicy,
        allowFrom: account.allowFrom,
        senderId,
        rawBody,
        isSenderAllowed: (id, list) =>
          list.map(String).includes(String(id)),
        runtime: {
          shouldComputeCommandAuthorized:
            api.runtime.channel.commands.shouldComputeCommandAuthorized,
          resolveCommandAuthorizedFromAuthorizers:
            api.runtime.channel.commands.resolveCommandAuthorizedFromAuthorizers,
        },
        readStoreAllowFrom: async (provider, accId) =>
          api.runtime.channel.pairing.readAllowFromStore({
            channel: provider,
            accountId: accId,
          }),
      });

      if (resolved.access.decision === "block") {
        console.log(`[MAX] Blocked senderId=${senderId} (${resolved.access.reason})`);
        return;
      }
      if (resolved.access.decision === "pairing") {
        console.log(`[MAX] Pairing required for senderId=${senderId} (set dmPolicy to allowlist/open in plugin config)`);
        return;
      }

      console.log(`[MAX] Inbound from ${senderId}: ${rawBody.slice(0, 80)}`);

      const fireTypingPulse = async () => {
        try {
          await _client.sendChatAction(chatIdStr, "typing_on");
        } catch (e) {
          api.logger?.debug?.(`[MAX] typing_on: ${e.message}`);
        }
      };

      try {
        try {
          await _client.sendChatAction(chatIdStr, "mark_seen");
        } catch (e) {
          api.logger?.debug?.(`[MAX] mark_seen: ${e.message}`);
        }
        await fireTypingPulse();

        const typingEveryMs = 4500;
        const typingTimer = setInterval(fireTypingPulse, typingEveryMs);

        try {
          await dispatchInboundDirectDmWithRuntime({
            cfg: api.config,
            runtime: dmRuntime,
            channel: "openclaw-max-channel",
            channelLabel: "MAX",
            accountId: DEFAULT_ACCOUNT_ID,
            peer: { kind: "direct", id: senderId },
            senderId,
            senderAddress: `openclaw-max-channel:${senderId}`,
            recipientAddress: "openclaw-max-channel:bot",
            conversationLabel: senderName || senderId,
            rawBody,
            messageId,
            timestamp: Date.now(),
            commandAuthorized: resolved.commandAuthorized,
            deliver: async (payload) => {
              const outboundText =
                payload && typeof payload === "object" && "text" in payload
                  ? String(payload.text ?? "")
                  : "";
              if (!outboundText.trim()) return;
              await _client.sendMessage(chatId, outboundText);
            },
            onRecordError: (err) => {
              console.error("[MAX] record inbound session:", err);
            },
            onDispatchError: (err, info) => {
              console.error(`[MAX] reply failed (${info.kind}):`, err);
            },
          });
        } finally {
          clearInterval(typingTimer);
        }
      } catch (e) {
        console.error("[MAX] dispatch:", e.message);
        try {
          await _client.sendMessage(chatId, `⚠️ Error: ${e.message}`);
        } catch {}
      }
    });

    api.on?.("gateway_stop", () => {
      _client?.stop();
      _registerFullStarted = false;
    });

    const activeLine = `[MAX] Plugin active. AllowFrom: ${account.allowFrom.join(", ") || "(none)"}`;
    console.log(activeLine);
    api.logger?.info?.(activeLine);
  },
});
