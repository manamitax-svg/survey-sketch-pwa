"use strict";

/* ============================================================
   現場実測スケッチ PWA — app.js
   ============================================================ */

/* ---------- 状態管理 ---------- */
const state = {
  tool: "draw",
  rawStroke: [],
  vertices: [],          // [{id, x, y, constraints}]
  edges: [],             // [{id, from, to, direction, constrained, measurement}]
  diagonals: [],
  heights: {},           // {vertexId: {status, height_m}}
  sources: [],           // [{id, name, sketchX, sketchY, z, radius, flux_real, flux_imag, directivity}]
  nextVertexId: 0,
  nextEdgeId: 0,
  nextDiagId: 0,
  nextSourceId: 0,
  selectedVertex: null,
  draggedVertexMoved: false,
  pendingMeasureTarget: null,
  pendingMeasureKind: null,
  pendingSourcePos: null,
  selectedSourceId: null,
  coordinateSystem: { originId: null, xAxisId: null },
  diagonalFirstVertex: null,
  history: [],
  scalePxPerMeter: null,      // 描画時の概算スケール（合意事項③）
  firstStrokeDone: false,     // 初回ストロークが完了したか
  meta: {
    schema_version: "1.1",
    site_name: "",
    surveyor: "",
    survey_date: "",
    device: "Android tablet (PWA)",
    notes: "",
    rt60_s: null,
    siteId: null,             // 現場の内部的な一意ID
    phaseNo: 1,                // 現場ID内のフェーズ連番
    lastExternalSavedAt: null, // 直近の外部保存(共有/ダウンロード)日時(ISO)
  },
};

/* ---------- バージョン ---------- */
const APP_VERSION = "0.18.0"; // Validation機能・フッター再構成（現地データ生成の一本化）・用語の認知論的見直し（作業状態/現地データ/現場管理）

/* ---------- Validation（現地データ生成前の検証） ---------- */
const VALIDATION_MIN_EDGE_LEN_M = 0.02;    // 極小辺のしきい値（これ未満は警告）
const VALIDATION_SHARP_ANGLE_DEG = 5;      // 極小角度・鋭角側のしきい値
const VALIDATION_STRAIGHT_ANGLE_DEG = 175; // 極小角度・直線側のしきい値
let _lastValidation = null; // 直近のcomputeValidation()結果（Validationバーのタップ時に再利用）

/* ---------- 調整可能パラメータ（合意事項①: 感度調整） ---------- */
const VERTEX_HIT_RADIUS = 34;        // 頂点ヒット半径(px) 26→34に拡大
const EDGE_HIT_RADIUS = 16;          // 辺ヒット半径は逆に絞る(誤追加防止)
const RDP_EPSILON = 10;
const LONGPRESS_MS = 600;
const LONGPRESS_MOVE_TOLERANCE = 14; // 長押し中の許容ブレ(px)
const SHORT_STROKE_PX = 30;          // これ未満のストロークは無視

/* ---------- ビュー変換（ピンチズーム・2本指パン） ---------- */
const view = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
};
const SCALE_MIN = 0.25;
const SCALE_MAX = 8;

/* ============================================================
   永続化 (localStorage)
   ============================================================ */
const STORAGE_KEY = "survey_sketch_state_v2"; // 旧: 単一スロット（後方互換の移行元としてのみ使用）
const SITES_REGISTRY_KEY = "survey_sketch_sites_v1"; // 端末内保存データの一覧
const SITE_SLOT_PREFIX = "survey_sketch_slot_v1:";   // 現場・フェーズ毎のスロット
const MAX_LOCAL_SLOTS = 10; // 端末内自動退避の保持件数上限

function genId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function ensureSiteIdentity() {
  if (!state.meta.siteId) state.meta.siteId = genId();
  if (!state.meta.phaseNo) state.meta.phaseNo = 1;
}

function currentCompositeId() {
  ensureSiteIdentity();
  return `${state.meta.siteId}_p${state.meta.phaseNo}`;
}

function loadRegistry() {
  try {
    const raw = localStorage.getItem(SITES_REGISTRY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function saveRegistry(list) {
  try { localStorage.setItem(SITES_REGISTRY_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
}

function buildStateSnapshot() {
  return {
    vertices: state.vertices, edges: state.edges, diagonals: state.diagonals,
    heights: state.heights, sources: state.sources,
    nextVertexId: state.nextVertexId, nextEdgeId: state.nextEdgeId,
    nextDiagId: state.nextDiagId, nextSourceId: state.nextSourceId,
    scalePxPerMeter: state.scalePxPerMeter, firstStrokeDone: state.firstStrokeDone,
    coordinateSystem: state.coordinateSystem,
    meta: state.meta,
  };
}

// ①端末内自動退避：現場・フェーズ(= state.meta.siteId + phaseNo)ごとに
// 個別スロットへ保存する。MAX_LOCAL_SLOTS件を超えたら、現在編集中の
// スロット以外で最終更新日時が最も古いものから破棄する。
function persistToLocalSlot() {
  ensureSiteIdentity();
  const compositeId = currentCompositeId();
  const snapshot = buildStateSnapshot();
  try {
    localStorage.setItem(SITE_SLOT_PREFIX + compositeId, JSON.stringify(snapshot));
  } catch (e) { return; }

  let registry = loadRegistry();
  const now = new Date().toISOString();
  const idx = registry.findIndex(r => r.compositeId === compositeId);
  const entry = {
    compositeId,
    siteId: state.meta.siteId,
    phaseNo: state.meta.phaseNo,
    siteName: state.meta.site_name || "(無題)",
    updatedAt: now,
    lastExternalSavedAt: state.meta.lastExternalSavedAt || null,
  };
  if (idx >= 0) registry[idx] = entry; else registry.push(entry);

  if (registry.length > MAX_LOCAL_SLOTS) {
    registry.sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
    while (registry.length > MAX_LOCAL_SLOTS) {
      const dropIdx = registry.findIndex(r => r.compositeId !== compositeId);
      if (dropIdx < 0) break;
      const dropped = registry.splice(dropIdx, 1)[0];
      try { localStorage.removeItem(SITE_SLOT_PREFIX + dropped.compositeId); } catch (e) { /* ignore */ }
    }
  }
  saveRegistry(registry);
}

function persistState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buildStateSnapshot())); // 旧バージョンとの後方互換用
  } catch (e) { /* quota等は無視。次回保存時に再試行 */ }
  persistToLocalSlot();
}

// 読み込んだスナップショットに対する旧データ移行処理（フィールド補完）
function migrateLoadedState() {
  for (const v of state.vertices) {
    if (!v.constraints) v.constraints = [];
  }
  for (const e of state.edges) {
    if (e.constrained === undefined) {
      e.constrained = e.measurement.status === "measured";
    }
    if (e.direction === undefined) e.direction = null;
    if (e.autoConstrained === undefined) e.autoConstrained = false;
  }
  if (!state.sources) state.sources = [];
  if (!state.nextSourceId) state.nextSourceId = state.sources.length;
  if (!state.coordinateSystem) state.coordinateSystem = { originId: null, xAxisId: null };
  if (state.meta.rt60_s === undefined) state.meta.rt60_s = null;
  ensureSiteIdentity();
  if (state.meta.lastExternalSavedAt === undefined) state.meta.lastExternalSavedAt = null;
}

function restoreState() {
  // 新方式：レジストリの中で最終更新日時が最も新しいスロットを復元
  const registry = loadRegistry();
  if (registry.length > 0) {
    registry.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    const latest = registry[0];
    try {
      const raw = localStorage.getItem(SITE_SLOT_PREFIX + latest.compositeId);
      if (raw) {
        const snap = JSON.parse(raw);
        Object.assign(state, snap);
        migrateLoadedState();
        return true;
      }
    } catch (e) { /* フォールスルーして旧方式を試す */ }
  }
  // 旧バージョンからの移行：レジストリが無ければ従来の単一スロットを試す
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const snap = JSON.parse(raw);
    Object.assign(state, snap);
    migrateLoadedState();
    return true;
  } catch (e) { return false; }
}

// 現在の現場・フェーズが、直近の外部保存より新しい編集を含むか
// （＝端末内には保存されているが外部にはまだ渡していない状態か）
function isCurrentSiteUnsavedExternally() {
  if (state.vertices.length === 0) return false;
  const registry = loadRegistry();
  const entry = registry.find(r => r.compositeId === currentCompositeId());
  if (!entry) return true;
  if (!entry.lastExternalSavedAt) return true;
  return new Date(entry.updatedAt) > new Date(entry.lastExternalSavedAt);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

/* ============================================================
   Canvas セットアップ
   ============================================================ */
const canvas = document.getElementById("sketchCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  const wrap = document.getElementById("canvas-wrap");
  const dpr = window.devicePixelRatio || 1;
  canvas.width = wrap.clientWidth * dpr;
  canvas.height = wrap.clientHeight * dpr;
  canvas.style.width = wrap.clientWidth + "px";
  canvas.style.height = wrap.clientHeight + "px";
  ctx.scale(dpr, dpr);
  render();
}
window.addEventListener("resize", resizeCanvas);

// 編集用ペイン（測距フォーム・高さ入力・音源一覧・スケール校正等）の開閉で
// #canvas-wrap のCSS上のサイズが変化しても、windowのresizeイベントは
// 発火しないためcanvasの実ピクセルサイズが追従せず、
// 下部の描画領域が隠れる/解放されない不具合があった。
// canvas-wrap自体のサイズ変化をResizeObserverで直接監視することで、
// どのペインの開閉でも確実にcanvasサイズを再同期する。
const _canvasWrapResizeObserver = new ResizeObserver(() => resizeCanvas());
_canvasWrapResizeObserver.observe(document.getElementById("canvas-wrap"));

/* ============================================================
   Douglas-Peucker 直線化 + 角度スナップ
   ============================================================ */
function perpendicularDistance(pt, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(pt.x - a.x, pt.y - a.y);
  const t = ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / (len * len);
  const px = a.x + t * dx, py = a.y + t * dy;
  return Math.hypot(pt.x - px, pt.y - py);
}

function douglasPeucker(points, epsilon) {
  if (points.length < 3) return points.slice();
  let maxDist = 0, idx = 0;
  const start = points[0], end = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], start, end);
    if (d > maxDist) { maxDist = d; idx = i; }
  }
  if (maxDist > epsilon) {
    const left = douglasPeucker(points.slice(0, idx + 1), epsilon);
    const right = douglasPeucker(points.slice(idx), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [start, end];
}

function angleSnap(points) {
  if (points.length < 3) return points;
  const snapped = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = snapped[snapped.length - 1];
    let p = points[i];
    if (snapped.length >= 2) {
      const pp = snapped[snapped.length - 2];
      const baseAngle = Math.atan2(prev.y - pp.y, prev.x - pp.x);
      const curAngle = Math.atan2(p.y - prev.y, p.x - prev.x);
      let rel = curAngle - baseAngle;
      while (rel > Math.PI) rel -= 2 * Math.PI;
      while (rel < -Math.PI) rel += 2 * Math.PI;
      const targets = [-Math.PI, -Math.PI*3/4, -Math.PI/2, -Math.PI/4, 0, Math.PI/4, Math.PI/2, Math.PI*3/4, Math.PI];
      let best = rel, bestDiff = Infinity;
      for (const t of targets) {
        const diff = Math.abs(rel - t);
        if (diff < bestDiff) { bestDiff = diff; best = t; }
      }
      if (bestDiff < 0.18) {
        const dist = Math.hypot(p.x - prev.x, p.y - prev.y);
        const snappedAngle = baseAngle + best;
        p = { x: prev.x + Math.cos(snappedAngle) * dist, y: prev.y + Math.sin(snappedAngle) * dist };
      }
    }
    snapped.push(p);
  }
  return snapped;
}

function strokeLengthPx(points) {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += Math.hypot(points[i].x - points[i-1].x, points[i].y - points[i-1].y);
  }
  return len;
}

/* ============================================================
   履歴管理（Undo）
   ============================================================ */
function pushHistory() {
  const snap = JSON.stringify({
    vertices: state.vertices, edges: state.edges, diagonals: state.diagonals, heights: state.heights,
    nextVertexId: state.nextVertexId, nextEdgeId: state.nextEdgeId, nextDiagId: state.nextDiagId,
  });
  state.history.push(snap);
  if (state.history.length > 40) state.history.shift();
}
function undo() {
  if (state.history.length === 0) { showToast("これ以上戻せません"); return; }
  const snap = JSON.parse(state.history.pop());
  Object.assign(state, snap);
  updateStats();
  persistState();
  render();
}

/* ============================================================
   トポロジー操作
   ============================================================ */
function newMeasurement() {
  return { status: "unmeasured", length_m: null, previous_length_m: null, estimated_length_m: null, measured_at: null };
}

function addVertex(x, y) {
  const v = { id: "P" + state.nextVertexId++, x, y, constraints: [] };
  state.vertices.push(v);
  state.heights[v.id] = { status: "unmeasured", height_m: null };
  return v;
}

function addEdge(fromId, toId, estimatedLengthM) {
  const e = { id: "E" + state.nextEdgeId++, from: fromId, to: toId, constrained: false, direction: null, measurement: newMeasurement() };
  if (estimatedLengthM != null) e.measurement.estimated_length_m = estimatedLengthM;
  state.edges.push(e);
  return e;
}

function pxDistance(v1, v2) { return Math.hypot(v2.x - v1.x, v2.y - v1.y); }

function estimateLengthM(pxLen) {
  if (state.scalePxPerMeter && state.scalePxPerMeter > 0) {
    return pxLen / state.scalePxPerMeter;
  }
  return null;
}

function buildPolygonFromStroke(rawPoints) {
  if (rawPoints.length < 2) return;

  // --- 初回ストローク: バウンディングボックスで長方形を生成しスケール校正へ ---
  if (!state.firstStrokeDone) {
    const xs = rawPoints.map(p => p.x), ys = rawPoints.map(p => p.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const y0 = Math.min(...ys), y1 = Math.max(...ys);
    const minSize = 40;
    if (x1 - x0 < minSize || y1 - y0 < minSize) {
      showToast("もう少し大きく描いてください");
      return;
    }
    // 軸平行長方形の4頂点（グリッド平行）
    state.pendingRect = {
      corners: [
        { x: x0, y: y0 }, // TL
        { x: x1, y: y0 }, // TR
        { x: x1, y: y1 }, // BR
        { x: x0, y: y1 }, // BL
      ],
      // 4辺: top, right, bottom, left
      sides: [
        { label: "上辺", from: 0, to: 1, pxLen: x1 - x0 },
        { label: "右辺", from: 1, to: 2, pxLen: y1 - y0 },
        { label: "下辺", from: 3, to: 2, pxLen: x1 - x0 },
        { label: "左辺", from: 0, to: 3, pxLen: y1 - y0 },
      ],
      selectedSide: null,
    };
    openRectScaleUI();
    render();
    return;
  }

  commitPolygon(rawPoints);
}

function commitRect(selectedSideIdx, lengthM) {
  const rect = state.pendingRect;
  const pxLen = rect.sides[selectedSideIdx].pxLen;
  if (lengthM > 0 && pxLen > 0) {
    state.scalePxPerMeter = pxLen / lengthM;
    document.getElementById("scaleBadge").classList.add("visible");
    document.getElementById("scaleValue").textContent = `${state.scalePxPerMeter.toFixed(1)} px/m`;
  }

  pushHistory();
  const corners = rect.corners;
  const verts = corners.map(c => addVertex(c.x, c.y));
  // 4辺: 0-1(H), 1-2(V), 2-3(H), 3-0(V)
  const dirs = ["horizontal", "vertical", "horizontal", "vertical"];
  for (let i = 0; i < 4; i++) {
    const v1 = verts[i], v2 = verts[(i + 1) % 4];
    const px = Math.hypot(v2.x - v1.x, v2.y - v1.y);
    const est = state.scalePxPerMeter ? px / state.scalePxPerMeter : null;
    const e = addEdge(v1.id, v2.id, est);
    e.direction = { type: dirs[i] };
    if (i === selectedSideIdx) {
      e.measurement.length_m = lengthM;
      e.measurement.status = "measured";
      e.measurement.measured_at = new Date().toISOString();
      e.constrained = true;
    }
  }
  // 全頂点に90度拘束を設定
  for (const v of verts) {
    v.constraints = [{ type: "angle", value: 90 }];
  }

  // 座標系設定: 左上頂点(P0)を原点、右上頂点(P1)をX軸方向
  state.coordinateSystem = { originId: verts[0].id, xAxisId: verts[1].id };
  // 既存音源の座標を新しい原点基準で再計算
  for (const src of state.sources) {
    const pos = sketchToM(src.sketchX, src.sketchY);
    src.posX = pos.x; src.posY = pos.y;
  }

  inferRectangleConstraints(); // 対辺の自動拘束（直角四角形専用）

  state.firstStrokeDone = true;
  state.pendingRect = null;
  closeRectScaleUI();
  updateStats();
  persistState();
  render();
  setHint(`長方形を生成しました。「測距」モードで残りの辺をタップして実測値を入力してください。`);
}

function commitPolygon(rawPoints) {
  pushHistory();
  let simplified = douglasPeucker(rawPoints, RDP_EPSILON);
  simplified = angleSnap(simplified);

  const first = simplified[0], last = simplified[simplified.length - 1];
  const closeDist = Math.hypot(last.x - first.x, last.y - first.y);
  if (closeDist < 40 && simplified.length > 3) {
    simplified = simplified.slice(0, -1);
  }

  const newVerts = simplified.map(p => addVertex(p.x, p.y));
  for (let i = 0; i < newVerts.length; i++) {
    const v1 = newVerts[i];
    const v2 = newVerts[(i + 1) % newVerts.length];
    const pxLen = pxDistance(v1, v2);
    addEdge(v1.id, v2.id, estimateLengthM(pxLen));
  }
  updateStats();
  persistState();
  render();
  setHint(`頂点 ${newVerts.length} 個のポリゴンを生成しました。「測距」モードで各辺をタップして実測値を入力してください。`);
}

function invalidateEdgesOfVertex(vertexId, opts = {}) {
  const skipSolverMaintained = opts.skipDirectionConstrained || false;
  let changed = false;
  for (const e of state.edges) {
    if (!(e.from === vertexId || e.to === vertexId)) continue;
    // ソルバーが実際に維持している辺（direction=H/V拘束、または
    // 辺長拘束=p2p_distance のいずれか）はスキップする。
    // 以前は e.direction の有無だけで判定しており、辺長拘束のみで
    // 維持されている辺（角度拘束なし）まで誤って「要確認」にしてしまう
    // 不具合があった。
    if (skipSolverMaintained && (e.direction || e.constrained)) continue;
    if (e.measurement.status === "measured") {
      e.measurement.previous_length_m = e.measurement.length_m;
      e.measurement.status = "invalidated";
      e.measurement.length_m = null;
      e.constrained = false;
      e.autoConstrained = false;
      changed = true;
    }
  }
  for (const d of state.diagonals) {
    if ((d.from === vertexId || d.to === vertexId) && d.measurement.status === "measured") {
      d.measurement.previous_length_m = d.measurement.length_m;
      d.measurement.status = "invalidated";
      d.measurement.length_m = null;
      changed = true;
    }
  }
  if (changed) showToast("形状編集の影響で「要再確認」になった辺があります");
}

function deleteVertex(vertexId) {
  pushHistory();
  const connected = state.edges.filter(e => e.from === vertexId || e.to === vertexId);
  if (connected.length === 2) {
    const others = connected.map(e => e.from === vertexId ? e.to : e.from);
    state.edges = state.edges.filter(e => !(e.from === vertexId || e.to === vertexId));
    addEdge(others[0], others[1]);
  } else {
    state.edges = state.edges.filter(e => !(e.from === vertexId || e.to === vertexId));
  }
  state.diagonals = state.diagonals.filter(d => d.from !== vertexId && d.to !== vertexId);
  state.vertices = state.vertices.filter(v => v.id !== vertexId);
  delete state.heights[vertexId];
  revalidateAutoConstraints();
  updateStats();
  persistState();
  render();
}

function insertVertexOnEdge(edgeId, x, y) {
  pushHistory();
  const idx = state.edges.findIndex(e => e.id === edgeId);
  if (idx === -1) return;
  const edge = state.edges[idx];
  const newV = addVertex(x, y);
  state.edges.splice(idx, 1);
  addEdge(edge.from, newV.id);
  addEdge(newV.id, edge.to);
  revalidateAutoConstraints();
  updateStats();
  persistState();
  render();
}

/* ============================================================
   ヒットテスト
   ============================================================ */
function findVertexAt(x, y, radius) {
  const r = radius !== undefined ? radius : screenToSketchRadius(VERTEX_HIT_RADIUS);
  let closest = null, minDist = r;
  for (const v of state.vertices) {
    const d = Math.hypot(v.x - x, v.y - y);
    if (d < minDist) { minDist = d; closest = v; }
  }
  return closest;
}

// 画面上のpx距離をスケッチ座標系の距離に変換（ヒット判定用）
function screenToSketchRadius(screenPx) {
  return screenPx / view.scale;
}

function pointToSegDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx*dx + dy*dy;
  let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx, projY = y1 + t * dy;
  return { dist: Math.hypot(px - projX, py - projY), t };
}

