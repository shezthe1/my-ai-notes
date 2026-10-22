/**
 * 동료 상호평가 투표 (Google Apps Script 웹 앱)
 *
 * 응답은 이 스크립트가 붙은 구글 시트의 '응답' 탭에 쌓입니다.
 * 투표자는 로그인 없이 닉네임 + 숫자 4자리 비밀번호로 제출하고, 같은 조합으로 다시 들어와 고칠 수 있습니다.
 * 결과 화면은 웹 앱 주소 뒤에 ?view=result 를 붙여 열고, 아래 OWNER_PASSWORD 로 잠급니다.
 */

// ===== 설정: 여기만 고치면 됩니다 =====
const OWNER_PASSWORD = '여기에-팀장-비밀번호'; // 결과 화면 비밀번호. 6자 이상으로 꼭 바꾸세요.

const PEOPLE = [
  { id: 'p1', name: '김민정' },
  { id: 'p2', name: '김윤지' },
  { id: 'p3', name: '신소영' },
  { id: 'p4', name: '안가영' },
  { id: 'p5', name: '전예솔' },
  { id: 'p6', name: '조다솜' },
];

const ELEMENTS = [
  { id: 'e1', name: '문제 정의', short: '문제 정의', q: '현장의 실제 문제를 정확히 짚었는가' },
  { id: 'e2', name: '근거·논리', short: '근거·논리', q: '주장이 데이터, 조사, 교육과정 등으로 뒷받침되는가' },
  { id: 'e3', name: '사용자 가치', short: '사용자 가치', q: '교사·학생이 실제로 써서 도움이 될 것 같은가' },
  { id: 'e4', name: '실현 가능성', short: '실현 가능성', q: '단계별 계획이 있고 실제로 실행할 수 있는가' },
  { id: 'e5', name: '창의·차별성', short: '창의·차별성', q: '기존 방식이나 서비스와 다른 관점이 있는가' },
  { id: 'e6', name: '전달력·완성도', short: '전달력·완성도', q: '처음 보는 사람이 바로 이해할 수 있는가' },
  { id: 'e7', name: '확장·발전 가능성', short: '확장·발전', q: '다른 학년, 서비스, 대상으로 넓혀 갈 수 있는가' },
  { id: 'e8', name: '팀 공유 가치', short: '팀 공유', q: '다른 팀원이 방법이나 결과를 가져다 쓸 수 있는가' },
];

const TOTAL_VOTERS = 7; // 수행자 6명 + 팀장
const MAX_COMMENTS = 6;
const MAX_COMMENT_LEN = 200;
const MAX_NICK_LEN = 12;

// ===== 내부 상수 =====
const DEFAULT_OWNER_PASSWORD = '여기에-팀장-비밀번호';
const SHEET_NAME = '응답';
const FAIL_LIMIT = 5;      // 비밀번호를 이만큼 틀리면
const LOCK_SECONDS = 600;  // 이 시간(초) 동안 잠금

// 시트 열 위치 (0부터)
const COL_KEY = 0;
const COL_NICK = 1;
const COL_AT = 2;
const COL_PICKS = 3;
const COL_NOTES = COL_PICKS + ELEMENTS.length * 2;
const COL_SALT = COL_NOTES + 1;
const COL_HASH = COL_NOTES + 2;

// ===== 웹 앱 진입 =====
function doGet(e) {
  const t = HtmlService.createTemplateFromFile('Index');
  t.view = e && e.parameter && e.parameter.view === 'result' ? 'result' : 'vote';
  t.config = { people: PEOPLE, elements: ELEMENTS, totalVoters: TOTAL_VOTERS, maxComments: MAX_COMMENTS, maxCommentLen: MAX_COMMENT_LEN, maxNickLen: MAX_NICK_LEN };
  return t.evaluate()
    .setTitle('동료 상호평가')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

// 템플릿의 <script> 안에 값을 안전하게 넣는다
function jsonForScript_(v) {
  return JSON.stringify(v).replace(/</g, '\\u003c');
}

// ===== 클라이언트에서 부르는 함수 =====

/** 닉네임과 비밀번호 확인. 이미 제출한 사람이면 이전 응답을 돌려준다. */
function login(nick, pin) {
  const n = cleanNick_(nick);
  if (!n) return { ok: false, error: 'nick' };
  if (!validPin_(pin)) return { ok: false, error: 'pin' };
  const key = keyOf_(n);
  if (isLocked_(key)) return { ok: false, error: 'locked' };
  const found = findRow_(sheet_(), key);
  if (!found) return { ok: true, existing: null };
  if (hash_(found.row[COL_SALT], pin) !== String(found.row[COL_HASH])) {
    addFail_(key);
    return { ok: false, error: 'wrong_pin' };
  }
  clearFail_(key);
  return { ok: true, existing: rowToVote_(found.row) };
}

/** 응답 저장. 같은 닉네임이 있으면 비밀번호가 맞을 때만 덮어쓴다. */
function submit(payload) {
  const p = payload || {};
  const n = cleanNick_(p.nick);
  if (!n) return { ok: false, error: 'nick' };
  if (!validPin_(p.pin)) return { ok: false, error: 'pin' };
  const picks = cleanPicks_(p.picks);
  if (!picks) return { ok: false, error: 'picks' };
  const notes = cleanNotes_(p.notes);
  const key = keyOf_(n);
  if (isLocked_(key)) return { ok: false, error: 'locked' };

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = sheet_();
    const found = findRow_(sh, key);
    let salt, hash;
    if (found) {
      salt = String(found.row[COL_SALT]);
      hash = String(found.row[COL_HASH]);
      if (hash_(salt, p.pin) !== hash) {
        addFail_(key);
        return { ok: false, error: 'wrong_pin' };
      }
    } else {
      salt = Utilities.getUuid();
      hash = hash_(salt, p.pin);
    }
    const row = [cell_(key), cell_(n), new Date()];
    ELEMENTS.forEach((e) => {
      const a = picks[e.id];
      row.push(nameOf_(a[0]), nameOf_(a[1]));
    });
    row.push(JSON.stringify(notes.map((x) => ({ to: nameOf_(x.p), t: x.t }))), salt, hash);
    if (found) sh.getRange(found.index, 1, 1, row.length).setValues([row]);
    else sh.appendRow(row);
    clearFail_(key);
    return { ok: true, updated: !!found };
  } finally {
    lock.releaseLock();
  }
}

