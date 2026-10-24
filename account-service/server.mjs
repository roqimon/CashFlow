import http from 'node:http';
import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import pg from 'pg';
import nodemailer from 'nodemailer';

const { Pool } = pg;
const scrypt = promisify(scryptCallback);
const PORT = Number(process.env.PORT || 3001);
const APP_ORIGIN = new URL(process.env.APP_ORIGIN || 'https://kas.bisabaca.web.id').origin;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL wajib diatur untuk layanan akun CashFlow.');
if (process.env.NODE_ENV === 'production' && new URL(APP_ORIGIN).protocol !== 'https:') throw new Error('APP_ORIGIN produksi harus memakai HTTPS.');
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_BODY = 12 * 1024 * 1024;
const MAX_BATCH = 20000;
const DOCUMENT_KEYS = new Set([
  'aruskas_shortcuts_v3_fixed', 'aruskas_catmem_v1', 'aruskas_titlemem_v1',
  'aruskas_deleted_categories_v1', 'aruskas_category_records_v1',
  'aruskas_budget_pockets_v1', 'aruskas_budget_transfers_v1',
  'aruskas_free_balance_adjustments_v1', 'aruskas_savings_goals_v1',
  'aruskas_share_wa_prefs_v1', 'aruskas_add_action_v1', 'aruskas_pocket_order_v1',
  'aruskas_st_sessions_v1', 'aruskas_st_mode', 'aruskas_payday_date_v1',
  'aruskas_receipt_destination'
]);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 8, idleTimeoutMillis: 30000 });
let mailer;
const SECURE_COOKIE = new URL(APP_ORIGIN).protocol === 'https:';

const sha256 = value => createHash('sha256').update(String(value)).digest('hex');
const opaqueToken = () => randomBytes(32).toString('base64url');
const tokenHash = token => sha256(token);
const emailOk = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
const json = (res, status, data, extra = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra });
  res.end(JSON.stringify(data));
};