function findEdgeAt(x, y, radius) {
  let closest = null, minDist = radius;
  for (const e of state.edges) {
    const v1 = state.vertices.find(v => v.id === e.from);
    const v2 = state.vertices.find(v => v.id === e.to);
    if (!v1 || !v2) continue;
    const { dist } = pointToSegDist(x, y, v1.x, v1.y, v2.x, v2.y);
    if (dist < minDist) { minDist = dist; closest = e; }
  }
  return closest;
}

function findDiagonalAt(x, y, radius) {
  let closest = null, minDist = radius;
  for (const d of state.diagonals) {
    const v1 = state.vertices.find(v => v.id === d.from);
    const v2 = state.vertices.find(v => v.id === d.to);
    if (!v1 || !v2) continue;
    const { dist } = pointToSegDist(x, y, v1.x, v1.y, v2.x, v2.y);
    if (dist < minDist) { minDist = dist; closest = d; }
  }
  return closest;
}

/* ============================================================
   描画
   ============================================================ */
function statusColor(status) {
  if (status === "measured") return "#34D399";
  if (status === "invalidated") return "#F59E0B";
  return "#F87171";
}

function render() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // グリッド: ビュー変換の外側（スクリーン座標）で描画、常に画面全体をカバー
  const grid = 40;
  // グリッド原点をビューoffsetに合わせてズレを吸収
  const gox = ((view.offsetX % grid) + grid) % grid;
  const goy = ((view.offsetY % grid) + grid) % grid;
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  for (let x = gox; x < w; x += grid) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
  for (let y = goy; y < h; y += grid) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }

  // ビュー変換を適用
  ctx.save();
  ctx.translate(view.offsetX, view.offsetY);
  ctx.scale(view.scale, view.scale);

  if (state.rawStroke.length > 1) {
    ctx.strokeStyle = "#4F8CFF";
    ctx.lineWidth = 3;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(state.rawStroke[0].x, state.rawStroke[0].y);
    for (const p of state.rawStroke.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.stroke();

    // 仮距離表示（合意事項③）
    if (state.scalePxPerMeter) {
      const pxLen = strokeLengthPx(state.rawStroke);
      const mLen = pxLen / state.scalePxPerMeter;
      const last = state.rawStroke[state.rawStroke.length - 1];
      ctx.font = "bold 13px sans-serif";
      const label = `約 ${mLen.toFixed(2)} m`;
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = "rgba(15,17,21,0.88)";
      ctx.fillRect(last.x + 10, last.y - 10, tw + 10, 20);
      ctx.fillStyle = "#4F8CFF";
      ctx.fillText(label, last.x + 15, last.y + 5);
    }
  }

  // 長方形プレビュー（初回ストローク後・スケール校正中）
  if (state.pendingRect) {
    const rect = state.pendingRect;
    const c = rect.corners;
    ctx.fillStyle = "rgba(79,140,255,0.07)";
    ctx.beginPath();
    ctx.moveTo(c[0].x, c[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(c[i].x, c[i].y);
    ctx.closePath();
    ctx.fill();

    const sideSegs = [[0,1],[1,2],[2,3],[3,0]];
    sideSegs.forEach(([a, b], i) => {
      const selected = rect.selectedSide === i;
      ctx.strokeStyle = selected ? "#FBBF24" : "rgba(79,140,255,0.6)";
      ctx.lineWidth = selected ? 4 : 2;
      ctx.setLineDash(selected ? [] : [6, 4]);
      ctx.beginPath(); ctx.moveTo(c[a].x, c[a].y); ctx.lineTo(c[b].x, c[b].y); ctx.stroke();
      ctx.setLineDash([]);
      const mx = (c[a].x + c[b].x) / 2, my = (c[a].y + c[b].y) / 2;
      ctx.font = "bold 12px sans-serif";
      ctx.fillStyle = selected ? "#FBBF24" : "#8FB3FF";
      ctx.textAlign = "center";
      ctx.fillText(rect.sides[i].label, mx, my - 10);
      ctx.textAlign = "left";
    });
    for (const co of c) {
      ctx.fillStyle = "#FBBF24";
      ctx.beginPath(); ctx.arc(co.x, co.y, 6, 0, Math.PI * 2); ctx.fill();
    }
  }

  for (const d of state.diagonals) {
    const v1 = state.vertices.find(v => v.id === d.from);
    const v2 = state.vertices.find(v => v.id === d.to);
    if (!v1 || !v2) continue;
    ctx.strokeStyle = statusColor(d.measurement.status);
    ctx.lineWidth = 2.5 / view.scale;
    ctx.setLineDash([6 / view.scale, 5 / view.scale]);
    ctx.beginPath(); ctx.moveTo(v1.x, v1.y); ctx.lineTo(v2.x, v2.y); ctx.stroke();
    ctx.setLineDash([]);
    drawEdgeLabel(d, v1, v2);
  }

  for (const e of state.edges) {
    const v1 = state.vertices.find(v => v.id === e.from);
    const v2 = state.vertices.find(v => v.id === e.to);
    if (!v1 || !v2) continue;
    const isSelected = state.pendingMeasureTarget && state.pendingMeasureTarget.id === e.id;
    ctx.strokeStyle = isSelected ? "#4F8CFF" : statusColor(e.measurement.status);
    ctx.lineWidth = (isSelected ? 5 : 3.5) / view.scale;
    ctx.beginPath(); ctx.moveTo(v1.x, v1.y); ctx.lineTo(v2.x, v2.y); ctx.stroke();
    drawEdgeLabel(e, v1, v2);
  }

  for (const v of state.vertices) {
    const isSelected = state.diagonalFirstVertex === v.id;
    const h = state.heights[v.id];
    const hasHeight = h && h.status === "measured";
    const r = 9 / view.scale;

    ctx.fillStyle = isSelected ? "#4F8CFF" : "#FBBF24";
    ctx.beginPath();
    ctx.arc(v.x, v.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#0F1115"; ctx.lineWidth = 2 / view.scale; ctx.stroke();

    // 高さ測定済みリング
    if (hasHeight) {
      ctx.strokeStyle = "#A78BFA"; ctx.lineWidth = 2 / view.scale;
      ctx.beginPath(); ctx.arc(v.x, v.y, 13 / view.scale, 0, Math.PI * 2); ctx.stroke();
    }

    // 角度拘束マーク
    const angleConstraint = v.constraints && v.constraints.find(c => c.type === "angle");
    if (angleConstraint && view.scale >= 0.5) {
      if (angleConstraint.value === 90) {
        // 直角マーク: 頂点円の右下外側に配置
        const offset = (r + 2 / view.scale);
        const s = 4 / view.scale;          // マークサイズ（小さく）
        const ox = v.x + offset * 0.7;    // 右下オフセット
        const oy = v.y + offset * 0.7;
        // 背景小矩形
        ctx.fillStyle = "rgba(15,17,21,0.85)";
        ctx.fillRect(ox - 1/view.scale, oy - s - 1/view.scale, s + 2/view.scale, s + 2/view.scale);
        // L字マーク（アクセントブルー）
        ctx.strokeStyle = "#4F8CFF"; ctx.lineWidth = 1.5 / view.scale;
        ctx.beginPath();
        ctx.moveTo(ox, oy - s);
        ctx.lineTo(ox, oy);
        ctx.lineTo(ox + s, oy);
        ctx.stroke();
      } else {
        // 任意角度: 頂点右下に数値表示
        const fontSize = Math.max(7, 8 / view.scale);
        const ox = v.x + r * 0.7;
        const oy = v.y + r * 0.7 + fontSize;
        ctx.font = `bold ${fontSize}px sans-serif`;
        const tw = ctx.measureText(`${angleConstraint.value}°`).width;
        ctx.fillStyle = "rgba(15,17,21,0.85)";
        ctx.fillRect(ox - 1, oy - fontSize, tw + 2, fontSize + 2);
        ctx.fillStyle = "#4F8CFF";
        ctx.textAlign = "left";
        ctx.fillText(`${angleConstraint.value}°`, ox, oy);
      }
    }

    // 頂点IDラベル（scale < 0.5 では非表示）
    if (view.scale >= 0.5) {
      ctx.fillStyle = "#E8EAED";
      ctx.font = `${11 / view.scale}px sans-serif`;
      ctx.fillText(v.id, v.x + 13 / view.scale, v.y - 11 / view.scale);
    }
  }

  // 音源描画（無指向性: 全円、将来は directivity に応じて弧に変更）
  for (const src of state.sources) {
    const r = 8 / view.scale;  // サイズ縮小・スケール不変
    const x = src.sketchX, y = src.sketchY;
    const isSelected = state.selectedSourceId === src.id;

    // 外側リング（選択中はアクセント）
    ctx.strokeStyle = isSelected ? "#FBBF24" : "#67E8F9";
    ctx.lineWidth = (isSelected ? 2.5 : 1.5) / view.scale;
    ctx.beginPath(); ctx.arc(x, y, r * 1.6, 0, Math.PI * 2); ctx.stroke();

    // 内側塗り円
    ctx.fillStyle = isSelected ? "rgba(251,191,36,0.3)" : "rgba(103,232,249,0.2)";
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = isSelected ? "#FBBF24" : "#67E8F9";
    ctx.lineWidth = 1.5 / view.scale;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();

    if (view.scale >= 0.5) {
      const fontSize = Math.max(8, 10 / view.scale);
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = isSelected ? "#FBBF24" : "#67E8F9";
      ctx.textAlign = "center";
      ctx.fillText(src.name, x, y + r * 1.6 + fontSize + 2 / view.scale);
      ctx.font = `${Math.max(7, 8 / view.scale)}px sans-serif`;
      ctx.fillStyle = isSelected ? "rgba(251,191,36,0.8)" : "rgba(103,232,249,0.8)";
      ctx.fillText(`z=${src.z}m`, x, y + r * 1.6 + fontSize * 2 + 4 / view.scale);
      ctx.textAlign = "left";
    }
  }

  // 座標系原点マーカー
  if (state.coordinateSystem && state.coordinateSystem.originId && view.scale >= 0.3) {
    const vo = state.vertices.find(v => v.id === state.coordinateSystem.originId);
    const vx = state.vertices.find(v => v.id === state.coordinateSystem.xAxisId);
    if (vo) {
      const axLen = 20 / view.scale;
      const fontSize = Math.max(8, 9 / view.scale);
      ctx.lineWidth = 2 / view.scale;

      // X軸矢印（右向き）
      ctx.strokeStyle = "#FF6B6B"; ctx.fillStyle = "#FF6B6B";
      ctx.beginPath(); ctx.moveTo(vo.x, vo.y); ctx.lineTo(vo.x + axLen, vo.y); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(vo.x + axLen, vo.y);
      ctx.lineTo(vo.x + axLen - 5/view.scale, vo.y - 3/view.scale);
      ctx.lineTo(vo.x + axLen - 5/view.scale, vo.y + 3/view.scale);
      ctx.closePath(); ctx.fill();
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillText("X", vo.x + axLen + 3/view.scale, vo.y + fontSize * 0.4);

      // Y軸矢印（下向き）
      ctx.strokeStyle = "#6BCB77"; ctx.fillStyle = "#6BCB77";
      ctx.beginPath(); ctx.moveTo(vo.x, vo.y); ctx.lineTo(vo.x, vo.y + axLen); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(vo.x, vo.y + axLen);
      ctx.lineTo(vo.x - 3/view.scale, vo.y + axLen - 5/view.scale);
      ctx.lineTo(vo.x + 3/view.scale, vo.y + axLen - 5/view.scale);
      ctx.closePath(); ctx.fill();
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = "#6BCB77";
      ctx.fillText("Y", vo.x + 3/view.scale, vo.y + axLen + fontSize + 2/view.scale);

      // 原点ラベル
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = `${Math.max(7, 8/view.scale)}px sans-serif`;
      ctx.fillText("O", vo.x - 12/view.scale, vo.y - 5/view.scale);
    }
  }

  ctx.restore(); // ビュー変換を元に戻す

  // スナップ中インジケーター（スクリーン座標で描画）
  if (_snapActive && state.selectedVertex) {
    const v = state.selectedVertex;
    const sx = v.x * view.scale + view.offsetX;
    const sy = v.y * view.scale + view.offsetY;
    ctx.strokeStyle = "#4F8CFF";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(sx, sy, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = "bold 10px sans-serif";
    ctx.fillStyle = "#4F8CFF";
    ctx.textAlign = "center";
    ctx.fillText("90°", sx, sy - 22);
    ctx.textAlign = "left";
  }
}

function drawEdgeLabel(item, v1, v2) {
  if (view.scale < 0.5) return;

  const mx = (v1.x + v2.x) / 2, my = (v1.y + v2.y) / 2;
  const m = item.measurement;

  // 現在の頂点座標からリアルタイムpx距離を計算
  const currentPx = Math.hypot(v2.x - v1.x, v2.y - v1.y);

  let label;
  if (m.status === "measured") {
    if (item.constrained && m.length_m != null) {
      // 拘束あり辺: 測定値を正として表示（GCSが頂点を動かしても表示が変わらない）
      label = `${m.length_m.toFixed(3)}m`;
    } else if (state.scalePxPerMeter) {
      // 拘束なし測定済み辺: ドラッグ中は現在のpx距離から換算してリアルタイム表示
      const currentM = currentPx / state.scalePxPerMeter;
      label = `${currentM.toFixed(3)}m`;
    } else {
      label = `${m.length_m.toFixed(3)}m`;
    }
    if (item.autoConstrained) label += " 🔒(自動)";
    else if (item.constrained) label += " 🔒";
  } else if (m.status === "invalidated") {
    if (state.scalePxPerMeter) {
      // 拘束解除後もドラッグ操作に追従させる（現在のpx距離から換算してリアルタイム表示）
      const currentM = currentPx / state.scalePxPerMeter;
      label = `要確認(${currentM.toFixed(2)}m)`;
    } else {
      label = `要確認(${m.previous_length_m != null ? m.previous_length_m.toFixed(2) : "?"}m)`;
    }
  } else if (m.estimated_length_m != null) {
    // 未測定でスケールあり: 現在のpx距離からリアルタイム概算表示
    if (state.scalePxPerMeter) {
      const currentM = currentPx / state.scalePxPerMeter;
      label = `約${currentM.toFixed(1)}m?`;
    } else {
      label = `約${m.estimated_length_m.toFixed(1)}m?`;
    }
  } else {
    label = state.scalePxPerMeter
      ? `${(currentPx / state.scalePxPerMeter).toFixed(1)}m?`
      : "?";
  }

  const fontSize = Math.max(8, 11 / view.scale);
  ctx.font = `bold ${fontSize}px sans-serif`;
  const tw = ctx.measureText(label).width;
  const pad = 4 / view.scale;
  const bh = fontSize + pad * 2;
  ctx.fillStyle = "rgba(15,17,21,0.85)";
  ctx.fillRect(mx - tw / 2 - pad, my - bh / 2, tw + pad * 2, bh);
  ctx.fillStyle = statusColor(m.status);
  ctx.textAlign = "center";
  ctx.fillText(label, mx, my + fontSize * 0.35);
  ctx.textAlign = "left";
}

/* ============================================================
   コンテキストメニュー（長押し）
   ============================================================ */
const ctxMenu = document.getElementById("ctx-menu");
const ctxMenuTitle = document.getElementById("ctx-menu-title");
const ctxMenuItems = document.getElementById("ctx-menu-items");

function showCtxMenu(screenX, screenY, title, items) {
  // items: [{icon, label, action, danger}]
  ctxMenuTitle.textContent = title;
  ctxMenuItems.innerHTML = "";
  for (const item of items) {
    const btn = document.createElement("button");
    btn.className = "ctx-item" + (item.danger ? " danger" : "");
    btn.innerHTML = `<span>${item.icon}</span><span>${item.label}</span>`;
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      hideCtxMenu();
      // prompt()等のブロッキングダイアログがpointerup等の残留イベントと
      // 衝突しないよう、次のイベントループまで実行を遅延する
      setTimeout(() => item.action(), 0);
    });
    ctxMenuItems.appendChild(btn);
  }

  // 画面端からはみ出さないよう位置補正
  ctxMenu.style.display = "block";
  const mw = ctxMenu.offsetWidth || 180;
  const mh = ctxMenu.offsetHeight || 160;
  const vw = window.innerWidth, vh = window.innerHeight;
  const x = Math.min(screenX, vw - mw - 8);
  const y = Math.min(screenY, vh - mh - 8);
  ctxMenu.style.left = x + "px";
  ctxMenu.style.top  = y + "px";
}

function hideCtxMenu() {
  ctxMenu.style.display = "none";
}

// メニュー外タップで閉じる
document.addEventListener("pointerdown", (e) => {
  if (ctxMenu.style.display === "block" && !ctxMenu.contains(e.target)) {
    hideCtxMenu();
  }
}, { capture: true });

/**
 * 頂点の角度拘束（90°）解除・付与に連動して、
 * その頂点に接続する辺のdirectionを更新する。
 *
 * 解除時: 接続辺のdirectionをnullにする（自由化）
 *         ただし、もう一方の端点が90度拘束されたままの辺はdirectionを維持する
 *         （その辺は反対側の頂点の拘束により方向が決まっているため）
 * 付与時: 接続辺の現在の向き（水平/垂直、より近い方）からdirectionを設定
 */
function syncEdgeDirectionForVertex(v, enabling) {
  const connected = state.edges.filter(e => e.from === v.id || e.to === v.id);
  for (const e of connected) {
    const otherId = e.from === v.id ? e.to : e.from;
    const other = state.vertices.find(vv => vv.id === otherId);
    if (!other) continue;

    if (enabling) {
      // 角度拘束付与（90°）: 現在の頂点間の向きから H/V を自動判定して設定
      const dx = Math.abs(other.x - v.x), dy = Math.abs(other.y - v.y);
      e.direction = { type: dx >= dy ? "horizontal" : "vertical" };
    } else {
      // 角度拘束解除:
      // direction（H/V方向）は角度拘束（90°）の有無だけで判定する。
      // 辺長拘束(p2p_distance)は方向を問わず機能するため、辺長拘束が
      // 残っていることを理由に direction を維持する必要はない
      // （以前はこれを混同しており、角度解除しても辺長拘束が残る限り
      // 水平垂直に固定されたままになる不具合の原因だった）。
      maybeClearEdgeDirection(e);
    }
  }
}

/**
 * 辺のdirection（H/V方向拘束）を解放してよいか判定し、解放する。
 * direction は角度拘束（90°）専用の仕組みであり、辺長拘束(p2p_distance)
 * とは独立している。両端点のどちらにも角度拘束が残っていなければ
 * direction を null にし、自由な方向へのドラッグを許可する。
 */
function maybeClearEdgeDirection(e) {
  const has90 = (vid) => {
    const v = state.vertices.find(vv => vv.id === vid);
    return !!(v && v.constraints && v.constraints.some(c => c.type === "angle" && c.value === 90));
  };
  if (!has90(e.from) && !has90(e.to)) {
    e.direction = null;
  }
}

/* ---------- 頂点の長押しメニュー ---------- */
function openVertexCtxMenu(v, screenX, screenY) {
  const hasConstraint = v.constraints && v.constraints.length > 0;
  const items = [
    {
      icon: "📐", label: "角度拘束を設定",
      action: () => openAngleConstraintMenu(v),
    },
  ];
  if (hasConstraint) {
    items.push({
      icon: "🔓", label: "拘束を解除",
      action: () => {
        pushHistory();
        v.constraints = [];
        syncEdgeDirectionForVertex(v, false);
        revalidateAutoConstraints();
        persistState(); render(); updateStats();
        showToast(`頂点 ${v.id} の拘束を解除しました`);
      },
    });
  }
  items.push({
    icon: "🗑", label: "削除", danger: true,
    action: () => {
      pushHistory();
      deleteVertex(v.id);
      showToast(`頂点 ${v.id} を削除しました`);
    },
  });
  showCtxMenu(screenX, screenY, `頂点 ${v.id}`, items);
}

/* ---------- 辺の長押しメニュー ---------- */
function openEdgeCtxMenu(e, screenX, screenY) {
  const items = [
    {
      icon: "➕", label: "ここに頂点を挿入",
      action: () => {
        insertVertexOnEdge(e.id, e._insertPos.x, e._insertPos.y);
        showToast(`辺 ${e.id} に頂点を挿入しました`);
      },
    },
    {
      icon: "⬜", label: "矩形を突出す",
      action: () => openRectProtrusion(e),
    },
  ];
  if (e.constrained) {
    items.push({
      icon: "🔓", label: e.autoConstrained ? "辺長拘束を解除（自動算出分）" : "辺長拘束を解除",
      action: () => {
        pushHistory();
        e.constrained = false;
        e.autoConstrained = false;
        e.measurement.status = "invalidated";
        e.measurement.previous_length_m = e.measurement.length_m;
        e.measurement.length_m = null;
        maybeClearEdgeDirection(e);
        revalidateAutoConstraints();
        updateStats(); persistState(); render();
        showToast(`辺 ${e.id} の拘束を解除しました`);
      },
    });
  }
  showCtxMenu(screenX, screenY, `辺 ${e.id}`, items);
}

/* ---------- 矩形突出しプレースホルダー（フェーズ9で本実装） ---------- */
function openRectProtrusion(edge) {
  if (_promptOpen) return;
  _promptOpen = true;

  setTimeout(() => {
    // 辺の長さをmで取得
    const va = state.vertices.find(v => v.id === edge.from);
    const vb = state.vertices.find(v => v.id === edge.to);
    if (!va || !vb) { _promptOpen = false; return; }

    const edgePxLen = Math.hypot(vb.x - va.x, vb.y - va.y);
    const edgeLenM = state.scalePxPerMeter
      ? (edge.measurement.status === "measured" && edge.measurement.length_m
          ? edge.measurement.length_m
          : edgePxLen / state.scalePxPerMeter)
      : null;
    const edgeLenDisp = edgeLenM ? `${edgeLenM.toFixed(2)}m` : `${Math.round(edgePxLen)}px`;

    const widthStr = prompt(
      `突出し幅 [m]（辺中央から対称）\n辺長: ${edgeLenDisp}`,
      edgeLenM ? (edgeLenM / 2).toFixed(2) : "2.0"
    );
    if (widthStr === null) { _promptOpen = false; return; }
    const widthM = parseFloat(widthStr);
    if (isNaN(widthM) || widthM <= 0) {
      _promptOpen = false; showToast("有効な幅を入力してください"); return;
    }

    const depthStr = prompt("奥行き [m]", "1.0");
    _promptOpen = false;
    if (depthStr === null) return;
    const depthM = parseFloat(depthStr);
    if (isNaN(depthM) || depthM <= 0) {
      showToast("有効な奥行きを入力してください"); return;
    }

    buildRectProtrusion(edge, widthM, depthM);
  }, 50);
}

/**
 * 矩形突出しを生成する
 * 選択辺の中央から対称に幅widthM、奥行きdepthMの矩形を突出す
 *
 * 生成される要素:
 *   頂点: B1, B2（底辺両端）、T1, T2（先端）
 *   辺:   B1-B2（底辺区間）、B1-T1（縦）、T1-T2（先端横）、T2-B2（縦）
 *   既存辺を3分割: 既存edge → A-B1, B1-B2-T1-T2-B2（突出し）, B2-B
 *
 * 辺方向の判定:
 *   選択辺がH辺 → 突出しはV方向（上または下）
 *   選択辺がV辺 → 突出しはH方向（左または右）
 *   突出し方向は選択辺の「外側」（ポリゴンの外側）に向ける
 */
function buildRectProtrusion(edge, widthM, depthM) {
  const va = state.vertices.find(v => v.id === edge.from);
  const vb = state.vertices.find(v => v.id === edge.to);
  if (!va || !vb) return;

  // px換算
  const scale = state.scalePxPerMeter;
  const widthPx = scale ? widthM * scale : widthM * 50;  // スケール未設定時は1m=50px仮定
  const depthPx = scale ? depthM * scale : depthM * 50;

  const edgePxLen = Math.hypot(vb.x - va.x, vb.y - va.y);
  const dir = edgeSolverDir(edge); // "H", "V", or null

  // 辺の中点
  const mx = (va.x + vb.x) / 2, my = (va.y + vb.y) / 2;

  // 辺の単位ベクトル（from→to方向）
  const ex = (vb.x - va.x) / edgePxLen, ey = (vb.y - va.y) / edgePxLen;
  // 辺に垂直な法線ベクトル（左向き: ポリゴン内側と仮定し、後でユーザーが編集で調整）
  // H辺: 法線は上（-y）か下（+y）→ デフォルトで-y（上方向）
  // V辺: 法線は左（-x）か右（+x）→ デフォルトで-x（左方向）
  let nx, ny;
  if (dir === "H") { nx = 0; ny = -1; }
  else if (dir === "V") { nx = -1; ny = 0; }
  else {
    // direction未設定辺: 辺に垂直な方向を計算
    nx = -ey; ny = ex;
  }

  // 底辺両端座標（中点から辺方向に±width/2）
  const halfW = widthPx / 2;
  const b1x = mx - ex * halfW, b1y = my - ey * halfW;
  const b2x = mx + ex * halfW, b2y = my + ey * halfW;

  // 先端座標（底辺両端から法線方向にdepth）
  const t1x = b1x + nx * depthPx, t1y = b1y + ny * depthPx;
  const t2x = b2x + nx * depthPx, t2y = b2y + ny * depthPx;

  pushHistory();

  // 既存辺をA-B1, B2-Bに分割（元のedgeは削除して2辺に置き換え）
  const eid = edge.id;
  state.edges = state.edges.filter(e => e.id !== eid);

  // 底辺両端に頂点を追加
  const vB1 = addVertex(b1x, b1y);
  const vB2 = addVertex(b2x, b2y);
  const vT1 = addVertex(t1x, t1y);
  const vT2 = addVertex(t2x, t2y);

  // 90°拘束と辺directionを付与
  const angleConstr = [{ type: "angle", value: 90 }];
  for (const v of [vB1, vB2, vT1, vT2]) {
    v.constraints = angleConstr.slice();
    state.heights[v.id] = { status: "unmeasured", height_m: null };
  }

  // 分割辺と突出し辺を生成
  // 1. va → B1（元辺の前半）
  const eA_B1 = addEdge(va.id, vB1.id);
  eA_B1.direction = edge.direction ? { ...edge.direction } : null;

  // 2. B2 → vb（元辺の後半）
  const eB2_B = addEdge(vB2.id, vb.id);
  eB2_B.direction = edge.direction ? { ...edge.direction } : null;

  // 3. B1 → T1（縦辺）
  const perpDir = dir === "H" ? "vertical" : (dir === "V" ? "horizontal" : null);
  const eB1_T1 = addEdge(vB1.id, vT1.id);
  if (perpDir) eB1_T1.direction = { type: perpDir };

  // 4. T1 → T2（先端横辺）
  const eT1_T2 = addEdge(vT1.id, vT2.id);
  if (dir) eT1_T2.direction = { type: dir === "H" ? "horizontal" : "vertical" };

  // 5. T2 → B2（縦辺）
  const eT2_B2 = addEdge(vT2.id, vB2.id);
  if (perpDir) eT2_B2.direction = { type: perpDir };

  // 推定辺長を設定
  for (const e of [eA_B1, eB2_B]) {
    const edgeLen = Math.hypot(
      state.vertices.find(v=>v.id===e.to).x - state.vertices.find(v=>v.id===e.from).x,
      state.vertices.find(v=>v.id===e.to).y - state.vertices.find(v=>v.id===e.from).y
    );
    if (scale) e.measurement.estimated_length_m = edgeLen / scale;
  }
  if (scale) {
    eB1_T1.measurement.estimated_length_m = depthM;
    eT1_T2.measurement.estimated_length_m = widthM;
    eT2_B2.measurement.estimated_length_m = depthM;
  }

  revalidateAutoConstraints();
  updateStats();
  persistState();
  render();
  showToast(`矩形突出し生成（幅${widthM}m・奥行き${depthM}m）。位置は編集モードで調整してください。`);
}

/* ---------- 角度拘束設定（プレースホルダー：次フェーズで本実装） ---------- */
let _promptOpen = false; // prompt()の二重発火防止フラグ

function openAngleConstraintMenu(v) {
  if (_promptOpen) return;
  _promptOpen = true;
  setTimeout(() => {
    const val = prompt(`頂点 ${v.id} の拘束角度を入力してください（例: 90）`, "90");
    _promptOpen = false;
    if (val === null) return;
    const deg = parseFloat(val);
    if (isNaN(deg) || deg <= 0 || deg >= 360) {
      showToast("有効な角度を入力してください（1〜359度）"); return;
    }
    pushHistory();
    if (!v.constraints) v.constraints = [];
    v.constraints = [{ type: "angle", value: deg }];
    if (deg === 90) {
      syncEdgeDirectionForVertex(v, true);
      persistState(); render(); updateStats();
      showToast(`頂点 ${v.id} に90°拘束を設定しました`);
    } else {
      persistState(); render(); updateStats();
      showToast(`頂点 ${v.id} に${deg}°（表示のみ、ドラッグ拘束非対応）を設定しました`);
    }
  }, 50);
}

/* ============================================================
   ダブルタップ検出
   ============================================================ */
const DOUBLETAP_MS = 300;
let lastTapTime = 0;
let lastTapTarget = null;

// スクリーン座標 → スケッチ座標（ビュー変換の逆変換）
function getCanvasPos(evt) {
  const rect = canvas.getBoundingClientRect();
  const cx = evt.clientX - rect.left;
  const cy = evt.clientY - rect.top;
  return {
    x: (cx - view.offsetX) / view.scale,
    y: (cy - view.offsetY) / view.scale,
  };
}

// スクリーン座標のみ（逆変換なし、ピンチ距離・中点計算用）
function getScreenPos(evt) {
  const rect = canvas.getBoundingClientRect();
  return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
}

let isDrawing = false;
let isDraggingVertex = false;
let pointerDownPos = null;  // スクリーン座標（長押し判定用）
let longPressTimer = null;
let longPressVertex = null;

// アクティブポインター管理（ピンチ用）
const activePointers = new Map(); // pointerId -> {x, y} スクリーン座標
let lastPinchDist = null;
let lastPinchMid = null;
let isPinching = false;

function screenMidpoint(p1, p2) {
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
}
function screenDist(p1, p2) {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

// ビュー変換：pivot点（スクリーン座標）を中心にスケール変更
function applyPinchZoom(newScale, pivotScreen) {
  const clamped = Math.max(SCALE_MIN, Math.min(SCALE_MAX, newScale));
  const ratio = clamped / view.scale;
  view.offsetX = pivotScreen.x - ratio * (pivotScreen.x - view.offsetX);
  view.offsetY = pivotScreen.y - ratio * (pivotScreen.y - view.offsetY);
  view.scale = clamped;
}

// 指定スケッチ座標が画面中央に来るようにビューをパン（異常警告ジャンプ用）
function jumpToSketchPos(sx, sy) {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  view.offsetX = w / 2 - sx * view.scale;
  view.offsetY = h / 2 - sy * view.scale;
  render();
}


/* ============================================================
   統一拘束ソルバー（planegcs ベース + BFSフォールバック）
   ============================================================ */

let _gcsReady = false;

async function initPlanegcs() {
  if (typeof PlanegcsLib === 'undefined') {
    console.warn('[solver] PlanegcsLib not found, using BFS fallback');
    return;
  }
  try {
    await PlanegcsLib.init();
    _gcsReady = true;
    console.log('[solver] planegcs ready');
  } catch (e) {
    console.warn('[solver] planegcs init failed, using BFS fallback:', e);
  }
}

function edgeSolverDir(e) {
  if (!e.direction) return null;
  if (e.direction.type === "horizontal") return "H";
  if (e.direction.type === "vertical") return "V";
  return null;
}

function edgeLenPx(e) {
  if (e.measurement.status === "measured" && e.measurement.length_m != null && state.scalePxPerMeter) {
    return e.measurement.length_m * state.scalePxPerMeter;
  }
  const va = state.vertices.find(v => v.id === e.from);
  const vb = state.vertices.find(v => v.id === e.to);
  if (!va || !vb) return 0;
  return Math.hypot(vb.x - va.x, vb.y - va.y);
}

function edgeSign(e, dir) {
  const va = state.vertices.find(v => v.id === e.from);
  const vb = state.vertices.find(v => v.id === e.to);
  if (!va || !vb) return 1;
  if (dir === "H") return vb.x >= va.x ? 1 : -1;
  return vb.y >= va.y ? 1 : -1;
}

function buildPrimitives(dragVid, tx, ty) {
  const primitives = [];
  let id = 1;
  const pidMap = {};
  const originId = state.coordinateSystem && state.coordinateSystem.originId;
  const isDrag = dragVid !== null && tx !== null && ty !== null;
  for (const v of state.vertices) {
    const pid = String(id++);
    pidMap[v.id] = pid;
    // ドラッグ時: 原点のみ固定、他はGCSが解く
    // recomputeLayout時(dragVid=null): 全頂点固定（頂点座標を変えない）
    const fixed = !isDrag || v.id === originId;
    primitives.push({ id: pid, type: 'point', x: v.x, y: v.y, fixed });
  }
  for (const e of state.edges) {
    const p1id = pidMap[e.from], p2id = pidMap[e.to];
    if (!p1id || !p2id) continue;
    const dir = edgeSolverDir(e);
    // direction（H/V）が無い辺でも、辺長拘束(p2p_distance)は独立して
    // ソルバーに送る必要がある。以前は dir が無い辺をここで continue
    // していたため、line/horizontal_l/vertical_l だけでなく p2p_distance
    // まで丸ごとスキップされてしまい、角度拘束のない辺長拘束辺が
    // 完全に無視される不具合の原因になっていた。
    if (dir) {
      const lid = String(id++);
      primitives.push({ id: lid, type: 'line', p1_id: p1id, p2_id: p2id });
      primitives.push({ id: String(id++), type: dir === 'H' ? 'horizontal_l' : 'vertical_l', l_id: lid });
    }
    // autoConstrained辺（対辺自動算出）は、方向拘束+ループ閉合条件から
    // 幾何学的に長さが導出されるため、ここで明示的な距離拘束を追加すると
    // 冗長拘束（過拘束）となりヤコビ行列が特異になってドラッグが効かなくなる。
    // よってソルバーには渡さず、表示・YAML出力上のみ「測定値」として扱う。
    if (e.constrained && !e.autoConstrained) {
      const lenPx = edgeLenPx(e);
      if (lenPx > 0) {
        primitives.push({ id: String(id++), type: 'p2p_distance',
          p1_id: p1id, p2_id: p2id, distance: lenPx });
      }
    }
  }
  if (dragVid && pidMap[dragVid]) {
    primitives.push({ id: String(id++), type: 'coordinate_x',
      p_id: pidMap[dragVid], x: tx, temporary: true });
    primitives.push({ id: String(id++), type: 'coordinate_y',
      p_id: pidMap[dragVid], y: ty, temporary: true });
  }
  return { primitives, pidMap };
}

// 直前のsolveConstraints呼び出しがBFSフォールバック経由だったかを追跡する。
// GCSが未初期化、または solve() が Failed を返した場合に true になる。
// ドラッグ終了時にこれを見て、拘束が正しく解けていない可能性をユーザーに警告する。
let _lastSolveUsedFallback = false;

function solveConstraints(dragVid, tx, ty) {
  if (_gcsReady && typeof PlanegcsLib !== 'undefined') {
    _solveWithGCS(dragVid, tx, ty);
  } else {
    _lastSolveUsedFallback = true;
    _solveWithBFS(dragVid, tx, ty);
  }
}

function _solveWithGCS(dragVid, tx, ty) {
  const { primitives, pidMap } = buildPrimitives(dragVid, tx, ty);
  const { status, points } = PlanegcsLib.solve(primitives);
  if (status === PlanegcsLib.SolveStatus.Failed) {
    console.warn('[solver] GCS failed, falling back to BFS');
    _lastSolveUsedFallback = true;
    _solveWithBFS(dragVid, tx, ty);
    return;
  }
  _lastSolveUsedFallback = false;
  for (const v of state.vertices) {
    const pid = pidMap[v.id];
    if (pid && points[pid]) { v.x = points[pid].x; v.y = points[pid].y; }
  }
}

function _solveWithBFS(dragVid, tx, ty) {
  const pending = new Map(), decided = new Map();
  decided.set(dragVid, { x: tx, y: ty });
  function enqueue(vid, x, y, prio) {
    const ex = pending.get(vid);
    if (!ex || prio < ex.priority) pending.set(vid, { x, y, priority: prio });
  }
  function propagate(vid, x, y) {
    for (const e of state.edges) {
      const isFrom = e.from === vid, isTo = e.to === vid;
      if (!isFrom && !isTo) continue;
      const nid = isFrom ? e.to : e.from;
      if (decided.has(nid)) continue;
      const dir = edgeSolverDir(e);
      if (!dir) continue;
      const nb = state.vertices.find(v => v.id === nid);
      if (!nb) continue;
      const sign = edgeSign(e, dir) * (isFrom ? 1 : -1);
      const lenPx = edgeLenPx(e);
      let nx, ny, prio;
      if (dir === "H") {
        ny = y;
        if (e.constrained) { nx = x + sign * lenPx; prio = 0; }
        else { nx = nb.x; prio = 1; }
      } else {
        nx = x;
        if (e.constrained) { ny = y + sign * lenPx; prio = 0; }
        else { ny = nb.y; prio = 1; }
      }
      enqueue(nid, nx, ny, prio);
    }
  }
  propagate(dragVid, tx, ty);
  let safety = 0;
  while (pending.size > 0 && safety++ < 200) {
    let bestId = null, bestEntry = null;
    for (const [vid, entry] of pending) {
      if (!bestEntry || entry.priority < bestEntry.priority) { bestId = vid; bestEntry = entry; }
    }
    pending.delete(bestId);
    if (decided.has(bestId)) continue;
    decided.set(bestId, { x: bestEntry.x, y: bestEntry.y });
    propagate(bestId, bestEntry.x, bestEntry.y);
  }
  for (const [vid, pos] of decided) {
    const v = state.vertices.find(vv => vv.id === vid);
    if (v) { v.x = pos.x; v.y = pos.y; }
  }
}

function inferRectangleConstraints() {
  let changed = false;
  const dirEdges = state.edges.filter(e => edgeSolverDir(e));

  function has90(vid) {
    const v = state.vertices.find(vv => vv.id === vid);
    if (!v || !v.constraints) return false;
    return v.constraints.some(c => c.type === "angle" && c.value === 90);
  }

  const visited4 = new Set();
  for (const startE of dirEdges) {
    const loop = findFourVertexLoop(startE.from, dirEdges);
    if (!loop) continue;
    const key = loop.vertexIds.slice().sort().join(",");
    if (visited4.has(key)) continue;
    if (!loop.vertexIds.every(has90)) continue;
    visited4.add(key);

    const hEdges = loop.edges.filter(e => edgeSolverDir(e) === "H");
    const vEdges = loop.edges.filter(e => edgeSolverDir(e) === "V");

    for (const pair of [hEdges, vEdges]) {
      if (pair.length !== 2) continue;
      const [e1, e2] = pair;
      if (e1.constrained && !e2.constrained && e1.measurement.status === "measured") {
        e2.constrained = true;
        e2.measurement.status = "measured";
        e2.measurement.length_m = e1.measurement.length_m;
        e2.measurement.estimated_length_m = e1.measurement.length_m; // ラベル表示用
        e2.measurement.measured_at = null;
        e2.autoConstrained = true;
        changed = true;
      } else if (e2.constrained && !e1.constrained && e2.measurement.status === "measured") {
        e1.constrained = true;
        e1.measurement.status = "measured";
        e1.measurement.length_m = e2.measurement.length_m;
        e1.measurement.estimated_length_m = e2.measurement.length_m; // ラベル表示用
        e1.measurement.measured_at = null;
        e1.autoConstrained = true;
        changed = true;
      }
    }
  }
  return changed;
}

/**
 * autoConstrained（対辺自動算出）辺の妥当性を再検証する。
 * inferRectangleConstraints() による対辺自動拘束は「単純な4頂点の直角ループ」
 * であることを前提に、対辺への距離拘束をソルバーへ送らず冗長性を排除している
 * （buildPrimitives参照）。しかし矩形突出しや頂点削除・辺分割でループが
 * 複雑化すると、この冗長性の保証が崩れ、対辺の長さが実際には拘束されない
 * まま「拘束済み」表示だけが残ってしまう（ドラッグで辺長が変わってしまう
 * のに寸法表示が更新されない不具合の原因）。
 * トポロジ変更のたびに呼び出し、単純ループでなくなったautoConstrained辺は
 * 明示拘束（autoConstrained=false）に格上げし、ソルバーに実際の距離拘束
 * として渡されるようにする（測定値・表示はそのまま維持）。
 */
function revalidateAutoConstraints() {
  const dirEdges = state.edges.filter(e => edgeSolverDir(e));
  function has90(vid) {
    const v = state.vertices.find(vv => vv.id === vid);
    return !!(v && v.constraints && v.constraints.some(c => c.type === "angle" && c.value === 90));
  }
  for (const e of state.edges) {
    if (!e.autoConstrained) continue;
    const loop = findFourVertexLoop(e.from, dirEdges);
    const dir = edgeSolverDir(e);
    const stillValid = !!loop
      && loop.edges.includes(e)
      && loop.vertexIds.every(has90)
      && loop.edges.some(le => le !== e && edgeSolverDir(le) === dir && le.constrained && le.measurement.status === "measured");
    if (!stillValid) {
      e.autoConstrained = false; // 冗長性の保証が崩れたため明示拘束としてソルバーに渡す
    }
  }
}

function findFourVertexLoop(startVid, dirEdges) {
  function neighbors(vid) {
    return dirEdges
      .filter(e => e.from === vid || e.to === vid)
      .map(e => ({ nid: e.from === vid ? e.to : e.from, edge: e }));
  }
  function dfs(path, edgePath, depth) {
    if (depth === 4) {
      return path[path.length - 1] === startVid
        ? { vertexIds: path.slice(0, 4), edges: edgePath }
        : null;
    }
    const last = path[path.length - 1];
    for (const { nid, edge } of neighbors(last)) {
      if (edgePath.includes(edge)) continue;
      if (depth < 3 && path.includes(nid)) continue;
      const result = dfs([...path, nid], [...edgePath, edge], depth + 1);
      if (result) return result;
    }
    return null;
  }
  return dfs([startVid], [], 0);
}

function recomputeLayout() {
  if (!state.scalePxPerMeter) return;
  const activEdges = state.edges.filter(e => e.constrained && edgeSolverDir(e) && e.measurement.status === "measured");
  if (activEdges.length === 0) return;
  const score = {};
  for (const v of state.vertices) score[v.id] = 0;
  for (const e of activEdges) { score[e.from] = (score[e.from]||0)+1; score[e.to] = (score[e.to]||0)+1; }
  let bestVid = null, bestScore = -1;
  for (const [vid, s] of Object.entries(score)) { if (s > bestScore) { bestScore = s; bestVid = vid; } }
  if (!bestVid) return;
  const anchor = state.vertices.find(v => v.id === bestVid);
  solveConstraints(bestVid, anchor.x, anchor.y);
  render();
}

let _snapActive = false;

function saveDragInitial() {} // GCSソルバーでは不要（後方互換のため残す）


canvas.addEventListener("pointerdown", (evt) => {
  canvas.setPointerCapture(evt.pointerId);
  const spos = getScreenPos(evt);
  activePointers.set(evt.pointerId, spos);

  // 2本指以上: ピンチ開始、描画系操作を中断
  if (activePointers.size >= 2) {
    isPinching = true;
    isDrawing = false;
    isDraggingVertex = false;
    clearTimeout(longPressTimer);
    state.rawStroke = [];
    const pts = [...activePointers.values()];
    lastPinchDist = screenDist(pts[0], pts[1]);
    lastPinchMid = screenMidpoint(pts[0], pts[1]);
    render();
    return;
  }

  isPinching = false;
  pointerDownPos = spos;
  const pos = getCanvasPos(evt);

  if (state.tool === "draw") {
    isDrawing = true;
    state.rawStroke = [pos];

  } else if (state.tool === "edit") {
    const v = findVertexAt(pos.x, pos.y, screenToSketchRadius(VERTEX_HIT_RADIUS));
    if (v) {
      // ダブルタップ検出
      const now = Date.now();
      const isDoubleTap = (now - lastTapTime < DOUBLETAP_MS) && (lastTapTarget === v.id);
      lastTapTime = now;
      lastTapTarget = v.id;

      if (isDoubleTap) {
        // ダブルタップ → 削除プロンプト
        lastTapTime = 0; lastTapTarget = null;
        if (confirm(`頂点 ${v.id} を削除しますか？`)) {
          pushHistory();
          deleteVertex(v.id);
          showToast(`頂点 ${v.id} を削除しました`);
        }
        return;
      }

      isDraggingVertex = true;
      state.draggedVertexMoved = false;
      state.selectedVertex = v;
      longPressVertex = v;
      pushHistory();
      saveDragInitial();

      longPressTimer = setTimeout(() => {
        if (!state.draggedVertexMoved) {
          state.history.pop();
          isDraggingVertex = false;
          state.selectedVertex = null;
          openVertexCtxMenu(v, spos.x, spos.y);
        }
      }, LONGPRESS_MS);

    } else {
      const e = findEdgeAt(pos.x, pos.y, screenToSketchRadius(EDGE_HIT_RADIUS));
      if (e) {
        e._insertPos = { x: pos.x, y: pos.y };
        longPressTimer = setTimeout(() => {
          openEdgeCtxMenu(e, spos.x, spos.y);
        }, LONGPRESS_MS);
      }
    }

  } else if (state.tool === "measure") {
    const e = findEdgeAt(pos.x, pos.y, screenToSketchRadius(20));
    if (e) { openMeasureForm(e, "edge"); return; }
    const d = findDiagonalAt(pos.x, pos.y, screenToSketchRadius(20));
    if (d) { openMeasureForm(d, "diagonal"); return; }

  } else if (state.tool === "diagonal") {
    const v = findVertexAt(pos.x, pos.y, screenToSketchRadius(VERTEX_HIT_RADIUS));
    if (v) {
      if (!state.diagonalFirstVertex) {
        state.diagonalFirstVertex = v.id;
        setHint(`頂点 ${v.id} を選択しました。もう1つの頂点をタップして対角線を作成してください。`);
        render();
      } else if (state.diagonalFirstVertex !== v.id) {
        pushHistory();
        const v1 = state.vertices.find(vv => vv.id === state.diagonalFirstVertex);
        const pxLen = pxDistance(v1, v);
        const d = { id: "D" + state.nextDiagId++, from: state.diagonalFirstVertex, to: v.id, measurement: newMeasurement() };
        d.measurement.estimated_length_m = estimateLengthM(pxLen);
        state.diagonals.push(d);
        state.diagonalFirstVertex = null;
        persistState();
        updateStats();
        showToast(`対角線 ${d.id} を作成しました`);
        render();
      }
    }
  } else if (state.tool === "source") {
    const src = findSourceAt(pos.x, pos.y);
    if (src) {
      // 既存音源: ドラッグ開始
      _draggingSource = src;
      _srcDragOffX = src.sketchX - pos.x;
      _srcDragOffY = src.sketchY - pos.y;
      state.selectedSourceId = src.id;
      renderSourceList();
    } else {
      // 空白長押しで音源追加
      longPressTimer = setTimeout(() => {
        openSourceModal(null, { x: pos.x, y: pos.y });
      }, LONGPRESS_MS);
    }
  }
});

canvas.addEventListener("pointermove", (evt) => {
  const spos = getScreenPos(evt);
  activePointers.set(evt.pointerId, spos);

  // ピンチ中: ズーム＋パン処理
  if (activePointers.size >= 2 && isPinching) {
    const pts = [...activePointers.values()];
    const newDist = screenDist(pts[0], pts[1]);
    const newMid = screenMidpoint(pts[0], pts[1]);
    if (lastPinchDist !== null && lastPinchDist > 0) {
      applyPinchZoom(view.scale * (newDist / lastPinchDist), lastPinchMid);
      view.offsetX += newMid.x - lastPinchMid.x;
      view.offsetY += newMid.y - lastPinchMid.y;
    }
    lastPinchDist = newDist;
    lastPinchMid = newMid;
    render();
    return;
  }

  if (isPinching) return;

  const pos = getCanvasPos(evt);

  // 音源ドラッグ
  if (state.tool === "source" && _draggingSource) {
    const moveDist = pointerDownPos ? Math.hypot(spos.x - pointerDownPos.x, spos.y - pointerDownPos.y) : 999;
    if (moveDist > 8) clearTimeout(longPressTimer);
    _draggingSource.sketchX = pos.x + _srcDragOffX;
    _draggingSource.sketchY = pos.y + _srcDragOffY;
    const mp = sketchToM(_draggingSource.sketchX, _draggingSource.sketchY);
    _draggingSource.posX = mp.x; _draggingSource.posY = mp.y;
    render();
    return;
  }

  if (state.tool === "draw" && isDrawing) {
    state.rawStroke.push(pos);
    render();

  } else if (state.tool === "edit" && isDraggingVertex && state.selectedVertex) {
    const moveDist = pointerDownPos ? Math.hypot(spos.x - pointerDownPos.x, spos.y - pointerDownPos.y) : 999;
    if (moveDist > LONGPRESS_MOVE_TOLERANCE) {
      state.draggedVertexMoved = true;
      clearTimeout(longPressTimer);
    }
    if (state.draggedVertexMoved) {
      const v = state.selectedVertex;
      _snapActive = false;
      // 常にソルバー経由で解決する。以前はdirection(H/V)拘束を持つ辺が
      // 無い頂点はソルバーを完全にバイパスして直接座標を書き換えていたが、
      // これだと辺長拘束(p2p_distance)しか持たない頂点（角度拘束なし）の
      // 場合に拘束が一切無視されて自由に動いてしまう不具合があった。
      // solveConstraints側は拘束が無い場合でも問題なくドラッグ目標へ
      // 収束するため、常に呼び出して問題ない。
      solveConstraints(v.id, pos.x, pos.y);
      render();
    }
  }
});

canvas.addEventListener("pointerup", (evt) => {
  clearTimeout(longPressTimer);
  activePointers.delete(evt.pointerId);

  if (activePointers.size < 2) {
    lastPinchDist = null;
    lastPinchMid = null;
    if (activePointers.size === 0) isPinching = false;
  }
  if (isPinching) return;

  // 音源ドラッグ終了
  if (_draggingSource) {
    persistState(); updateStats(); renderSourceList(); render();
    _draggingSource = null;
    return;
  }

  if (state.tool === "draw" && isDrawing) {
    isDrawing = false;
    const stroke = state.rawStroke;
    state.rawStroke = [];
    // --- 短ストロークフィルター（30px未満は無視） ---
    if (strokeLengthPx(stroke) < SHORT_STROKE_PX) {
      render();
      return;
    }
    buildPolygonFromStroke(stroke);

  } else if (state.tool === "edit" && isDraggingVertex) {
    isDraggingVertex = false;
    if (state.selectedVertex && state.draggedVertexMoved) {
      // 方向拘束なし辺のみ invalidated にする（方向拘束辺はソルバーが整合性を保つ）
      invalidateEdgesOfVertex(state.selectedVertex.id, { skipDirectionConstrained: true });
      if (_lastSolveUsedFallback) {
        // 直前のドラッグ解決がBFSフォールバック（GCS未初期化 or Failed）経由だった場合、
        // 拘束が正しく満たされていない可能性があるため警告する。
        showToast("⚠️ ソルバーがフォールバック処理で解決しました。拘束が満たされていない可能性があります");
      }
      updateStats();
      persistState();
    } else if (!state.draggedVertexMoved && state.history.length > 0) {
      state.history.pop();
    }
    state.selectedVertex = null;
    render();
  }
});

canvas.addEventListener("pointercancel", (evt) => {
  activePointers.delete(evt.pointerId);
  isDrawing = false; isDraggingVertex = false;
  clearTimeout(longPressTimer);
  if (activePointers.size < 2) { lastPinchDist = null; lastPinchMid = null; }
  if (activePointers.size === 0) isPinching = false;
});

/* ============================================================
   長方形スケール校正UI
   ============================================================ */
function openRectScaleUI() {
  document.getElementById("rectScalePanel").classList.add("visible");
  document.getElementById("hintText").style.display = "none";
  renderRectSideButtons();
}

function closeRectScaleUI() {
  document.getElementById("rectScalePanel").classList.remove("visible");
  document.getElementById("hintText").style.display = "block";
}

function renderRectSideButtons() {
  const rect = state.pendingRect;
  const container = document.getElementById("rectSideBtns");
  container.innerHTML = "";
  rect.sides.forEach((side, i) => {
    const btn = document.createElement("button");
    btn.className = "rect-side-btn" + (rect.selectedSide === i ? " selected" : "");
    btn.textContent = side.label;
    btn.addEventListener("click", () => {
      rect.selectedSide = i;
      renderRectSideButtons();
      document.getElementById("rectLengthInput").focus();
      render();
    });
    container.appendChild(btn);
  });
}

document.getElementById("confirmRectScale").addEventListener("click", () => {
  const rect = state.pendingRect;
  if (rect.selectedSide === null) {
    showToast("長さを入力する辺を選んでください"); return;
  }
  const val = parseFloat(document.getElementById("rectLengthInput").value);
  if (isNaN(val) || val <= 0) {
    showToast("正しい数値を入力してください"); return;
  }
  commitRect(rect.selectedSide, val);
});

document.getElementById("skipRectScale").addEventListener("click", () => {
  const rect = state.pendingRect;
  state.firstStrokeDone = true;
  state.pendingRect = null;
  closeRectScaleUI();
  pushHistory();
  const dirs = ["horizontal", "vertical", "horizontal", "vertical"];
  const verts = rect.corners.map(c => addVertex(c.x, c.y));
  for (let i = 0; i < 4; i++) {
    const v1 = verts[i], v2 = verts[(i + 1) % 4];
    const e = addEdge(v1.id, v2.id, null);
    e.direction = { type: dirs[i] };
  }
  for (const v of verts) v.constraints = [{ type: "angle", value: 90 }];
  state.coordinateSystem = { originId: verts[0].id, xAxisId: verts[1].id };
  updateStats(); persistState(); render();
  setHint("長方形を生成しました。測距モードで各辺を測定してください。");
});

/* ============================================================
   測距フォーム（合意事項②: 無効化救済UI込み）
   ============================================================ */
function openMeasureForm(target, kind) {
  state.pendingMeasureTarget = target;
  state.pendingMeasureKind = kind;
  const form = document.getElementById("measure-form");
  const title = document.getElementById("measureFormTitle");
  const input = document.getElementById("lengthInput");
  const prevBox = document.getElementById("prevValueBox");
  const prevText = document.getElementById("prevValueText");
  const restoreBtn = document.getElementById("restorePrev");

  const m = target.measurement;
  title.textContent = `${kind === "edge" ? "辺" : "対角線"} ${target.id} (${target.from}–${target.to}) の実測値`;

  // 現在の頂点座標からリアルタイム辺長を計算（スケールあり時のみ）
  function currentLengthM() {
    const va = state.vertices.find(v => v.id === target.from);
    const vb = state.vertices.find(v => v.id === target.to);
    if (va && vb && state.scalePxPerMeter) {
      return Math.hypot(vb.x - va.x, vb.y - va.y) / state.scalePxPerMeter;
    }
    return null;
  }

  if (m.status === "invalidated" && m.previous_length_m != null) {
    prevBox.style.display = "block";
    prevText.textContent = `${m.previous_length_m.toFixed(3)} m`;
    restoreBtn.style.display = "block";
    // 初期値: 現在の辺長（スケールあり）> 前回値
    const cur = currentLengthM();
    input.value = cur !== null ? cur.toFixed(3) : m.previous_length_m;
  } else {
    prevBox.style.display = "none";
    restoreBtn.style.display = "none";
    // 初期値: 現在の辺長（スケールあり）> length_m > estimated_length_m > 空
    const cur = currentLengthM();
    if (cur !== null) {
      input.value = cur.toFixed(3);
    } else if (m.length_m !== null) {
      input.value = m.length_m;
    } else if (m.estimated_length_m != null) {
      input.value = m.estimated_length_m.toFixed(2);
    } else {
      input.value = "";
    }
  }

  form.classList.add("visible");
  document.getElementById("hintText").style.display = "none";
  input.focus();
  render();
}

function closeMeasureForm() {
  state.pendingMeasureTarget = null;
  document.getElementById("measure-form").classList.remove("visible");
  // rectScalePanel が残っていれば閉じる
  document.getElementById("rectScalePanel").classList.remove("visible");
  document.getElementById("hintText").style.display = "block";
  render();
}

function commitMeasurement(value) {
  pushHistory();
  const t = state.pendingMeasureTarget;
  t.measurement.length_m = value;
  t.measurement.status = "measured";
  t.measurement.previous_length_m = null;
  t.measurement.measured_at = new Date().toISOString();

  // スケール未設定かつ辺が方向拘束あり → この測定値からスケールを自動設定
  if (!state.scalePxPerMeter && state.pendingMeasureKind === "edge") {
    const va = state.vertices.find(v => v.id === t.from);
    const vb = state.vertices.find(v => v.id === t.to);
    if (va && vb && value > 0) {
      const pxLen = Math.hypot(vb.x - va.x, vb.y - va.y);
      if (pxLen > 0) {
        state.scalePxPerMeter = pxLen / value;
        document.getElementById("scaleBadge").classList.add("visible");
        document.getElementById("scaleValue").textContent =
          `${state.scalePxPerMeter.toFixed(1)} px/m`;
        showToast(`スケール設定: 1m = ${state.scalePxPerMeter.toFixed(1)}px`);
      }
    }
  }

  // 辺長拘束を自動付与（対角線は拘束なし）
  if (state.pendingMeasureKind === "edge") {
    t.constrained = true;
    inferRectangleConstraints();
    recomputeLayout();
  }
  updateStats();
  persistState();
  closeMeasureForm();
}

document.getElementById("confirmMeasure").addEventListener("click", () => {
  const val = parseFloat(document.getElementById("lengthInput").value);
  if (isNaN(val) || val <= 0) { showToast("正しい数値を入力してください"); return; }
  commitMeasurement(val);
});

document.getElementById("restorePrev").addEventListener("click", () => {
  const m = state.pendingMeasureTarget.measurement;
  commitMeasurement(m.previous_length_m);
  showToast("前回値で確定しました");
});

document.getElementById("cancelMeasure").addEventListener("click", closeMeasureForm);

/* ============================================================
   高さ入力フォーム
   ============================================================ */
function renderHeightForm() {
  const list = document.getElementById("heightList");
  list.innerHTML = "";
  if (state.vertices.length === 0) {
    list.innerHTML = `<div class="hint" style="padding:4px 0;">先に床ポリゴンを描いてください。</div>`;
    return;
  }
  for (const v of state.vertices) {
    const h = state.heights[v.id] || { status: "unmeasured", height_m: null };
    const row = document.createElement("div");
    row.className = "height-row";
    row.innerHTML = `
      <span class="vid">${v.id}</span>
      <input type="number" inputmode="decimal" step="0.01" placeholder="高さ[m]" value="${h.height_m ?? ""}" data-vid="${v.id}">
      <span class="h-status ${h.status}">${h.status === "measured" ? "測定済" : "未測定"}</span>
    `;
    list.appendChild(row);
  }
  list.querySelectorAll("input").forEach(inp => {
    inp.addEventListener("change", () => {
      const vid = inp.dataset.vid;
      const raw = inp.value.trim();
      if (raw === "") {
        // 空欄にした場合は未測定に戻す
        state.heights[vid] = { status: "unmeasured", height_m: null };
        persistState();
        updateStats();
        renderHeightForm();
        return;
      }
      const val = parseFloat(raw);
      if (!isNaN(val) && val > 0) {
        state.heights[vid] = { status: "measured", height_m: val };
        persistState();
        updateStats();
        renderHeightForm();
      }
    });
  });
}

/* ============================================================
   天井高一括入力
   ============================================================ */
document.getElementById("applyBulkHeight").addEventListener("click", () => {
  const val = parseFloat(document.getElementById("bulkHeightInput").value);
  if (isNaN(val) || val <= 0) {
    showToast("正しい高さを入力してください"); return;
  }
  if (state.vertices.length === 0) {
    showToast("先に床ポリゴンを描いてください"); return;
  }
  pushHistory();
  for (const v of state.vertices) {
    state.heights[v.id] = { status: "measured", height_m: val };
  }
  persistState();
  updateStats();
  renderHeightForm();
  showToast(`全頂点に天井高 ${val}m を適用しました`);
});

/* ============================================================
   ツールバー
   ============================================================ */
document.querySelectorAll(".tool-btn[data-tool]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tool-btn[data-tool]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.tool = btn.dataset.tool;
    state.diagonalFirstVertex = null;
    closeMeasureForm();
    closeSourceModal();
    closeSourceListPanel();
    document.getElementById("height-form").classList.remove("visible");
    document.getElementById("hintText").style.display = "block";
    if (state.pendingRect) { state.pendingRect = null; closeRectScaleUI(); }

    const badge = document.getElementById("modeBadge");
    badge.className = "mode-badge";
    const hints = {
      draw:     ["mode-draw",    "DRAW",    "指でなぞって平面の概形を描いてください。ペンアップで自動的に直線化されます。"],
      edit:     ["mode-edit",    "EDIT",    "頂点をドラッグで移動、長押しで削除。辺の途中をタップすると頂点を追加できます。"],
      measure:  ["mode-measure", "MEASURE", "実測値を入力したい辺または対角線をタップしてください。"],
      diagonal: ["mode-edit",    "DIAGONAL","対角線を引きたい頂点を2つ順にタップしてください。"],
      height:   ["mode-height",  "HEIGHT",  "各頂点の高さを下のリストに入力してください。"],
      source:   ["mode-source",  "SOURCE",  "長押しで音源を配置。アイコンをドラッグで移動できます。"],
    };
    const [cls, label, hint] = hints[state.tool] || hints.draw;
    badge.classList.add(cls);
    badge.textContent = label;
    setHint(hint);

    if (state.tool === "height") {
      document.getElementById("height-form").classList.add("visible");
      renderHeightForm();
    } else if (state.tool === "source") {
      openSourceListPanel();
    }
    render();
  });
});