/** 팀장 결과. 닉네임 목록과 투표 내용을 따로 돌려줘 화면에서 서로 연결되지 않게 한다. */
function getResults(password) {
  if (!OWNER_PASSWORD || OWNER_PASSWORD === DEFAULT_OWNER_PASSWORD || OWNER_PASSWORD.length < 6) {
    return { ok: false, error: 'not_configured' };
  }
  if (isLocked_('#owner')) return { ok: false, error: 'locked' };
  if (String(password || '') !== OWNER_PASSWORD) {
    addFail_('#owner');
    return { ok: false, error: 'wrong_password' };
  }
  clearFail_('#owner');
  const rows = sheet_().getDataRange().getValues().slice(1).filter((r) => String(r[COL_KEY]) !== '');
  const votes = rows.map(rowToVote_);
  shuffle_(votes);
  return {
    ok: true,
    nicks: rows.map((r) => String(r[COL_NICK])).sort(),
    votes: votes.map((v) => ({ picks: v.picks, notes: v.notes })),
  };
}

/**
 * 설치 확인용. 편집기에서 이 함수를 한 번 실행하면 권한을 승인하고, 응답이 쌓일 시트 주소를 로그에 남긴다.
 */
function setup() {
  const ss = ss_();
  sheet_();
  Logger.log('응답 시트: ' + ss.getUrl());
}

// ===== 시트 =====
// 시트에서 만든 스크립트면 그 시트를, 따로 만든 스크립트면 새 시트를 하나 만들어 계속 쓴다
function ss_() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  const created = SpreadsheetApp.create('동료 상호평가 응답');
  props.setProperty('SHEET_ID', created.getId());
  return created;
}

function sheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    const h = ['키', '닉네임', '제출 시각'];
    ELEMENTS.forEach((e) => h.push(e.name + ' 1순위', e.name + ' 2순위'));
    h.push('코멘트', 'salt', 'pin_hash');
    sh.appendRow(h);
    sh.setFrozenRows(1);
  }
  return sh;
}

function findRow_(sh, key) {
  const values = sh.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][COL_KEY]) === key) return { index: i + 1, row: values[i] };
  }
  return null;
}

function rowToVote_(row) {
  const picks = {};
  ELEMENTS.forEach((e, k) => {
    picks[e.id] = [idOf_(row[COL_PICKS + k * 2]), idOf_(row[COL_PICKS + k * 2 + 1])].filter(Boolean);
  });
  let notes = [];
  try {
    const raw = JSON.parse(String(row[COL_NOTES] || '[]'));
    if (Array.isArray(raw)) notes = raw.map((x) => ({ p: idOf_(x && x.to), t: String((x && x.t) || '') })).filter((x) => x.p && x.t);
  } catch (err) { /* 코멘트 없음으로 처리 */ }
  return { picks: picks, notes: notes };
}

// ===== 검증 =====
function cleanNick_(s) {
  const n = String(s == null ? '' : s).trim().replace(/\s+/g, ' ');
  return n && n.length <= MAX_NICK_LEN ? n : '';
}
function keyOf_(nick) { return nick.toLowerCase(); }
function validPin_(pin) { return /^\d{4}$/.test(String(pin == null ? '' : pin)); }

function cleanPicks_(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const out = {};
  for (const e of ELEMENTS) {
    const a = raw[e.id];
    if (!Array.isArray(a) || a.length !== 2) return null;
    if (!nameOf_(a[0]) || !nameOf_(a[1]) || a[0] === a[1]) return null;
    out[e.id] = [a[0], a[1]];
  }
  return out;
}

function cleanNotes_(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_COMMENTS)
    .map((x) => ({ p: x && x.p, t: String((x && x.t) || '').trim().slice(0, MAX_COMMENT_LEN) }))
    .filter((x) => nameOf_(x.p) && x.t);
}

// ===== 도우미 =====
function nameOf_(id) {
  const p = PEOPLE.find((x) => x.id === id);
  return p ? p.name : '';
}
function idOf_(name) {
  const p = PEOPLE.find((x) => x.name === String(name || ''));
  return p ? p.id : '';
}

// 앞에 ' 를 붙여 시트가 수식·숫자·날짜로 바꾸지 않고 글자 그대로 두게 한다
function cell_(s) {
  return "'" + String(s);
}

function hash_(salt, pin) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(salt) + ':' + String(pin), Utilities.Charset.UTF_8);
  return Utilities.base64Encode(bytes);
}

function shuffle_(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
}

// 비밀번호 연속 실패 잠금
function failKey_(key) { return 'fail:' + Utilities.base64EncodeWebSafe(key, Utilities.Charset.UTF_8); }
function isLocked_(key) {
  return Number(CacheService.getScriptCache().get(failKey_(key)) || 0) >= FAIL_LIMIT;
}
function addFail_(key) {
  const c = CacheService.getScriptCache();
  const k = failKey_(key);
  c.put(k, String(Number(c.get(k) || 0) + 1), LOCK_SECONDS);
}
function clearFail_(key) { CacheService.getScriptCache().remove(failKey_(key)); }
