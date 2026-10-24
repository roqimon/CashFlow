(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AruskasSavings = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const ICON_KEYS = new Set(['qurban', 'education', 'emergency', 'travel', 'general']);
  const ENTRY_TYPES = new Set(['deposit', 'withdrawal']);
  const GOAL_STATUSES = new Set(['active', 'archived']);

  function emptySavings() {
    return { goals: [], entries: [] };
  }

  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  function calendarDays(year, month, selectedDate = '', todayDate = '') {
    year = Number(year);
    month = Number(month);
    if (!Number.isInteger(year) || year < 1 || year > 9999 || !Number.isInteger(month) || month < 0 || month > 11) return [];
    const startOffset = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const cellCount = Math.ceil((startOffset + daysInMonth) / 7) * 7;
    return Array.from({ length: cellCount }, (_, index) => {
      const day = index - startOffset + 1;
      if (day < 1 || day > daysInMonth) return null;
      const date = `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { date, day, selected: date === selectedDate, today: date === todayDate };
    });
  }

  function normalizeGoal(value) {
    if (!value || typeof value !== 'object') return null;
    const id = String(value.id || '').trim();
    const name = String(value.name || '').trim().slice(0, 80);
    const targetAmount = Number(value.targetAmount);
    const targetDate = value.targetDate ? String(value.targetDate) : null;
    const iconKey = ICON_KEYS.has(value.iconKey) ? value.iconKey : 'general';
    const customIcon = String(value.customIcon || '').trim().slice(0, 24);
    const status = GOAL_STATUSES.has(value.status) ? value.status : 'active';
    if (!id || !name || !Number.isSafeInteger(targetAmount) || targetAmount <= 0) return null;
    if (targetDate && !validDate(targetDate)) return null;
    return {
      id,
      name,
      targetAmount,
      targetDate,
      iconKey,
      customIcon,
      status,
      isActive: typeof value.isActive === 'boolean' ? value.isActive : true,
      createdAt: String(value.createdAt || new Date().toISOString()),
      updatedAt: value.updatedAt ? String(value.updatedAt) : null,
    };
  }

  function normalizeEntry(value, goalIds) {
    if (!value || typeof value !== 'object') return null;
    const id = String(value.id || '').trim();
    const goalId = String(value.goalId || '').trim();
    const type = value.type;
    const amount = Number(value.amount);
    const date = String(value.date || '');
    if (!id || !goalIds.has(goalId) || !ENTRY_TYPES.has(type)) return null;
    if (!Number.isSafeInteger(amount) || amount <= 0 || !validDate(date)) return null;
    return {
      id,
      goalId,
      type,
      amount,
      date,
      note: String(value.note || '').trim().slice(0, 280),
      sourcePocketId: type === 'deposit' ? String(value.sourcePocketId || '').trim() : '',
      transferId: String(value.transferId || '').trim(),
      createdAt: String(value.createdAt || new Date().toISOString()),
    };
  }

  function normalizeSavings(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return emptySavings();
    const goalMap = new Map();
    (Array.isArray(value.goals) ? value.goals : []).forEach((item) => {
      const goal = normalizeGoal(item);
      if (goal) goalMap.set(goal.id, goal);
    });
    const entryMap = new Map();
    (Array.isArray(value.entries) ? value.entries : []).forEach((item) => {
      const entry = normalizeEntry(item, new Set(goalMap.keys()));
      if (entry) entryMap.set(entry.id, entry);
    });
    return { goals: Array.from(goalMap.values()), entries: Array.from(entryMap.values()) };
  }

  function goalBalance(savings, goalId) {
    const data = normalizeSavings(savings);
    return data.entries.reduce((balance, entry) => {
      if (entry.goalId !== goalId) return balance;
      return balance + (entry.type === 'deposit' ? entry.amount : -entry.amount);
    }, 0);
  }

  function goalStats(savings, goalId) {
    const data = normalizeSavings(savings);
    const goal = data.goals.find((item) => item.id === goalId);
    if (!goal) return null;
    const balance = goalBalance(data, goalId);
    const overTarget = Math.max(0, balance - goal.targetAmount);
    return {
      balance,
      targetAmount: goal.targetAmount,
      remaining: Math.max(0, goal.targetAmount - balance),
      percent: Math.round(balance / goal.targetAmount * 100),
      progressPercent: Math.min(100, Math.round(balance / goal.targetAmount * 100)),
      overTarget,
      isComplete: balance >= goal.targetAmount,
    };
  }

  function upsertGoal(savings, input) {
    const data = normalizeSavings(savings);
    const current = data.goals.find((item) => item.id === input?.id);
    const candidate = normalizeGoal({
      ...input,
      createdAt: input?.createdAt || current?.createdAt || new Date().toISOString(),
      updatedAt: input?.updatedAt || new Date().toISOString(),
    });
    if (!candidate) throw new Error('Nama tujuan dan target nominal wajib diisi dengan benar.');
    const goals = current
      ? data.goals.map((item) => item.id === candidate.id ? candidate : item)
      : [...data.goals, candidate];
    return { goals, entries: data.entries };
  }

  function deleteGoal(savings, goalId) {
    const data = normalizeSavings(savings);
    const id = String(goalId || '').trim();
    if (!data.goals.some((goal) => goal.id === id)) throw new Error('Tujuan tabungan tidak ditemukan.');
    return {
      goals: data.goals.filter((goal) => goal.id !== id),
      entries: data.entries.filter((entry) => entry.goalId !== id),
    };
  }

  function addEntry(savings, input) {
    const data = normalizeSavings(savings);
    const goal = data.goals.find((item) => item.id === input?.goalId);
    if (!goal) throw new Error('Tujuan tabungan tidak ditemukan.');
    if (goal.status === 'archived') throw new Error('Tujuan yang diarsipkan tidak menerima setoran baru.');
    if (!ENTRY_TYPES.has(input?.type)) throw new Error('Jenis transaksi tabungan tidak valid.');
    const amount = Number(input?.amount);
    if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Nominal harus lebih dari Rp 0.');
    const date = String(input?.date || '');
    if (!validDate(date)) throw new Error('Tanggal transaksi tidak valid.');
    const id = String(input?.id || '').trim();
    if (!id || data.entries.some((entry) => entry.id === id)) throw new Error('ID transaksi tabungan tidak valid.');
    if (input.type === 'withdrawal' && amount > goalBalance(data, goal.id)) {
      throw new Error('Nominal melebihi saldo tabungan yang tersedia.');
    }
    const entry = {
      id,
      goalId: goal.id,
      type: input.type,
      amount,
      date,
      note: String(input.note || '').trim().slice(0, 280),
      sourcePocketId: input.type === 'deposit' ? String(input.sourcePocketId || '').trim() : '',
      transferId: String(input.transferId || '').trim(),
      createdAt: String(input.createdAt || new Date().toISOString()),
    };
    return { goals: data.goals, entries: [...data.entries, entry] };
  }

  function mergeSavings(current, imported) {
    const existing = normalizeSavings(current);
    const incoming = normalizeSavings(imported);
    const goals = new Map(existing.goals.map((goal) => [goal.id, goal]));
    incoming.goals.forEach((goal) => goals.set(goal.id, goal));
    const entries = new Map(existing.entries.map((entry) => [entry.id, entry]));
    incoming.entries.forEach((entry) => entries.set(entry.id, entry));
    return normalizeSavings({ goals: Array.from(goals.values()), entries: Array.from(entries.values()) });
  }

  function pocketAllocated(savings, pocketId, targetDate = new Date()) {
    if (!pocketId) return 0;
    const date = new Date(targetDate);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return normalizeSavings(savings).entries.reduce((total, entry) =>
      total + (entry.type === 'deposit' && entry.sourcePocketId === pocketId && entry.date.startsWith(month) ? entry.amount : 0), 0);
  }

  return { emptySavings, validDate, calendarDays, normalizeSavings, goalBalance, goalStats, upsertGoal, deleteGoal, addEntry, mergeSavings, pocketAllocated };
});