document.getElementById("undoBtn").addEventListener("click", undo);

document.getElementById("clearBtn").addEventListener("click", () => {
  if (!confirm("全てのデータを消去しますか？この操作は取り消せません。")) return;
  state.vertices = []; state.edges = []; state.diagonals = [];
  state.heights = {}; state.sources = [];
  state.nextVertexId = 0; state.nextEdgeId = 0; state.nextDiagId = 0; state.nextSourceId = 0;
  state.scalePxPerMeter = null; state.firstStrokeDone = false;
  state.history = [];
  document.getElementById("scaleBadge").classList.remove("visible");
  updateStats();
  persistState();
  render();
});

/* ============================================================
   音源モード
   ============================================================ */
const SOURCE_HIT_RADIUS = 24;
let _draggingSource = null;
let _srcDragOffX = 0, _srcDragOffY = 0;

function findSourceAt(sx, sy) {
  const r = SOURCE_HIT_RADIUS / view.scale;
  for (const src of state.sources) {
    if (Math.hypot(src.sketchX - sx, src.sketchY - sy) < r) return src;
  }
  return null;
}

function sketchToM(sketchX, sketchY) {
  // 座標系原点（P0）基準で計算
  let ox = 0, oy = 0;
  if (state.coordinateSystem && state.coordinateSystem.originId) {
    const vo = state.vertices.find(v => v.id === state.coordinateSystem.originId);
    if (vo) { ox = vo.x; oy = vo.y; }
  }
  if (!state.scalePxPerMeter) {
    return {
      x: parseFloat((sketchX - ox).toFixed(1)),
      y: parseFloat((sketchY - oy).toFixed(1)),
    };
  }
  return {
    x: parseFloat(((sketchX - ox) / state.scalePxPerMeter).toFixed(3)),
    y: parseFloat(((sketchY - oy) / state.scalePxPerMeter).toFixed(3)),
  };
}