function cookieOptions() {
  return `Path=/; HttpOnly;${SECURE_COOKIE ? ' Secure;' : ''} SameSite=Lax; Max-Age=${Math.floor(SESSION_MS / 1000)}`;
}
function setSession(res, token) { res.setHeader('Set-Cookie', `aruskas_session=${token}; ${cookieOptions()}`); }
function clearSession(res) { res.setHeader('Set-Cookie', `aruskas_session=; Path=/; HttpOnly;${SECURE_COOKIE ? ' Secure;' : ''} SameSite=Lax; Max-Age=0`); }
function requestToken(req) {
  const part = String(req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('aruskas_session='));
  return part ? part.slice('aruskas_session='.length) : '';
}
async function bodyJson(req) {
  let raw = '', size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw Object.assign(new Error('Permintaan terlalu besar.'), { status: 413 });
    raw += chunk;
  }
  try { return JSON.parse(raw || '{}'); }
  catch { throw Object.assign(new Error('Format data tidak valid.'), { status: 400 }); }
}
function sendError(res, error) {
  const status = Number(error?.status) || 500;
  if (status >= 500) console.error('[CashFlow account]', error?.code || error?.message || 'internal_error');
  json(res, status, { error: status >= 500 ? 'Layanan akun sedang mengalami gangguan. Coba lagi nanti.' : error.message });
}
async function passwordHash(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$16384$8$1$${salt}$${Buffer.from(key).toString('hex')}`;
}
async function passwordMatches(password, stored) {
  const [kind, n, r, p, salt, expectedHex] = String(stored || '').split('$');
  if (kind !== 'scrypt' || !salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, 'hex');
  const actual = Buffer.from(await scrypt(password, salt, expected.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024 }));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
function configuredMailer() {
  if (mailer) return mailer;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD || !process.env.SMTP_FROM) {
    throw Object.assign(new Error('Email belum dikonfigurasi di server.'), { status: 503 });
  }
  mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    connectionTimeout: 10000,
    socketTimeout: 15000
  });
  return mailer;
}
async function sendAccountLink(email, token, purpose) {
  const url = new URL('/', APP_ORIGIN);
  url.searchParams.set('account_token', token);
  url.searchParams.set('account_action', purpose);
  const instruction = purpose === 'verify_email' ? 'Verifikasi alamat email akun ArusKas' : 'Atur ulang kata sandi ArusKas';
  await configuredMailer().sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: instruction,
    text: `${instruction}: ${url.toString()}\nTautan berlaku selama satu jam. Jika Anda tidak meminta ini, abaikan email ini.`,
    html: `<p>${instruction}.</p><p><a href="${url.toString()}">Lanjutkan</a></p><p>Tautan berlaku selama satu jam. Jika Anda tidak meminta ini, abaikan email ini.</p>`
  });
}
async function limitRequest(req, purpose, email = '') {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
  const subjects = [sha256(`${purpose}:ip:${ip}`)];
  if (email) subjects.push(sha256(`${purpose}:email:${email}`));
  const cutoff = new Date(Date.now() - 60 * 60 * 1000);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM cashflow_auth_attempts WHERE attempted_at < $1', [cutoff]);
    for (const subject of subjects) {
      const count = await client.query('SELECT count(*)::int AS n FROM cashflow_auth_attempts WHERE subject_hash = $1 AND attempted_at >= $2', [subject, cutoff]);
      if (count.rows[0].n >= (purpose === 'login' ? 20 : 5)) {
        await client.query('ROLLBACK');
        return false;
      }
    }
    for (const subject of subjects) await client.query('INSERT INTO cashflow_auth_attempts(subject_hash) VALUES ($1)', [subject]);
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { client.release(); }
}
async function currentAccount(req) {
  const token = requestToken(req);
  if (!token || token.length > 100) return null;
  const { rows } = await pool.query(
    `SELECT a.id, a.email FROM cashflow_sessions s
     JOIN cashflow_accounts a ON a.id = s.account_id
     WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now() AND a.email_verified_at IS NOT NULL`,
    [tokenHash(token)]
  );
  return rows[0] || null;
}
function requireSameOrigin(req) {
  if (req.headers.origin !== APP_ORIGIN) throw Object.assign(new Error('Asal permintaan tidak valid.'), { status: 403 });
}
function validateTransaction(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const id = String(raw.id || '');
  const title = String(raw.title || '');
  const amount = Number(raw.amount);
  if (!id || id.length > 120 || !title || title.length > 300 || !Number.isSafeInteger(amount) || amount < 0 || !['income', 'expense'].includes(raw.type)) return null;
  const payload = JSON.stringify(raw);
  if (payload.length > 32000) return null;
  const updatedAt = raw.updatedAt ? new Date(raw.updatedAt) : null;
  if (updatedAt && !Number.isFinite(updatedAt.getTime())) return null;
  if (updatedAt && updatedAt.getTime() > Date.now() + 5 * 60 * 1000) return null;
  return { id, payload: JSON.parse(payload), updatedAt: updatedAt?.toISOString() || null };
}
const DUMMY_PASSWORD_HASH = await passwordHash('cashflow-invalid-account-password');
async function syncGet(accountId, res) {
  const { rows } = await pool.query(
    `SELECT transaction_id, payload, is_deleted, client_updated_at, revision
     FROM cashflow_transactions WHERE account_id = $1 ORDER BY server_updated_at DESC LIMIT 50000`, [accountId]
  );
  const docs = await pool.query(
    `SELECT document_key, payload, is_deleted, client_updated_at, revision
     FROM cashflow_documents WHERE account_id = $1 ORDER BY document_key`, [accountId]
  );
  json(res, 200, {
    transactions: rows.filter(row => !row.is_deleted).map(row => ({ id: row.transaction_id, transaction: row.payload, revision: Number(row.revision), updatedAt: row.client_updated_at?.toISOString() || null })),
    deletedIds: rows.filter(row => row.is_deleted).map(row => row.transaction_id),
    documents: docs.rows.filter(row => !row.is_deleted).map(row => ({ key: row.document_key, value: row.payload, revision: Number(row.revision), updatedAt: row.client_updated_at?.toISOString() || null })),
    deletedDocumentKeys: docs.rows.filter(row => row.is_deleted).map(row => row.document_key)
  });
}
async function syncPost(accountId, data, res) {
  const incoming = Array.isArray(data.transactions) ? data.transactions : [];
  const deletedIds = Array.isArray(data.deletedIds) ? data.deletedIds : [];
  const documents = Array.isArray(data.documents) ? data.documents : [];
  const deletedDocumentKeys = Array.isArray(data.deletedDocumentKeys) ? data.deletedDocumentKeys : [];
  if (incoming.length > MAX_BATCH || deletedIds.length > MAX_BATCH) throw Object.assign(new Error(`Maksimal ${MAX_BATCH} transaksi per sinkronisasi.`), { status: 413 });
  if (documents.length > DOCUMENT_KEYS.size || deletedDocumentKeys.length > DOCUMENT_KEYS.size) throw Object.assign(new Error('Jumlah data akun tidak valid.'), { status: 413 });
  const records = incoming.map(validateTransaction);
  if (records.some(item => !item)) throw Object.assign(new Error('Ada transaksi dengan format yang tidak valid.'), { status: 400 });
  if (deletedIds.some(id => typeof id !== 'string' || !id || id.length > 120)) throw Object.assign(new Error('ID transaksi yang dihapus tidak valid.'), { status: 400 });
  if (documents.some(doc => !doc || !DOCUMENT_KEYS.has(doc.key) || JSON.stringify(doc.value).length > 256000 || (doc.updatedAt && !Number.isFinite(new Date(doc.updatedAt).getTime())))) throw Object.assign(new Error('Ada pengaturan akun dengan format yang tidak valid.'), { status: 400 });
  if (deletedDocumentKeys.some(key => !DOCUMENT_KEYS.has(key))) throw Object.assign(new Error('Kunci data akun yang dihapus tidak valid.'), { status: 400 });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const row of records) {
      await client.query(
        `INSERT INTO cashflow_transactions(account_id, transaction_id, payload, client_updated_at)
         VALUES ($1, $2, $3::jsonb, $4)
         ON CONFLICT (account_id, transaction_id) DO UPDATE SET
           payload = EXCLUDED.payload,
           client_updated_at = EXCLUDED.client_updated_at,
           server_updated_at = now(), revision = cashflow_transactions.revision + 1
         WHERE cashflow_transactions.is_deleted = false
           AND cashflow_transactions.payload IS DISTINCT FROM EXCLUDED.payload
           AND EXCLUDED.client_updated_at IS NOT NULL
           AND (cashflow_transactions.client_updated_at IS NULL OR EXCLUDED.client_updated_at >= cashflow_transactions.client_updated_at)`,
        [accountId, row.id, JSON.stringify(row.payload), row.updatedAt]
      );
    }
    if (deletedIds.length) {
      await client.query(
        `INSERT INTO cashflow_transactions(account_id, transaction_id, payload, is_deleted)
         SELECT $1, ids.id, NULL, true FROM unnest($2::text[]) AS ids(id)
         ON CONFLICT (account_id, transaction_id) DO UPDATE SET payload = NULL, is_deleted = true,
           client_updated_at = NULL, server_updated_at = now(), revision = cashflow_transactions.revision + 1
         WHERE cashflow_transactions.is_deleted = false`, [accountId, [...new Set(deletedIds)]]
      );
    }
    for (const doc of documents) {
      await client.query(
        `INSERT INTO cashflow_documents(account_id, document_key, payload, client_updated_at)
         VALUES ($1, $2, $3::jsonb, $4)
         ON CONFLICT (account_id, document_key) DO UPDATE SET payload = EXCLUDED.payload,
           is_deleted = false, client_updated_at = EXCLUDED.client_updated_at,
           server_updated_at = now(), revision = cashflow_documents.revision + 1
         WHERE cashflow_documents.payload IS DISTINCT FROM EXCLUDED.payload
           AND EXCLUDED.client_updated_at IS NOT NULL
           AND (cashflow_documents.client_updated_at IS NULL OR EXCLUDED.client_updated_at >= cashflow_documents.client_updated_at)`,
        [accountId, doc.key, JSON.stringify(doc.value), doc.updatedAt || null]
      );
    }
    if (deletedDocumentKeys.length) {
      await client.query(
        `INSERT INTO cashflow_documents(account_id, document_key, payload, is_deleted)
         SELECT $1, ids.id, NULL, true FROM unnest($2::text[]) AS ids(id)
         ON CONFLICT (account_id, document_key) DO UPDATE SET payload = NULL, is_deleted = true,
           client_updated_at = NULL, server_updated_at = now(), revision = cashflow_documents.revision + 1
         WHERE cashflow_documents.is_deleted = false`, [accountId, [...new Set(deletedDocumentKeys)]]
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { client.release(); }
  await syncGet(accountId, res);
}

async function handle(req, res) {
  const url = new URL(req.url, APP_ORIGIN);
  if (url.pathname === '/health') return json(res, 200, { ok: true, service: 'cashflow-account' });
  if (!url.pathname.startsWith('/api/account/')) return json(res, 404, { error: 'Rute tidak ditemukan.' });
  const route = url.pathname.slice('/api/account/'.length);
  try {
    if (req.method === 'POST') requireSameOrigin(req);
    if (route === 'sync') {
      const account = await currentAccount(req);
      if (!account) return json(res, 401, { error: 'Silakan masuk kembali.' });
      if (req.method === 'GET') return await syncGet(account.id, res);
      if (req.method === 'POST') return await syncPost(account.id, await bodyJson(req), res);
      return json(res, 405, { error: 'Metode tidak didukung.' });
    }
    if (req.method !== 'POST') return json(res, 405, { error: 'Metode tidak didukung.' });
    const data = await bodyJson(req);
    if (route === 'signup') {
      const email = String(data.email || '').trim().toLowerCase();
      const password = String(data.password || '');
      if (!emailOk(email) || password.length < 10 || password.length > 128) return json(res, 400, { error: 'Gunakan email valid dan kata sandi 10–128 karakter.' });
      if (!await limitRequest(req, 'signup', email)) return json(res, 429, { error: 'Terlalu banyak permintaan. Coba lagi nanti.' });
      configuredMailer();
      const id = randomUUID();
      const result = await pool.query('INSERT INTO cashflow_accounts(id, email, password_hash) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING id', [id, email, await passwordHash(password)]);
      if (result.rowCount) {
        const token = opaqueToken();
        await pool.query("INSERT INTO cashflow_auth_tokens(token_hash, account_id, purpose, expires_at) VALUES ($1, $2, 'verify_email', now() + interval '1 hour')", [tokenHash(token), id]);
        try { await sendAccountLink(email, token, 'verify_email'); }
        catch (error) { await pool.query('DELETE FROM cashflow_accounts WHERE id = $1', [id]); throw error; }
      }
      return json(res, 200, { message: 'Jika alamat dapat didaftarkan, tautan verifikasi akan dikirim ke email.' });
    }
    if (route === 'resend-verification') {
      const email = String(data.email || '').trim().toLowerCase();
      if (!emailOk(email)) return json(res, 200, { message: 'Jika akun menunggu verifikasi, tautan akan dikirim ke email.' });
      if (!await limitRequest(req, 'verify_email', email)) return json(res, 429, { error: 'Terlalu banyak permintaan. Coba lagi nanti.' });
      const { rows } = await pool.query('SELECT id FROM cashflow_accounts WHERE lower(email) = $1 AND email_verified_at IS NULL LIMIT 1', [email]);
      if (rows[0]) {
        const token = opaqueToken();
        await pool.query("INSERT INTO cashflow_auth_tokens(token_hash, account_id, purpose, expires_at) VALUES ($1, $2, 'verify_email', now() + interval '1 hour')", [tokenHash(token), rows[0].id]);
        await sendAccountLink(email, token, 'verify_email');
      }
      return json(res, 200, { message: 'Jika akun menunggu verifikasi, tautan akan dikirim ke email.' });
    }
    if (route === 'login') {
      const email = String(data.email || '').trim().toLowerCase();
      const password = String(data.password || '');
      if (password.length > 128) return json(res, 401, { error: 'Email atau kata sandi tidak cocok.' });
      if (!await limitRequest(req, 'login', email.slice(0, 254))) return json(res, 429, { error: 'Terlalu banyak percobaan masuk. Coba lagi nanti.' });
      const { rows } = await pool.query('SELECT id, email, password_hash, email_verified_at FROM cashflow_accounts WHERE lower(email) = $1 LIMIT 1', [email]);
      const account = rows[0];
      const matches = await passwordMatches(password, account?.password_hash || DUMMY_PASSWORD_HASH);
      if (!account || !matches) return json(res, 401, { error: 'Email atau kata sandi tidak cocok.' });
      if (!account.email_verified_at) return json(res, 403, { error: 'Verifikasi email terlebih dahulu dari tautan yang kami kirim.' });
      const token = opaqueToken();
      await pool.query('INSERT INTO cashflow_sessions(token_hash, account_id, expires_at) VALUES ($1, $2, now() + interval \'30 days\')', [tokenHash(token), account.id]);
      setSession(res, token);
      return json(res, 200, { authenticated: true, id: account.id, email: account.email });
    }
    if (route === 'check') {
      const account = await currentAccount(req);
      return json(res, 200, account ? { authenticated: true, ...account } : { authenticated: false });
    }
    if (route === 'verify') {
      const hash = tokenHash(String(data.token || ''));
      const result = await pool.query(
        `UPDATE cashflow_auth_tokens SET consumed_at = now() WHERE token_hash = $1 AND purpose = 'verify_email' AND consumed_at IS NULL AND expires_at > now() RETURNING account_id`, [hash]
      );
      if (!result.rowCount) return json(res, 400, { error: 'Tautan verifikasi tidak valid atau sudah kedaluwarsa.' });
      await pool.query('UPDATE cashflow_accounts SET email_verified_at = now() WHERE id = $1', [result.rows[0].account_id]);
      return json(res, 200, { message: 'Email terverifikasi. Silakan masuk.' });
    }
    if (route === 'recover') {
      const email = String(data.email || '').trim().toLowerCase();
      if (!emailOk(email)) return json(res, 200, { message: 'Jika akun ditemukan, tautan pemulihan akan dikirim.' });
      if (!await limitRequest(req, 'recover', email)) return json(res, 429, { error: 'Terlalu banyak permintaan. Coba lagi nanti.' });
      const { rows } = await pool.query('SELECT id FROM cashflow_accounts WHERE lower(email) = $1', [email]);
      if (rows[0]) {
        const token = opaqueToken();
        await pool.query("INSERT INTO cashflow_auth_tokens(token_hash, account_id, purpose, expires_at) VALUES ($1, $2, 'reset_password', now() + interval '1 hour')", [tokenHash(token), rows[0].id]);
        await sendAccountLink(email, token, 'reset_password');
      }
      return json(res, 200, { message: 'Jika akun ditemukan, tautan pemulihan akan dikirim.' });
    }
    if (route === 'reset') {
      const password = String(data.password || '');
      if (password.length < 10 || password.length > 128) return json(res, 400, { error: 'Kata sandi baru harus 10–128 karakter.' });
      const client = await pool.connect();
      let accountId;
      try {
        await client.query('BEGIN');
        const used = await client.query("UPDATE cashflow_auth_tokens SET consumed_at = now() WHERE token_hash = $1 AND purpose = 'reset_password' AND consumed_at IS NULL AND expires_at > now() RETURNING account_id", [tokenHash(String(data.token || ''))]);
        if (!used.rowCount) { await client.query('ROLLBACK'); return json(res, 400, { error: 'Tautan pemulihan tidak valid atau sudah kedaluwarsa.' }); }
        accountId = used.rows[0].account_id;
        await client.query('UPDATE cashflow_accounts SET password_hash = $2 WHERE id = $1', [accountId, await passwordHash(password)]);
        await client.query('UPDATE cashflow_sessions SET revoked_at = now() WHERE account_id = $1 AND revoked_at IS NULL', [accountId]);
        await client.query('COMMIT');
      } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
      finally { client.release(); }
      return json(res, 200, { message: 'Kata sandi diperbarui. Silakan masuk kembali.' });
    }
    if (route === 'logout' || route === 'logout-all') {
      const account = await currentAccount(req);
      if (account) {
        if (route === 'logout-all') await pool.query('UPDATE cashflow_sessions SET revoked_at = now() WHERE account_id = $1 AND revoked_at IS NULL', [account.id]);
        else await pool.query('UPDATE cashflow_sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL', [tokenHash(requestToken(req))]);
      }
      clearSession(res);
      return json(res, 200, { message: 'Berhasil keluar.' });
    }
    return json(res, 404, { error: 'Rute tidak ditemukan.' });
  } catch (error) { return sendError(res, error); }
}

const server = http.createServer((req, res) => { handle(req, res).catch(error => sendError(res, error)); });
server.listen(PORT, '127.0.0.1', () => console.log(`[CashFlow account] listening on 127.0.0.1:${PORT}`));
setInterval(() => {
  pool.query("DELETE FROM cashflow_auth_tokens WHERE expires_at < now() - interval '1 day'").catch(() => {});
  pool.query("DELETE FROM cashflow_sessions WHERE expires_at < now() - interval '90 days' OR revoked_at < now() - interval '90 days'").catch(() => {});
  pool.query("DELETE FROM cashflow_auth_attempts WHERE attempted_at < now() - interval '1 day'").catch(() => {});
}, 24 * 60 * 60 * 1000).unref();
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => pool.end(() => process.exit(0))));
