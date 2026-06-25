/**
 * Ailə ağacı düzülüş alqoritmi — Top-down Subtree Layout
 *
 * Prinsipler:
 *  1. Hər "cütlük vahidi" (couple unit) bir bütöv kimi işlənir.
 *  2. Hər vahidin məxsus olduğu valideyn vahidi müəyyən edilir.
 *  3. Alt-ağac genişliyi rekursiv hesablanır.
 *  4. Yuxarıdan aşağıya mövqe verilir — hər valideyn öz övladlarının
 *     mərkəzinə düşür, heç bir qarışıqlıq olmur.
 */

export function buildTreeLayout(people) {
  if (!people.length) {
    return { nodes: [], links: [], width: 0, height: 0, NODE_W: 170, NODE_H: 88 };
  }

  const byId = Object.fromEntries(people.map((p) => [p.id, p]));
  const NODE_W = 170;
  const NODE_H = 88;
  const H_GAP  = 32;   // üfüqi boşluq (vahidlər arası)
  const V_GAP  = 120;  // şaquli boşluq (nəsillər arası)

  // ── 1. Nəsil dərəcəsi ────────────────────────────────────────────────────
  const gen      = {};
  const visiting = new Set();

  const calcGen = (id) => {
    if (gen[id] !== undefined) return gen[id];
    if (visiting.has(id))       return 0;
    visiting.add(id);
    const p = byId[id];
    if (!p) return 0;
    const f = p.fatherId && byId[p.fatherId] ? calcGen(p.fatherId) + 1 : null;
    const m = p.motherId && byId[p.motherId] ? calcGen(p.motherId) + 1 : null;
    const g = Math.max(f ?? 0, m ?? 0);
    visiting.delete(id);
    gen[id] = g;
    return g;
  };
  people.forEach((p) => calcGen(p.id));

  // Ər-arvad eyni nəsil dərəcəsini paylaşır
  people.forEach((p) => {
    if (p.spouseId && byId[p.spouseId]) {
      const mx = Math.max(gen[p.id] ?? 0, gen[p.spouseId] ?? 0);
      gen[p.id]       = mx;
      gen[p.spouseId] = mx;
    }
  });

  // ── 2. Cütlük vahidlərini yarat ──────────────────────────────────────────
  const placed = new Set();
  const units  = [];
  const unitOf = {}; // şəxs id → vahid

  // Nəsil → doğum tarixi sırası
  const sorted = [...people].sort((a, b) => {
    const gd = (gen[a.id] ?? 0) - (gen[b.id] ?? 0);
    if (gd !== 0) return gd;
    return (a.birthDate || '9999').localeCompare(b.birthDate || '9999');
  });

  sorted.forEach((p) => {
    if (placed.has(p.id)) return;
    const sp = p.spouseId ? byId[p.spouseId] : null;

    if (sp && !placed.has(sp.id)) {
      // Ailə kökü olan şəxs birinci gedər
      const pHasParents = !!(p.fatherId  || p.motherId);
      const sHasParents = !!(sp.fatherId || sp.motherId);
      const ids = (!pHasParents && sHasParents) ? [sp.id, p.id] : [p.id, sp.id];
      const u   = { ids, gen: gen[p.id] ?? 0 };
      units.push(u);
      ids.forEach((id) => { unitOf[id] = u; placed.add(id); });
    } else {
      const u = { ids: [p.id], gen: gen[p.id] ?? 0 };
      units.push(u);
      unitOf[p.id] = u;
      placed.add(p.id);
    }
  });

  const unitW = (u) => u.ids.length * NODE_W + (u.ids.length - 1) * 10;

  // ── 3. Hər vahidin sahibi olan valideyn vahidini tap ─────────────────────
  //
  // Qayda: vahiddəki şəxsin atası ağacda varsa → ata vahidi sahib olur.
  //        ata yoxdursa → ana vahidi sahib olur.
  //        Heç biri yoxdursa → vahid kökdür.

  const ownedBy = new Map(); // valideyn vahidi → [övlad vahidlər]
  units.forEach((u) => ownedBy.set(u, []));

  units.forEach((childUnit) => {
    // Bu vahiddə valideynləri olan əsas şəxsi tap
    let primary = null;
    for (const id of childUnit.ids) {
      const p = byId[id];
      if (
        (p.fatherId && unitOf[p.fatherId]) ||
        (p.motherId && unitOf[p.motherId])
      ) {
        primary = p;
        break;
      }
    }
    if (!primary) return; // kök vahid

    const ownerUnit =
      (primary.fatherId ? unitOf[primary.fatherId] : null) ||
      (primary.motherId ? unitOf[primary.motherId] : null);

    if (ownerUnit && ownerUnit !== childUnit) {
      ownedBy.get(ownerUnit).push(childUnit);
    }
  });

  // ── 4. Övladları doğum tarixinə görə sırala ──────────────────────────────
  const primaryBirth = (u) => {
    for (const id of u.ids) {
      if (byId[id]?.birthDate) return byId[id].birthDate;
    }
    return '9999';
  };

  ownedBy.forEach((children) => {
    children.sort((a, b) => primaryBirth(a).localeCompare(primaryBirth(b)));
  });

  // ── 5. Alt-ağac genişliyi (rekursiv, keşli) ──────────────────────────────
  const swCache = new Map();

  const subtreeW = (u) => {
    if (swCache.has(u)) return swCache.get(u);
    const ch = ownedBy.get(u) || [];
    const childrenW = ch.length
      ? ch.reduce((s, c) => s + subtreeW(c), 0) + (ch.length - 1) * H_GAP
      : 0;
    const w = ch.length ? Math.max(unitW(u), childrenW) : unitW(u);
    swCache.set(u, w);
    return w;
  };

  // ── 6. Yuxarıdan aşağıya mövqe ver ──────────────────────────────────────
  const positionUnit = (u, left) => {
    const children = ownedBy.get(u) || [];

    if (!children.length) {
      // Yarpaq düyün: sadəcə sola yerləşdir
      u.x = left;
      return;
    }

    const totalChildW =
      children.reduce((s, c) => s + subtreeW(c), 0) + (children.length - 1) * H_GAP;

    // Övladları alt-ağac içində mərkəzləndir
    const childOffset = Math.max(0, (subtreeW(u) - totalChildW) / 2);
    let cursor = left + childOffset;

    children.forEach((child) => {
      positionUnit(child, cursor);
      cursor += subtreeW(child) + H_GAP;
    });

    // Valideyn vahidini övladlarının mərkəzinə yaz
    const firstX = children[0].x;
    const lastX  = children[children.length - 1].x + unitW(children[children.length - 1]);
    u.x = (firstX + lastX) / 2 - unitW(u) / 2;
  };

  // ── 7. Kök vahidlər ──────────────────────────────────────────────────────
  const allOwned = new Set();
  ownedBy.forEach((ch) => ch.forEach((c) => allOwned.add(c)));
  const roots = units.filter((u) => !allOwned.has(u));
  roots.sort((a, b) => primaryBirth(a).localeCompare(primaryBirth(b)));

  let cursor = 0;
  roots.forEach((root) => {
    positionUnit(root, cursor);
    cursor += subtreeW(root) + H_GAP;
  });

  // Mövqe verilməmiş vahidlər (kəsilmiş)
  units.forEach((u) => {
    if (u.x === undefined) {
      u.x = cursor;
      cursor += unitW(u) + H_GAP;
    }
  });

  // ── 8. Düyünlər ──────────────────────────────────────────────────────────
  const nodes = [];
  units.forEach((u) => {
    const y = (u.gen ?? 0) * V_GAP;
    u.ids.forEach((id, idx) => {
      nodes.push({ id, x: u.x + idx * (NODE_W + 10), y, person: byId[id] });
    });
  });

  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const links    = [];

  // Valideyn → övlad xətləri
  people.forEach((p) => {
    const child  = nodeById[p.id];
    if (!child) return;
    const father = p.fatherId ? nodeById[p.fatherId] : null;
    const mother = p.motherId ? nodeById[p.motherId] : null;

    if (father && mother) {
      const midX = (father.x + mother.x) / 2 + NODE_W / 2;
      links.push({
        type: 'parent',
        x1: midX,              y1: father.y + NODE_H,
        x2: child.x + NODE_W / 2, y2: child.y,
      });
    } else if (father) {
      links.push({
        type: 'parent',
        x1: father.x + NODE_W / 2, y1: father.y + NODE_H,
        x2: child.x  + NODE_W / 2, y2: child.y,
      });
    } else if (mother) {
      links.push({
        type: 'parent',
        x1: mother.x + NODE_W / 2, y1: mother.y + NODE_H,
        x2: child.x  + NODE_W / 2, y2: child.y,
      });
    }
  });

  // Nikah xətləri
  const seenSpouse = new Set();
  people.forEach((p) => {
    if (!p.spouseId || seenSpouse.has(p.id + ':' + p.spouseId)) return;
    seenSpouse.add(p.id + ':' + p.spouseId);
    seenSpouse.add(p.spouseId + ':' + p.id);
    const a = nodeById[p.id];
    const b = nodeById[p.spouseId];
    if (a && b) {
      links.push({
        type: 'spouse',
        x1: Math.min(a.x, b.x) + NODE_W,
        y1: a.y + NODE_H / 2,
        x2: Math.max(a.x, b.x),
        y2: b.y + NODE_H / 2,
      });
    }
  });

  const width  = Math.max(...nodes.map((n) => n.x + NODE_W), 400);
  const height = Math.max(...nodes.map((n) => n.y + NODE_H), 300);

  return { nodes, links, width, height, NODE_W, NODE_H };
}