function mToSketch(mx, my) {
  let ox = 0, oy = 0;
  if (state.coordinateSystem && state.coordinateSystem.originId) {
    const vo = state.vertices.find(v => v.id === state.coordinateSystem.originId);
    if (vo) { ox = vo.x; oy = vo.y; }
  }
  if (!state.scalePxPerMeter) return { x: mx + ox, y: my + oy };
  return {
    x: mx * state.scalePxPerMeter + ox,
    y: my * state.scalePxPerMeter + oy,
  };
}

// 音源追加モーダル
function openSourceModal(editSrc, defaultPos) {
  const modal = document.getElementById("source-modal");
  const title = document.getElementById("sourceModalTitle");
  if (editSrc) {
    title.textContent = `音源 ${editSrc.name} を編集`;
    document.getElementById("sourceNameInput").value = editSrc.name;
    document.getElementById("sourceZInput").value = editSrc.z;
    document.getElementById("sourceRadiusInput").value = editSrc.radius;
    document.getElementById("sourceFluxInput").value = String(editSrc.flux_real);
  } else {
    const n = state.sources.length + 1;
    title.textContent = "音源を追加";
    document.getElementById("sourceNameInput").value = `speaker_${n === 1 ? "L" : n === 2 ? "R" : n}`;
    document.getElementById("sourceZInput").value = "1.5";
    document.getElementById("sourceRadiusInput").value = "0.13";
    document.getElementById("sourceFluxInput").value = "1.0";
  }
  state._editingSource = editSrc || null;
  state._pendingSourcePos = defaultPos || null;
  modal.classList.add("visible");
}

function closeSourceModal() {
  document.getElementById("source-modal").classList.remove("visible");
  state._editingSource = null;
  state._pendingSourcePos = null;
}

document.getElementById("confirmSource").addEventListener("click", () => {
  const name = document.getElementById("sourceNameInput").value.trim() || `speaker_${state.nextSourceId + 1}`;
  const z = parseFloat(document.getElementById("sourceZInput").value);
  const radius = parseFloat(document.getElementById("sourceRadiusInput").value) || 0.13;
  const flux_real = parseFloat(document.getElementById("sourceFluxInput").value) || 1.0;
  if (isNaN(z)) { showToast("Z高さを入力してください"); return; }

  pushHistory();
  if (state._editingSource) {
    const src = state._editingSource;
    src.name = name; src.z = z; src.radius = radius; src.flux_real = flux_real;
    showToast(`音源 ${name} を更新しました`);
  } else {
    const sp = state._pendingSourcePos || { x: 200, y: 200 };
    const pos = sketchToM(sp.x, sp.y);
    const newSrc = {
      id: "S" + state.nextSourceId++,
      name, sketchX: sp.x, sketchY: sp.y,
      posX: pos.x, posY: pos.y,
      z, radius, flux_real, flux_imag: 0.0,
      directivity: { type: "omnidirectional", angle_deg: null, spread_deg: null },
    };
    state.sources.push(newSrc);
    state.selectedSourceId = newSrc.id;
    showToast(`音源 ${name} を追加しました`);
  }
  persistState(); updateStats(); closeSourceModal(); renderSourceList(); render();
});

document.getElementById("cancelSource").addEventListener("click", closeSourceModal);
document.getElementById("addSourceBtn").addEventListener("click", () => openSourceModal(null, null));

// 音源一覧パネルの描画
function renderSourceList() {
  const list = document.getElementById("sourceList");
  list.innerHTML = "";
  if (state.sources.length === 0) {
    list.innerHTML = '<div style="font-size:0.72rem;color:var(--color-text-dim);padding:8px 0;">音源がありません。「＋ 追加」で追加してください。</div>';
    return;
  }
  for (const src of state.sources) {
    const isSelected = state.selectedSourceId === src.id;
    const row = document.createElement("div");
    row.className = "source-row" + (isSelected ? " selected" : "");

    row.innerHTML = `
      <div class="source-row-header">
        <span class="source-name">🔊 ${src.name}</span>
        <div style="display:flex;gap:6px;">
          <button class="nudge-btn" style="flex:none;padding:3px 8px;" data-edit="${src.id}">✏️ 編集</button>
          <button class="source-del-btn" data-del="${src.id}">🗑 削除</button>
        </div>
      </div>
      ${isSelected ? `
      <div class="source-coords">
        <div class="source-coord-item">
          <label>X [m]</label>
          <input type="number" class="src-x" data-id="${src.id}" value="${src.posX}" step="0.1" inputmode="decimal">
        </div>
        <div class="source-coord-item">
          <label>Y [m]</label>
          <input type="number" class="src-y" data-id="${src.id}" value="${src.posY}" step="0.1" inputmode="decimal">
        </div>
        <div class="source-coord-item">
          <label>Z [m]</label>
          <input type="number" class="src-z" data-id="${src.id}" value="${src.z}" step="0.1" inputmode="decimal">
        </div>
      </div>
      <div class="source-nudge-row">
        <button class="nudge-btn" data-nudge="${src.id}" data-dx="-0.1" data-dy="0">← X-</button>
        <button class="nudge-btn" data-nudge="${src.id}" data-dx="0.1" data-dy="0">X+ →</button>
        <button class="nudge-btn" data-nudge="${src.id}" data-dx="0" data-dy="-0.1">↑ Y-</button>
        <button class="nudge-btn" data-nudge="${src.id}" data-dx="0" data-dy="0.1">Y+ ↓</button>
        <button class="nudge-btn" data-nudge="${src.id}" data-dz="-0.1">Z- ▽</button>
        <button class="nudge-btn" data-nudge="${src.id}" data-dz="0.1">Z+ △</button>
      </div>` : `<div style="font-size:0.7rem;color:var(--color-text-dim);">x:${src.posX} y:${src.posY} z:${src.z}m</div>`}
    `;

    // タップで選択
    row.addEventListener("pointerdown", (e) => {
      if (e.target.closest("[data-del],[data-edit],[data-nudge],.src-x,.src-y,.src-z")) return;
      state.selectedSourceId = isSelected ? null : src.id;
      renderSourceList(); render();
    });

    // 直接数値入力
    row.querySelectorAll(".src-x,.src-y,.src-z").forEach(inp => {
      inp.addEventListener("change", () => {
        const id = inp.dataset.id;
        const s = state.sources.find(ss => ss.id === id);
        if (!s) return;
        pushHistory();
        if (inp.classList.contains("src-x")) { s.posX = parseFloat(inp.value)||s.posX; }
        else if (inp.classList.contains("src-y")) { s.posY = parseFloat(inp.value)||s.posY; }
        else if (inp.classList.contains("src-z")) { s.z = parseFloat(inp.value)||s.z; }
        // スケッチ座標も更新
        const sk = mToSketch(s.posX, s.posY);
        s.sketchX = sk.x; s.sketchY = sk.y;
        persistState(); updateStats(); renderSourceList(); render();
      });
      inp.addEventListener("pointerdown", e => e.stopPropagation());
    });

    // ナッジボタン
    row.querySelectorAll("[data-nudge]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.dataset.nudge;
        const s = state.sources.find(ss => ss.id === id);
        if (!s) return;
        pushHistory();
        const dx = parseFloat(btn.dataset.dx||0), dy = parseFloat(btn.dataset.dy||0), dz = parseFloat(btn.dataset.dz||0);
        s.posX = parseFloat((s.posX + dx).toFixed(3));
        s.posY = parseFloat((s.posY + dy).toFixed(3));
        s.z = parseFloat((s.z + dz).toFixed(3));
        const sk = mToSketch(s.posX, s.posY);
        s.sketchX = sk.x; s.sketchY = sk.y;
        persistState(); updateStats(); renderSourceList(); render();
      });
    });

    // 編集ボタン
    row.querySelector("[data-edit]")?.addEventListener("click", (e) => {
      e.stopPropagation();
      openSourceModal(src, null);
    });

    // 削除ボタン
    row.querySelector("[data-del]")?.addEventListener("click", (e) => {
      e.stopPropagation();
      pushHistory();
      state.sources = state.sources.filter(s => s.id !== src.id);
      if (state.selectedSourceId === src.id) state.selectedSourceId = null;
      persistState(); updateStats(); renderSourceList(); render();
      showToast(`音源 ${src.name} を削除しました`);
    });

    list.appendChild(row);
  }
}

// 音源パネルの開閉
function openSourceListPanel() {
  document.getElementById("source-list-panel").classList.add("visible");
  document.getElementById("hintText").style.display = "none";
  renderSourceList();
}

function closeSourceListPanel() {
  document.getElementById("source-list-panel").classList.remove("visible");
  document.getElementById("hintText").style.display = "block";
  state.selectedSourceId = null;
}

function setHint(text) { document.getElementById("hintText").textContent = text; }

function updateStats() {
  document.getElementById("statVerts").textContent = state.vertices.length;
  document.getElementById("statEdges").textContent = state.edges.length + state.diagonals.length;
  const all = [...state.edges, ...state.diagonals];
  const measured = all.filter(x => x.measurement.status === "measured").length;
  const invalidated = all.filter(x => x.measurement.status === "invalidated").length;
  const unmeasured = all.filter(x => x.measurement.status === "unmeasured").length;
  document.getElementById("statMeasured").textContent = measured;
  document.getElementById("statInvalidated").textContent = invalidated;
  document.getElementById("statUnmeasured").textContent = unmeasured;

  // --- リアルタイム異常検出 ---
  updateAnomalyWarnings();
  // --- Validationサマリー更新（現地データ生成可否の目安） ---
  updateValidationBar();
}

/* ============================================================
   Validation（現地データ生成前の検証）
   ============================================================ */

// 一筆書きルール（頂点の辺接続数=2）違反を検出。diagonalsは対象外。
function checkOneStrokeRule() {
  const degree = {};
  for (const v of state.vertices) degree[v.id] = 0;
  for (const e of state.edges) {
    if (degree[e.from] !== undefined) degree[e.from]++;
    if (degree[e.to] !== undefined) degree[e.to]++;
  }
  const violations = [];
  for (const v of state.vertices) {
    const d = degree[v.id] || 0;
    if (d !== 2) violations.push({ vertexId: v.id, degree: d });
  }
  return violations;
}

// 線分p1-p2とp3-p4が「端点共有ではなく」実際に交差するかを方向判定で確認
function segmentsProperlyIntersect(p1, p2, p3, p4) {
  function orient(a, b, c) {
    const val = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    if (Math.abs(val) < 1e-9) return 0;
    return val > 0 ? 1 : -1;
  }
  const d1 = orient(p3, p4, p1);
  const d2 = orient(p3, p4, p2);
  const d3 = orient(p1, p2, p3);
  const d4 = orient(p1, p2, p4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
         ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

// 辺同士の自己交差を検出。連結成分（部屋ポリゴン）をまたぐペアも対象に含める。
// 端点を共有する辺（同一多角形の隣接辺・意図的に頂点が一致する部屋境界）は除外。
function checkSelfIntersection() {
  const edges = state.edges;
  const violations = [];
  for (let i = 0; i < edges.length; i++) {
    const ea = edges[i];
    const va1 = state.vertices.find(v => v.id === ea.from);
    const va2 = state.vertices.find(v => v.id === ea.to);
    if (!va1 || !va2) continue;
    for (let j = i + 1; j < edges.length; j++) {
      const eb = edges[j];
      if (ea.from === eb.from || ea.from === eb.to ||
          ea.to === eb.from || ea.to === eb.to) continue;
      const vb1 = state.vertices.find(v => v.id === eb.from);
      const vb2 = state.vertices.find(v => v.id === eb.to);
      if (!vb1 || !vb2) continue;
      if (segmentsProperlyIntersect(va1, va2, vb1, vb2)) {
        violations.push({ edgeA: ea.id, edgeB: eb.id });
      }
    }
  }
  return violations;
}

// 極小辺長・極小角度（頂点の内角が0°/180°付近）を検出。スケール未校正時は評価しない
// （その場合は#1のスケール未校正が先に報告されるため）。
function checkDegenerateGeometry() {
  const shortEdges = [];
  const sharpAngles = [];
  if (!state.scalePxPerMeter) return { shortEdges, sharpAngles };

  for (const e of state.edges) {
    const v1 = state.vertices.find(v => v.id === e.from);
    const v2 = state.vertices.find(v => v.id === e.to);
    if (!v1 || !v2) continue;
    const pxLen = Math.hypot(v2.x - v1.x, v2.y - v1.y);
    const lenM = pxLen / state.scalePxPerMeter;
    if (lenM < VALIDATION_MIN_EDGE_LEN_M) {
      shortEdges.push({ edgeId: e.id, lengthM: lenM });
    }
  }

  const neighborsOf = {};
  for (const e of state.edges) {
    (neighborsOf[e.from] = neighborsOf[e.from] || []).push(e.to);
    (neighborsOf[e.to] = neighborsOf[e.to] || []).push(e.from);
  }
  for (const v of state.vertices) {
    const nb = neighborsOf[v.id];
    if (!nb || nb.length !== 2) continue; // 次数≠2はcheckOneStrokeRule側で報告済み
    const a = state.vertices.find(vv => vv.id === nb[0]);
    const b = state.vertices.find(vv => vv.id === nb[1]);
    if (!a || !b) continue;
    const v1x = a.x - v.x, v1y = a.y - v.y;
    const v2x = b.x - v.x, v2y = b.y - v.y;
    const len1 = Math.hypot(v1x, v1y), len2 = Math.hypot(v2x, v2y);
    if (len1 === 0 || len2 === 0) continue;
    let cosT = (v1x * v2x + v1y * v2y) / (len1 * len2);
    cosT = Math.max(-1, Math.min(1, cosT));
    const deg = Math.acos(cosT) * 180 / Math.PI;
    if (deg < VALIDATION_SHARP_ANGLE_DEG || deg > VALIDATION_STRAIGHT_ANGLE_DEG) {
      sharpAngles.push({ vertexId: v.id, angleDeg: deg });
    }
  }
  return { shortEdges, sharpAngles };
}

// 同一頂点対を結ぶ辺が複数存在するか（頂点削除の橋渡し等で発生しうる、
// 次数2チェック・自己交差チェックのどちらもすり抜ける退化パターン）を検出。
// 例: 長方形から2頂点を連続削除すると、残り2頂点間に「元の辺」と
// 「橋渡しで新規追加された辺」の2本が生成され、両頂点とも次数2を保つため
// 一筆書きチェックを通過してしまう。自己交差チェックも端点共有のため対象外。
function checkDuplicateEdges() {
  const seen = new Map(); // key: "頂点id1|頂点id2"(昇順) -> 最初に見つかった辺id
  const violations = [];
  for (const e of state.edges) {
    const key = [e.from, e.to].slice().sort().join("|");
    if (seen.has(key)) {
      violations.push({ edgeA: seen.get(key), edgeB: e.id });
    } else {
      seen.set(key, e.id);
    }
  }
  return violations;
}

// 辺で連結された頂点グループ（部屋ポリゴン候補）が3頂点未満なら、
// 多角形として成立しない退化状態として検出する（上記の重複辺チェックと
// 合わせて二重の安全網とする）。孤立頂点(#孤立頂点チェックで別途報告済み)は対象外。
function checkMinimalPolygonSize() {
  const adj = {};
  for (const v of state.vertices) adj[v.id] = [];
  for (const e of state.edges) {
    if (adj[e.from]) adj[e.from].push(e.to);
    if (adj[e.to]) adj[e.to].push(e.from);
  }
  const visited = new Set();
  const violations = [];
  for (const v of state.vertices) {
    if (visited.has(v.id)) continue;
    const comp = [];
    const stack = [v.id];
    visited.add(v.id);
    while (stack.length) {
      const cur = stack.pop();
      comp.push(cur);
      for (const nb of (adj[cur] || [])) {
        if (!visited.has(nb)) { visited.add(nb); stack.push(nb); }
      }
    }
    const hasAnyEdge = comp.some(vid => adj[vid] && adj[vid].length > 0);
    if (hasAnyEdge && comp.length < 3) {
      violations.push({ vertexIds: comp.slice() });
    }
  }
  return violations;
}

// 辺の隣接関係(次数2前提)から、連結成分ごとに頂点順・辺順の閉路（部屋ポリゴン）を復元する。
// 次数が2でない頂点を含む成分は復元不能なためスキップする
// （その場合は一筆書きルール違反として別途blockingで報告されているはず）。
// 各loopは {vertexIds, edges} を持ち、edgesはその閉路を構成する辺オブジェクトの配列。
function buildOrderedLoops() {
  const adj = {}; // vid -> [{nid, edge}]
  for (const v of state.vertices) adj[v.id] = [];
  for (const e of state.edges) {
    if (adj[e.from]) adj[e.from].push({ nid: e.to, edge: e });
    if (adj[e.to]) adj[e.to].push({ nid: e.from, edge: e });
  }
  const visited = new Set();
  const loops = [];
  for (const v of state.vertices) {
    if (visited.has(v.id)) continue;
    if (!adj[v.id] || adj[v.id].length !== 2) { visited.add(v.id); continue; }
    const vertexIds = [];
    const edges = [];
    let prevEdge = null, cur = v.id;
    let safety = 0;
    while (!visited.has(cur) && safety++ < state.vertices.length + 1) {
      visited.add(cur);
      vertexIds.push(cur);
      const options = adj[cur] || [];
      const nextOpt = options.find(o => o.edge !== prevEdge) || options[0];
      if (!nextOpt) break;
      edges.push(nextOpt.edge);
      prevEdge = nextOpt.edge;
      cur = nextOpt.nid;
    }
    if (vertexIds.length >= 3) loops.push({ vertexIds, edges });
  }
  return loops;
}

// レイキャスティング法による点内外判定（多角形頂点は{x,y}配列）
function pointInPolygon(x, y, polyPoints) {
  let inside = false;
  for (let i = 0, j = polyPoints.length - 1; i < polyPoints.length; j = i++) {
    const xi = polyPoints[i].x, yi = polyPoints[i].y;
    const xj = polyPoints[j].x, yj = polyPoints[j].y;
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// 音源がいずれかの部屋ポリゴンの内部に配置されているかを検証。
// トポロジーが崩れている（閉路を復元できない）場合は判定不能なためスキップする。
//
// 判定の有効化条件：全ての辺が測定済みの「確定した部屋」が一つも無ければ、
// チェック自体を行わない（辺長未測定の部屋しか無い状態でこの警告を出すと、
// GCSソルバー上で自由度が残る未確定形状に対する判定になり、無関係な操作
// による再ソルブのたびに警告が出たり消えたりして不安定になるため）。
//
// 個々の音源の判定：確定・未確定を問わず「いずれかの部屋ポリゴンの内部」に
// あれば警告しない。確定した部屋の外にあっても、まだ形状が固まっていない
// 未確定の部屋の中に収まっていれば、それは単に「その部屋がまだ測定中」な
// だけであり音源側の問題ではないため、確定済みの部屋だけを基準に「外」と
// 判定してしまうと、他の部屋の測定が完了した瞬間に無関係な音源まで
// 巻き添えで警告される、という別の不安定要因を生む。よって「確定した部屋が
// 最低1つ存在する（＝チェックが有効な状態）」ことを条件に、実際の内外判定は
// 確定・未確定を問わず全ポリゴンを対象に行う。
function checkSourcesInsidePolygon() {
  const violations = [];
  if (!state.sources || state.sources.length === 0) return violations;
  const loops = buildOrderedLoops();
  const toPolygon = loop => loop.vertexIds.map(vid => state.vertices.find(v => v.id === vid)).filter(Boolean);
  const allPolygons = loops.map(toPolygon).filter(poly => poly.length >= 3);
  const hasConfirmedRoom = loops.some(loop => loop.edges.every(e => e.measurement.status === "measured"));
  if (!hasConfirmedRoom || allPolygons.length === 0) return violations;
  for (const src of state.sources) {
    const inAny = allPolygons.some(poly => pointInPolygon(src.sketchX, src.sketchY, poly));
    if (!inAny) violations.push({ sourceId: src.id, sourceName: src.name });
  }
  return violations;
}

// 現地データ生成前の統合検証。{blocking, warnings, info} を返す。
// blocking が1件でもあれば生成をブロックする。
function computeValidation() {
  const blocking = [];
  const warnings = [];
  const info = [];

  if (!state.scalePxPerMeter) {
    blocking.push({ code: "scale_uncalibrated", target: null, message: "スケールが未校正です" });
  }
  if (state.vertices.length === 0) {
    blocking.push({ code: "no_vertices", target: null, message: "形状が作成されていません" });
  }
  for (const e of state.edges) {
    if (e.from === e.to) {
      blocking.push({ code: "self_loop_edge", target: e.id, message: `自己ループ辺 ${e.id} があります` });
    }
  }
  for (const v of state.vertices) {
    const connected = state.edges.some(e => e.from === v.id || e.to === v.id)
                   || state.diagonals.some(d => d.from === v.id || d.to === v.id);
    if (!connected) {
      blocking.push({ code: "isolated_vertex", target: v.id, message: `孤立頂点 ${v.id} があります` });
    }
  }
  if (state.vertices.length > 0) {
    for (const viol of checkOneStrokeRule()) {
      blocking.push({
        code: "one_stroke_violation", target: viol.vertexId,
        message: `頂点 ${viol.vertexId} の辺接続数が ${viol.degree} 本です（2本である必要があります）`,
      });
    }
  }
  for (const it of checkSelfIntersection()) {
    blocking.push({
      code: "self_intersection", target: it.edgeA,
      message: `辺 ${it.edgeA} と 辺 ${it.edgeB} が交差しています`,
    });
  }
  for (const it of checkDuplicateEdges()) {
    blocking.push({
      code: "duplicate_edge", target: it.edgeA,
      message: `辺 ${it.edgeA} と 辺 ${it.edgeB} が同じ頂点間を結んでおり重複しています`,
    });
  }
  for (const it of checkMinimalPolygonSize()) {
    blocking.push({
      code: "degenerate_polygon", target: it.vertexIds[0],
      message: `頂点 ${it.vertexIds.join(",")} が3頂点未満のグループを構成しており、多角形として成立しません`,
    });
  }

  for (const item of [...state.edges, ...state.diagonals]) {
    if (item.measurement.status === "unmeasured") {
      warnings.push({ code: "edge_unmeasured", target: item.id, message: `${item.id} が未測定です` });
    } else if (item.measurement.status === "invalidated") {
      warnings.push({ code: "edge_invalidated", target: item.id, message: `${item.id} が要再確認です` });
    }
  }
  for (const v of state.vertices) {
    const h = state.heights[v.id];
    if (!h || h.status !== "measured") {
      warnings.push({ code: "height_unmeasured", target: v.id, message: `頂点 ${v.id} の高さが未測定です` });
    }
  }
  if (!state.sources || state.sources.length === 0) {
    warnings.push({ code: "no_sources", target: null, message: "音源が1件も設定されていません" });
  } else if (blocking.length === 0) {
    // トポロジーが正常な場合のみ、音源のポリゴン内外を判定する
    for (const it of checkSourcesInsidePolygon()) {
      warnings.push({
        code: "source_outside_polygon", target: it.sourceId,
        message: `音源 ${it.sourceName} がいずれの部屋ポリゴンの内部にもありません`,
      });
    }
  }
  const degenerate = checkDegenerateGeometry();
  for (const s of degenerate.shortEdges) {
    warnings.push({
      code: "edge_too_short", target: s.edgeId,
      message: `辺 ${s.edgeId} の長さが ${s.lengthM.toFixed(3)}m と極端に短くなっています`,
    });
  }
  for (const s of degenerate.sharpAngles) {
    warnings.push({
      code: "angle_degenerate", target: s.vertexId,
      message: `頂点 ${s.vertexId} の内角が ${s.angleDeg.toFixed(1)}° と極端です`,
    });
  }

  if (!state.meta.site_name || !state.meta.surveyor || !state.meta.survey_date) {
    info.push({ code: "meta_incomplete", target: null, message: "現場情報が未入力です" });
  }
  if (state.meta.rt60_s == null) {
    info.push({ code: "rt60_unmeasured", target: null, message: "RT60が未測定です（任意項目）" });
  }

  return { blocking, warnings, info };
}

// フッターのValidationサマリー表示を更新
function updateValidationBar() {
  const validation = computeValidation();
  _lastValidation = validation;
  const bar = document.getElementById("validationBar");
  const text = document.getElementById("validationBarText");
  if (validation.blocking.length > 0) {
    bar.dataset.grade = "block";
    text.textContent = `🛑 送信不可（要対応 ${validation.blocking.length}件）`;
  } else if (validation.warnings.length > 0) {
    bar.dataset.grade = "warn";
    text.textContent = `⚠️ 警告 ${validation.warnings.length}件`;
  } else {
    bar.dataset.grade = "ok";
    text.textContent = `✅ 検証OK（すべて完了）`;
  }
  return validation;
}

// 該当箇所へジャンプ可能な行を1件描画する共通ヘルパー
function renderValidationRow(container, item) {
  const row = document.createElement("div");
  row.className = "validation-detail-row";
  row.textContent = item.message;
  let jumpTarget = null;
  if (item.target && /^P/.test(item.target)) {
    const v = state.vertices.find(vv => vv.id === item.target);
    if (v) jumpTarget = { x: v.x, y: v.y };
  } else if (item.target && /^E/.test(item.target)) {
    const e = state.edges.find(ee => ee.id === item.target);
    if (e) {
      const v1 = state.vertices.find(v => v.id === e.from), v2 = state.vertices.find(v => v.id === e.to);
      if (v1 && v2) jumpTarget = { x: (v1.x + v2.x) / 2, y: (v1.y + v2.y) / 2 };
    }
  } else if (item.target && /^S/.test(item.target)) {
    const s = state.sources.find(ss => ss.id === item.target);
    if (s) jumpTarget = { x: s.sketchX, y: s.sketchY };
  }
  if (jumpTarget) {
    row.classList.add("jumpable");
    row.title = "タップで移動";
    row.addEventListener("click", () => {
      document.getElementById("validation-modal").classList.remove("visible");
      jumpToSketchPos(jumpTarget.x, jumpTarget.y);
    });
  }
  container.appendChild(row);
}

// 検証結果モーダルを開く。blockedOnly=trueの場合はinfoセクションを省略する
function openValidationModal(validation, opts = {}) {
  const list = document.getElementById("validationDetailList");
  list.innerHTML = "";
  const sections = [
    { items: validation.blocking, label: "🛑 対応が必要です" },
    { items: validation.warnings, label: "⚠️ 警告" },
  ];
  if (!opts.blockedOnly) sections.push({ items: validation.info, label: "ℹ️ 情報" });
  let any = false;
  for (const sec of sections) {
    if (sec.items.length === 0) continue;
    any = true;
    const h = document.createElement("div");
    h.className = "validation-section-label";
    h.textContent = sec.label;
    list.appendChild(h);
    for (const item of sec.items) renderValidationRow(list, item);
  }
  if (!any) {
    list.innerHTML = `<div class="hint" style="padding:8px 0;">検証項目はすべて問題ありません。</div>`;
  }
  document.getElementById("validation-modal").classList.add("visible");
}

document.getElementById("validationBar").addEventListener("click", () => {
  openValidationModal(_lastValidation || computeValidation());
});
document.getElementById("closeValidationBtn").addEventListener("click", () => {
  document.getElementById("validation-modal").classList.remove("visible");
});

function updateAnomalyWarnings() {
  const warnings = [];

  // 自己ループ辺（from === to）
  for (const e of state.edges) {
    if (e.from === e.to) {
      warnings.push({ type: "selfloop", id: e.id, label: `自己ループ辺 ${e.id}`, targetId: e.from });
    }
  }

  // 孤立頂点（edges/diagonalsに接続なし）
  for (const v of state.vertices) {
    const connected = state.edges.some(e => e.from === v.id || e.to === v.id)
                   || state.diagonals.some(d => d.from === v.id || d.to === v.id);
    if (!connected) {
      warnings.push({ type: "isolated", id: v.id, label: `孤立頂点 ${v.id}`, targetId: v.id });
    }
  }

  const container = document.getElementById("anomalyWarnings");
  container.innerHTML = "";
  if (warnings.length === 0) {
    container.style.display = "none";
    return;
  }
  container.style.display = "flex";
  for (const w of warnings) {
    const chip = document.createElement("div");
    chip.className = "stat-chip anomaly-chip";
    chip.title = "タップで移動";
    chip.innerHTML = `⚠️ <b>${w.label}</b>`;
    chip.addEventListener("click", () => {
      const v = state.vertices.find(vv => vv.id === w.targetId);
      if (v) jumpToSketchPos(v.x, v.y);
    });
    container.appendChild(chip);
  }
}

/* ============================================================
   トースト
   ============================================================ */
let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("visible"), 2200);
}

/* ============================================================
   メタ情報モーダル
   ============================================================ */
document.getElementById("metaBtn").addEventListener("click", () => {
  document.getElementById("metaSiteName").value = state.meta.site_name;
  document.getElementById("metaSurveyor").value = state.meta.surveyor;
  document.getElementById("metaDate").value = state.meta.survey_date || new Date().toISOString().slice(0,10);
  document.getElementById("metaRt60").value = state.meta.rt60_s != null ? state.meta.rt60_s : "";
  document.getElementById("metaNotes").value = state.meta.notes;
  document.getElementById("meta-modal").classList.add("visible");
});
document.getElementById("closeMetaBtn").addEventListener("click", () => {
  document.getElementById("meta-modal").classList.remove("visible");
});
document.getElementById("saveMetaBtn").addEventListener("click", () => {
  state.meta.site_name = document.getElementById("metaSiteName").value;
  state.meta.surveyor = document.getElementById("metaSurveyor").value;
  state.meta.survey_date = document.getElementById("metaDate").value;
  const rt60val = document.getElementById("metaRt60").value.trim();
  state.meta.rt60_s = rt60val !== "" ? parseFloat(rt60val) : null;
  state.meta.notes = document.getElementById("metaNotes").value;
  persistState();
  updateStats();
  document.getElementById("appTitle").textContent = state.meta.site_name ? `🏗 ${state.meta.site_name}` : "🏗 現場実測スケッチ";
  document.getElementById("meta-modal").classList.remove("visible");
  showToast("現場情報を保存しました");
});

/* ============================================================
   walls / ceiling / floor 自動生成
   （懸念対応: 辺編集に追従して base_edge を常に辺リストから動的導出）
   ============================================================ */
function buildWallsCeilingFloor() {
  const walls = state.edges.map((e, i) => ({
    id: `wall_${i}`,
    base_edge: e.id,
    type: "planar",
    material_hint: null,
    opening: null,
  }));
  const ceiling = { type: "planar", material_hint: null, curved_profile: null };
  const floor = { type: "planar", material_hint: null };
  return { walls, ceiling, floor };
}

/* ============================================================
   YAML 出力（スキーマ完全準拠）
   ============================================================ */
function yamlEscapeStr(s) {
  if (s == null) return '""';
  return `"${String(s).replace(/"/g, '\\"')}"`;
}
function numOrNull(v, digits) {
  return v == null ? "null" : Number(v).toFixed(digits);
}

function toYaml() {
  const L = [];
  const m = state.meta;
  L.push("# survey_record.yaml");
  L.push("meta:");
  L.push(`  schema_version: ${yamlEscapeStr(m.schema_version)}`);
  L.push(`  site_name: ${yamlEscapeStr(m.site_name)}`);
  L.push(`  surveyor: ${yamlEscapeStr(m.surveyor)}`);
  L.push(`  survey_date: ${yamlEscapeStr(m.survey_date)}`);
  L.push(`  device: ${yamlEscapeStr(m.device)}`);
  L.push(`  notes: ${yamlEscapeStr(m.notes)}`);
  L.push(`  scale_confirmed: ${state.scalePxPerMeter ? "true" : "false"}`);
  L.push(`  rt60_s: ${m.rt60_s != null ? m.rt60_s : "null"}`);
  L.push("");
  L.push("coordinate_system:");
  const cs = state.coordinateSystem || {};
  L.push(`  origin: ${cs.originId ? yamlEscapeStr(cs.originId) : "null"}`);
  L.push(`  x_axis: ${cs.xAxisId ? yamlEscapeStr(cs.xAxisId) : "null"}`);
  L.push(`  description: "左上原点・X軸右向き・Y軸下向き（画面座標系）"`);
  L.push(`  unit: "m"`);
  L.push("");
  L.push("floor_polygon:");
  if (state.vertices.length === 0) {
    L.push("  vertices: []");
  } else {
    L.push("  vertices:");
    for (const v of state.vertices) {
      L.push(`    - id: ${yamlEscapeStr(v.id)}`);
      L.push(`      sketch_xy: [${v.x.toFixed(1)}, ${v.y.toFixed(1)}]`);
      L.push(`      solved_xy: null`);
      const cons = v.constraints && v.constraints.length > 0 ? v.constraints : [];
      if (cons.length === 0) {
        L.push(`      constraints: []`);
      } else {
        L.push(`      constraints:`);
        for (const c of cons) {
          L.push(`        - type: ${yamlEscapeStr(c.type)}`);
          L.push(`          value: ${c.value}`);
        }
      }
    }
  }
  if (state.edges.length === 0) {
    L.push("  edges: []");
  } else {
    L.push("  edges:");
    for (const e of state.edges) {
      const mm = e.measurement;
      L.push(`    - id: ${yamlEscapeStr(e.id)}`);
      L.push(`      from: ${yamlEscapeStr(e.from)}`);
      L.push(`      to: ${yamlEscapeStr(e.to)}`);
      L.push(`      constrained: ${e.constrained ? "true" : "false"}`);
      L.push(`      auto_constrained: ${e.autoConstrained ? "true" : "false"}`);
      L.push(`      measurement:`);
      L.push(`        status: ${yamlEscapeStr(mm.status)}`);
      L.push(`        length_m: ${numOrNull(mm.length_m, 3)}`);
      L.push(`        previous_length_m: ${numOrNull(mm.previous_length_m, 3)}`);
      L.push(`        estimated_length_m: ${numOrNull(mm.estimated_length_m, 2)}`);
      L.push(`        measured_at: ${mm.measured_at ? yamlEscapeStr(mm.measured_at) : "null"}`);
    }
  }
  if (state.diagonals.length === 0) {
    L.push("  diagonals: []");
  } else {
    L.push("  diagonals:");
    for (const d of state.diagonals) {
      const mm = d.measurement;
      L.push(`    - id: ${yamlEscapeStr(d.id)}`);
      L.push(`      from: ${yamlEscapeStr(d.from)}`);
      L.push(`      to: ${yamlEscapeStr(d.to)}`);
      L.push(`      measurement:`);
      L.push(`        status: ${yamlEscapeStr(mm.status)}`);
      L.push(`        length_m: ${numOrNull(mm.length_m, 3)}`);
      L.push(`        previous_length_m: ${numOrNull(mm.previous_length_m, 3)}`);
      L.push(`        estimated_length_m: ${numOrNull(mm.estimated_length_m, 2)}`);
      L.push(`        measured_at: ${mm.measured_at ? yamlEscapeStr(mm.measured_at) : "null"}`);
    }
  }
  L.push("");
  L.push("height_measurements:");
  for (const v of state.vertices) {
    const h = state.heights[v.id] || { status: "unmeasured", height_m: null };
    L.push(`  - at_vertex: ${yamlEscapeStr(v.id)}`);
    L.push(`    height_m: ${numOrNull(h.height_m, 3)}`);
    L.push(`    status: ${yamlEscapeStr(h.status)}`);
  }
  L.push("");

  const { walls, ceiling, floor } = buildWallsCeilingFloor();
  L.push("walls:");
  for (const w of walls) {
    L.push(`  - id: ${yamlEscapeStr(w.id)}`);
    L.push(`    base_edge: ${yamlEscapeStr(w.base_edge)}`);
    L.push(`    type: ${yamlEscapeStr(w.type)}`);
    L.push(`    material_hint: null`);
    L.push(`    opening: null`);
  }
  L.push("");
  L.push("ceiling:");
  L.push(`  type: ${yamlEscapeStr(ceiling.type)}`);
  L.push(`  material_hint: null`);
  L.push(`  curved_profile: null`);
  L.push("");
  L.push("floor:");
  L.push(`  type: ${yamlEscapeStr(floor.type)}`);
  L.push(`  material_hint: null`);
  L.push("");

  // sources セクション
  if (!state.sources || state.sources.length === 0) {
    L.push("sources: []");
  } else {
    L.push("sources:");
    for (const src of state.sources) {
      L.push(`  - name: ${yamlEscapeStr(src.name)}`);
      L.push(`    position: [${src.posX}, ${src.posY}, ${src.z}]`);
      L.push(`    radius: ${src.radius}`);
      L.push(`    flux_real: ${src.flux_real}`);
      L.push(`    flux_imag: ${src.flux_imag}`);
    }
  }
  L.push("");

  // validation セクション：生成時点でのPWA側検証結果（解析側への申し送り事項）
  const validation = computeValidation();
  L.push("validation:");
  L.push(`  generated_at: ${yamlEscapeStr(new Date().toISOString())}`);
  if (validation.blocking.length === 0) {
    L.push("  blocking_issues: []"); // 生成できた時点で常に空（ブロック要因があれば生成自体に到達しない）
  } else {
    L.push("  blocking_issues:");
    for (const b of validation.blocking) {
      L.push(`    - code: ${yamlEscapeStr(b.code)}`);
      L.push(`      target: ${b.target ? yamlEscapeStr(b.target) : "null"}`);
      L.push(`      message: ${yamlEscapeStr(b.message)}`);
    }
  }
  if (validation.warnings.length === 0) {
    L.push("  warnings: []");
  } else {
    L.push("  warnings:");
    for (const w of validation.warnings) {
      L.push(`    - code: ${yamlEscapeStr(w.code)}`);
      L.push(`      target: ${w.target ? yamlEscapeStr(w.target) : "null"}`);
      L.push(`      message: ${yamlEscapeStr(w.message)}`);
    }
  }
  {
    const edgesTotal = state.edges.length;
    const edgesMeasured = state.edges.filter(e => e.measurement.status === "measured").length;
    const edgesUnmeasured = state.edges.filter(e => e.measurement.status === "unmeasured").length;
    const edgesInvalidated = state.edges.filter(e => e.measurement.status === "invalidated").length;
    const heightsTotal = state.vertices.length;
    const heightsMeasured = state.vertices.filter(v => state.heights[v.id] && state.heights[v.id].status === "measured").length;
    L.push("  summary:");
    L.push(`    edges_total: ${edgesTotal}`);
    L.push(`    edges_measured: ${edgesMeasured}`);
    L.push(`    edges_unmeasured: ${edgesUnmeasured}`);
    L.push(`    edges_invalidated: ${edgesInvalidated}`);
    L.push(`    heights_total: ${heightsTotal}`);
    L.push(`    heights_measured: ${heightsMeasured}`);
    L.push(`    sources_count: ${state.sources ? state.sources.length : 0}`);
  }
  L.push("");

  const allMeasured = [...state.edges, ...state.diagonals].every(x => x.measurement.status === "measured");
  L.push("processing_status:");
  L.push(`  topology_locked: false`);
  L.push(`  all_required_measured: ${allMeasured}`);
  L.push(`  coordinate_solved: false`);
  L.push(`  step_exported: false`);
  L.push(`  step_file_path: null`);

  return L.join("\n");
}

// timestampSuffix() は下記YAML/JSONファイル名生成で共通使用
function timestampSuffix() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

// 現地データ生成の入口。Validationでブロック要因があれば検証結果のみ表示し、
// プレビュー（output-modal）は開かない。ブロックが無ければ、警告があっても
// バナー表示のうえプレビューを開く（送信するかはユーザー判断）。
document.getElementById("doneBtn").addEventListener("click", () => {
  persistState();
  const validation = updateValidationBar();
  if (validation.blocking.length > 0) {
    openValidationModal(validation, { blockedOnly: true });
    return;
  }
  document.getElementById("outputPre").textContent = toYaml();
  const banner = document.getElementById("outputWarningBanner");
  if (validation.warnings.length > 0) {
    banner.style.display = "block";
    banner.innerHTML = `⚠️ 警告 ${validation.warnings.length}件があります。内容を確認のうえ送信してください。<br>` +
      validation.warnings.map(w => `・${escapeHtml(w.message)}`).join("<br>");
  } else {
    banner.style.display = "none";
  }
  document.getElementById("output-modal").classList.add("visible");
});

document.getElementById("sendOutputBtn").addEventListener("click", async () => {
  const yaml = document.getElementById("outputPre").textContent;
  const safeName = (state.meta.site_name || "survey_record").replace(/[^\w\-]/g, "_");
  // .yaml は Android の共有先アプリに認識されにくいため .txt で共有
  // （内容はYAML形式のまま。Google Drive等で受け取り後に .yaml にリネーム可能）
  const fileName = `${safeName}_${timestampSuffix()}.yaml.txt`;

  if (navigator.share && navigator.canShare) {
    const file = new File([yaml], fileName, { type: "text/plain" });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ title: fileName, files: [file] });
        document.getElementById("output-modal").classList.remove("visible");
        return;
      } catch (e) {
        if (e.name === "AbortError") return;
      }
    }
  }

  // テキストとして送信
  if (navigator.share) {
    try {
      await navigator.share({ title: fileName, text: yaml });
      document.getElementById("output-modal").classList.remove("visible");
      return;
    } catch (e) {
      if (e.name === "AbortError") return;
    }
  }

  // フォールバック: 端末への保存（送信ではなく内側に留まる操作）
  showToast("送信に対応していない環境です。端末に保存します。");
  const blob = new Blob([yaml], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = fileName;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});
document.getElementById("closeOutputBtn").addEventListener("click", () => {
  document.getElementById("output-modal").classList.remove("visible");
});
document.getElementById("copyOutputBtn").addEventListener("click", () => {
  const text = document.getElementById("outputPre").textContent;
  navigator.clipboard.writeText(text).then(() => showToast("コピーしました"));
});
document.getElementById("downloadOutputBtn").addEventListener("click", () => {
  const text = document.getElementById("outputPre").textContent;
  const blob = new Blob([text], { type: "text/yaml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeName = (state.meta.site_name || "survey_record").replace(/[^\w\-]/g, "_");
  a.href = url;
  a.download = `${safeName}_${timestampSuffix()}.yaml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("現地データを端末に保存しました");
});

/* ============================================================
   現場データ管理（②外部保存 / 現場・フェーズ切替 / 読込）
   ============================================================ */

// 汎用確認モーダル。buttons: [{label, value, secondary?}]
// クリックされたボタンの value を解決する Promise を返す。
function showConfirm({ title, message, buttons }) {
  return new Promise((resolve) => {
    document.getElementById("confirmTitle").textContent = title;
    document.getElementById("confirmMessage").textContent = message;
    const actionsEl = document.getElementById("confirmActions");
    actionsEl.innerHTML = "";
    for (const b of buttons) {
      const btn = document.createElement("button");
      btn.textContent = b.label;
      if (b.secondary) btn.className = "secondary";
      btn.addEventListener("click", () => {
        document.getElementById("confirm-modal").classList.remove("visible");
        resolve(b.value);
      });
      actionsEl.appendChild(btn);
    }
    document.getElementById("confirm-modal").classList.add("visible");
  });
}

// ②外部ストレージへの内部データ明示保存。
// 保存後、直近外部保存日時(meta.lastExternalSavedAt)を更新して
// レジストリにも反映する（③のコンフリクト検知に使う）。
async function exportInternalDataFile() {
  ensureSiteIdentity();
  state.meta.lastExternalSavedAt = new Date().toISOString();
  const snapshot = buildStateSnapshot();
  const json = JSON.stringify(snapshot, null, 2);
  const safeName = (state.meta.site_name || "survey_record").replace(/[^\w\-]/g, "_");
  // .json は Android の共有先アプリに認識されにくいため、YAML共有と同様
  // .txt で共有する（内容はJSON形式のまま。受け取り後に .json にリネーム可能）
  const fileName = `${safeName}_p${state.meta.phaseNo}_${timestampSuffix()}.json.txt`;
  persistState(); // lastExternalSavedAtの更新を退避・レジストリに反映

  if (navigator.share && navigator.canShare) {
    // application/json はAndroidの共有先アプリ（Google Drive含む）に
    // ファイルとして認識されないことが多く、canShare()がfalseを返して
    // 共有シートを開かずに無言でダウンロードへフォールバックしてしまう。
    // YAML共有と同様 text/plain として渡すことで共有シートに正しく載る。
    const file = new File([json], fileName, { type: "text/plain" });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ title: fileName, files: [file] });
        return;
      } catch (e) {
        if (e.name === "AbortError") return;
      }
    }
  }

  // テキストとして共有
  if (navigator.share) {
    try {
      await navigator.share({ title: fileName, text: json });
      return;
    } catch (e) {
      if (e.name === "AbortError") return;
    }
  }

  // フォールバック: 端末への保存（退避先が外部ではなく内側に留まる）
  showToast("退避に対応していない環境です。端末に保存します。");
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = fileName;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("作業状態を端末に保存しました");
}

// 現在のスケッチ・ビュー表示をstateの内容に合わせて更新する
// （現場切替・新規現場・読込のいずれの後にも呼ぶ共通処理）
function afterStateSwitch() {
  view.scale = 1; view.offsetX = 0; view.offsetY = 0;
  document.getElementById("appTitle").textContent =
    state.meta.site_name ? `🏗 ${state.meta.site_name}` : "🏗 現場実測スケッチ";
  if (state.scalePxPerMeter) {
    document.getElementById("scaleBadge").classList.add("visible");
    document.getElementById("scaleValue").textContent = `${state.scalePxPerMeter.toFixed(1)} px/m`;
  } else {
    document.getElementById("scaleBadge").classList.remove("visible");
  }
  state.selectedVertex = null;
  state.history = [];
  updateStats();
  resizeCanvas();
  render();
  persistState();
}

// 現在の作業状態が外部未退避なら、先に退避するかどうかを確認する。
// 戻り値: 続行してよければ true、キャンセルなら false。
async function confirmDiscardIfUnsaved(actionLabel) {
  if (!isCurrentSiteUnsavedExternally()) return true;
  const choice = await showConfirm({
    title: "確認",
    message: `現在の作業状態は外部へ退避されていません。${actionLabel}前に退避しますか？`,
    buttons: [
      { label: "退避してから続ける", value: "save" },
      { label: "退避せず続ける", value: "discard" },
      { label: "キャンセル", value: "cancel", secondary: true },
    ],
  });
  if (choice === "cancel") return false;
  if (choice === "save") await exportInternalDataFile();
  return true;
}

function resetStateForNewSite() {
  state.vertices = [];
  state.edges = [];
  state.diagonals = [];
  state.heights = {};
  state.sources = [];
  state.nextVertexId = 0; state.nextEdgeId = 0; state.nextDiagId = 0; state.nextSourceId = 0;
  state.coordinateSystem = { originId: null, xAxisId: null };
  state.scalePxPerMeter = null;
  state.firstStrokeDone = false;
  state.selectedVertex = null;
  state.history = [];
  state.meta = {
    schema_version: "1.1", site_name: "", surveyor: "", survey_date: "",
    device: "Android tablet (PWA)", notes: "", rt60_s: null,
    siteId: genId(), phaseNo: 1, lastExternalSavedAt: null,
  };
}

function loadSiteSlot(compositeId) {
  try {
    const raw = localStorage.getItem(SITE_SLOT_PREFIX + compositeId);
    if (!raw) { showToast("データが見つかりません"); return false; }
    const snap = JSON.parse(raw);
    Object.assign(state, snap);
    migrateLoadedState();
    return true;
  } catch (e) {
    showToast("作業状態の復元に失敗しました");
    return false;
  }
}

async function switchToSite(compositeId) {
  const ok = await confirmDiscardIfUnsaved("切り替える");
  if (!ok) return;
  persistState();
  if (loadSiteSlot(compositeId)) {
    afterStateSwitch();
    document.getElementById("sites-modal").classList.remove("visible");
    showToast("現場を切り替えました");
  }
}

async function deleteSiteSlot(compositeId) {
  if (compositeId === currentCompositeId()) {
    showToast("現在開いている作業状態は削除できません");
    return;
  }
  const choice = await showConfirm({
    title: "削除確認",
    message: "端末内に退避されたこの作業状態を削除しますか？（外部へ退避済みのファイルには影響しません）",
    buttons: [
      { label: "削除する", value: "delete" },
      { label: "キャンセル", value: "cancel", secondary: true },
    ],
  });
  if (choice !== "delete") return;
  try { localStorage.removeItem(SITE_SLOT_PREFIX + compositeId); } catch (e) { /* ignore */ }
  saveRegistry(loadRegistry().filter(r => r.compositeId !== compositeId));
  renderSitesList();
}

async function startBrandNewSite() {
  const ok = await confirmDiscardIfUnsaved("新規現場を開始する");
  if (!ok) return;
  persistState();
  resetStateForNewSite();
  afterStateSwitch();
  document.getElementById("sites-modal").classList.remove("visible");
  showToast("新しい現場を開始しました");
}

async function startNewPhaseFromCurrent() {
  if (state.vertices.length === 0) {
    showToast("現在のデータがありません");
    return;
  }
  const nextPhase = (state.meta.phaseNo || 1) + 1;
  const choice = await showConfirm({
    title: "新しいフェーズ",
    message: `現在のデータを引き継いだ新しいフェーズ（phase ${nextPhase}）として保存します。よろしいですか？`,
    buttons: [
      { label: "開始する", value: "ok" },
      { label: "キャンセル", value: "cancel", secondary: true },
    ],
  });
  if (choice !== "ok") return;
  state.meta.phaseNo = nextPhase;
  state.meta.lastExternalSavedAt = null;
  state.history = [];
  persistState();
  renderSitesList();
  showToast(`phase ${state.meta.phaseNo} として続けます`);
}

function renderSitesList() {
  document.getElementById("maxSlotsText").textContent = String(MAX_LOCAL_SLOTS);
  const registry = loadRegistry().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  const container = document.getElementById("sitesList");
  container.innerHTML = "";
  if (registry.length === 0) {
    container.innerHTML = `<div class="hint" style="padding:8px 0;">端末内に退避された作業状態はありません</div>`;
    return;
  }
  const currentId = currentCompositeId();
  for (const r of registry) {
    const isCurrent = r.compositeId === currentId;
    const dt = new Date(r.updatedAt);
    const dtStr = `${dt.getMonth() + 1}/${dt.getDate()} ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
    const unsaved = !r.lastExternalSavedAt || new Date(r.updatedAt) > new Date(r.lastExternalSavedAt);
    const row = document.createElement("div");
    row.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:8px 2px;border-bottom:1px solid var(--color-border);gap:8px;";
    row.innerHTML = `
      <div style="font-size:0.76rem;min-width:0;">
        <div>${isCurrent ? "▶ " : ""}${escapeHtml(r.siteName)}　<span style="color:var(--color-text-dim);">phase ${r.phaseNo}</span></div>
        <div style="color:var(--color-text-dim);font-size:0.66rem;">${dtStr}${unsaved ? "　⚠️未退避" : ""}</div>
      </div>`;
    const btnWrap = document.createElement("div");
    btnWrap.style.cssText = "display:flex;gap:6px;flex-shrink:0;";
    if (!isCurrent) {
      const openBtn = document.createElement("button");
      openBtn.textContent = "復元";
      openBtn.style.cssText = "padding:5px 10px;font-size:0.72rem;flex:none;";
      openBtn.addEventListener("click", () => switchToSite(r.compositeId));
      btnWrap.appendChild(openBtn);
    }
    const delBtn = document.createElement("button");
    delBtn.textContent = "削除";
    delBtn.className = "secondary";
    delBtn.style.cssText = "padding:5px 10px;font-size:0.72rem;flex:none;";
    delBtn.addEventListener("click", () => deleteSiteSlot(r.compositeId));
    btnWrap.appendChild(delBtn);
    row.appendChild(btnWrap);
    container.appendChild(row);
  }
}

document.getElementById("sitesBtn").addEventListener("click", () => {
  renderSitesList();
  document.getElementById("sites-modal").classList.add("visible");
});
document.getElementById("closeSitesBtn").addEventListener("click", () => {
  document.getElementById("sites-modal").classList.remove("visible");
});
document.getElementById("saveExternalBtn").addEventListener("click", async () => {
  await exportInternalDataFile();
  renderSitesList();
});
document.getElementById("newPhaseBtn").addEventListener("click", startNewPhaseFromCurrent);
document.getElementById("newSiteBtn").addEventListener("click", startBrandNewSite);

// 読込データの適用処理（ファイル選択・Web Share Target共通）。
// text: ファイルの中身（JSON文字列）
async function applyImportedSnapshot(text) {
  let snap;
  try {
    snap = JSON.parse(text);
  } catch (e) {
    showToast("作業状態の復元に失敗しました（JSON形式ではありません）");
    return;
  }
  if (!snap || !Array.isArray(snap.vertices) || !Array.isArray(snap.edges)) {
    showToast("作業状態として復元できないファイルです");
    return;
  }
  const ok = await confirmDiscardIfUnsaved("復元する");
  if (!ok) return;
  persistState();

  // ③タイムスタンプによるコンフリクト検知：
  // 復元するファイルと同じ現場・フェーズの端末内データが、
  // ファイルの外部退避時刻より新しく更新されている場合は警告する。
  const importedSiteId = snap.meta && snap.meta.siteId;
  const importedPhase = snap.meta && snap.meta.phaseNo;
  const importedSavedAt = snap.meta && snap.meta.lastExternalSavedAt;
  if (importedSiteId && importedPhase) {
    const existing = loadRegistry().find(
      r => r.siteId === importedSiteId && r.phaseNo === importedPhase
    );
    if (existing && importedSavedAt && new Date(existing.updatedAt) > new Date(importedSavedAt)) {
      showToast("⚠️ 端末内に、復元したファイルより新しい作業状態があります");
    }
  }

  Object.assign(state, snap);
  migrateLoadedState();
  afterStateSwitch();
  document.getElementById("sites-modal").classList.remove("visible");
  showToast("作業状態を復元しました");
}

document.getElementById("importFileInput").addEventListener("change", async (evt) => {
  const file = evt.target.files[0];
  if (!file) return;
  await applyImportedSnapshot(await file.text());
  evt.target.value = "";
});

// Web Share Target経由の読込：Google Drive等のアプリから本PWAへ
// 「共有」でJSONファイルを渡された場合、sw.jsが一時キャッシュに
// 保存した上で index.html?shared=1 にリダイレクトしてくる。
// ここでそのペイロードを取り出して読み込む。
const SHARE_TARGET_CACHE = "survey-sketch-share-target-v1";
async function checkShareTargetPayload() {
  const params = new URLSearchParams(location.search);
  if (params.get("shared") !== "1") return;
  history.replaceState({}, "", location.pathname); // URLを綺麗にする
  if (!("caches" in window)) return;
  try {
    const cache = await caches.open(SHARE_TARGET_CACHE);
    const res = await cache.match("/__shared_payload__");
    if (!res) return;
    const text = await res.text();
    await cache.delete("/__shared_payload__");
    await applyImportedSnapshot(text);
  } catch (e) { /* ignore */ }
}

// 旧: doneBtnの「測定完了→作業状態の外部退避を促す」フローはここにあったが、
// 現場管理画面(saveExternalBtn)・現場切替時の自動確認(confirmDiscardIfUnsaved)
// で既に作業状態の退避は担保されているため撤去。doneBtnは現地データ生成の
// 入口に専念する（フローは上部の doneBtn ハンドラを参照）。

/* ============================================================
   ビューリセット
   ============================================================ */
document.getElementById("resetViewBtn").addEventListener("click", () => {
  view.scale = 1;
  view.offsetX = 0;
  view.offsetY = 0;
  render();
  showToast("ビューをリセットしました");
});

/* ============================================================
   初期化
   ============================================================ */
function init() {
  document.getElementById("versionBadge").textContent = `v${APP_VERSION}`;
  const restored = restoreState();
  if (restored && state.meta.site_name) {
    document.getElementById("appTitle").textContent = `🏗 ${state.meta.site_name}`;
  }
  if (state.scalePxPerMeter) {
    document.getElementById("scaleBadge").classList.add("visible");
    document.getElementById("scaleValue").textContent = `${state.scalePxPerMeter.toFixed(1)} px/m`;
  }
  resizeCanvas();
  updateStats();
  if (restored) showToast("前回の作業状態を復元しました");

  // planegcs を非同期で初期化（完了前はBFSで動作）
  initPlanegcs();

  // Web Share Target経由でファイルが渡されていれば読み込む
  checkShareTargetPayload();
}

init();

/* ============================================================
   Service Worker 登録
   ============================================================ */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}