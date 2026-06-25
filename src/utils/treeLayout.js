// Ailə ağacının düzülüş alqoritmi
// Nəsillər üzrə düzülür, övladlar valideynlərin altında yerləşir,
// ər-arvad yan-yana qalır.

export function buildTreeLayout(people) {
  if (!people.length) {
    return { nodes: [], links: [], width: 0, height: 0, NODE_W: 170, NODE_H: 88 };
  }

  const byId = Object.fromEntries(people.map((p) => [p.id, p]));
  const NODE_W = 170;
  const NODE_H = 88;
  const H_GAP = 24;
  const V_GAP = 110;

  // Hər kəs üçün nəsil dərəcəsini hesabla
  const gen = {};
  const visiting = new Set();
  const calcGen = (id) => {
    if (gen[id] !== undefined) return gen[id];
    if (visiting.has(id)) return 0;
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

  // Ər-arvad eyni nəsildə olmalıdır
  people.forEach((p) => {
    if (p.spouseId && byId[p.spouseId]) {
      const mx = Math.max(gen[p.id], gen[p.spouseId]);
      gen[p.id] = mx;
      gen[p.spouseId] = mx;
    }
  });

  // Cütlükləri vahid kimi qruplaşdır
  const placed = new Set();
  const units = [];
  const sortedPeople = [...people].sort((a, b) => {
  if (gen[a.id] !== gen[b.id]) return gen[a.id] - gen[b.id];
  const dateA = a.birthDate || '9999-99-99';
  const dateB = b.birthDate || '9999-99-99';
  return dateA.localeCompare(dateB);
});
sortedPeople.forEach((p) => {
    if (placed.has(p.id)) return;
    const spouse = p.spouseId ? byId[p.spouseId] : null;
    if (spouse && !placed.has(p.spouseId)) {
      const pHasParents = !!(p.fatherId || p.motherId);
      const sHasParents = !!(spouse.fatherId || spouse.motherId);
      // Valideynləri olan şəxs birinci gedər (strukturu o "sabitləşdirir")
      let firstId, secondId;
      if (!pHasParents && sHasParents) {
        firstId = p.spouseId; secondId = p.id;
      } else {
        firstId = p.id; secondId = p.spouseId;
      }
      units.push({ ids: [firstId, secondId], gen: gen[p.id] });
      placed.add(p.id);
      placed.add(p.spouseId);
    } else {
      units.push({ ids: [p.id], gen: gen[p.id] });
      placed.add(p.id);
    }
  });

  // Nəsillər üzrə qruplaşdır
const byGen = {};
  units.forEach((u) => { (byGen[u.gen] = byGen[u.gen] || []).push(u); });
  const maxGen = Math.max(...Object.keys(byGen).map(Number), 0);

  // Hər nəsil sırasını "əsas şəxsin" (valideynləri olanın) doğum tarixinə görə sırala
  const getPrimary = (unit) => {
    for (const id of unit.ids) {
      const p = byId[id];
      if (p?.fatherId || p?.motherId) return p;
    }
    return byId[unit.ids[0]];
  };
  Object.values(byGen).forEach((row) => {
    row.sort((a, b) => {
      const dateA = getPrimary(a)?.birthDate || '9999-99-99';
      const dateB = getPrimary(b)?.birthDate || '9999-99-99';
      return dateA.localeCompare(dateB);
    });
  });

  const unitWidth = (u) => u.ids.length * NODE_W + (u.ids.length - 1) * 10;

  // Aşağıdan yuxarıya doğru yerləşdir — valideynləri övladlarının üstündə mərkəzləşdir
  for (let g = maxGen; g >= 0; g--) {
    const row = byGen[g] || [];
    let cursor = 0;
    row.forEach((u) => {
      const childUnits = units.filter(
        (cu) =>
          cu.gen === g + 1 &&
          cu.ids.some((cid) => {
            const c = byId[cid];
            return u.ids.includes(c.fatherId) || u.ids.includes(c.motherId);
          })
      );
      if (childUnits.length && childUnits.every((cu) => cu.x !== undefined)) {
        const minX = Math.min(...childUnits.map((cu) => cu.x));
        const maxX = Math.max(...childUnits.map((cu) => cu.x + unitWidth(cu)));
        const desired = (minX + maxX) / 2 - unitWidth(u) / 2;
        u.x = Math.max(cursor, desired);
      } else {
        u.x = cursor;
      }
      cursor = u.x + unitWidth(u) + H_GAP;
    });

    // Üst-üstə düşməni həll et
    for (let i = 1; i < row.length; i++) {
      const prev = row[i - 1];
      const cur = row[i];
      const minStart = prev.x + unitWidth(prev) + H_GAP;
      if (cur.x < minStart) cur.x = minStart;
    }
  }

  // Düyünlərin son mövqelərini hesabla
  const nodes = [];
  units.forEach((u) => {
    const y = u.gen * V_GAP;
    u.ids.forEach((id, idx) => {
      nodes.push({
        id,
        x: u.x + idx * (NODE_W + 10),
        y,
        person: byId[id],
      });
    });
  });

  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const links = [];

  // Valideyn-övlad bağlantıları
  people.forEach((p) => {
    const child = nodeById[p.id];
    if (!child) return;
    const father = p.fatherId ? nodeById[p.fatherId] : null;
    const mother = p.motherId ? nodeById[p.motherId] : null;
    if (father && mother) {
      const midX = (father.x + mother.x) / 2 + NODE_W / 2;
      const midY = father.y + NODE_H;
      links.push({
        type: 'parent',
        x1: midX,
        y1: midY,
        x2: child.x + NODE_W / 2,
        y2: child.y,
      });
    } else if (father) {
      links.push({
        type: 'parent',
        x1: father.x + NODE_W / 2,
        y1: father.y + NODE_H,
        x2: child.x + NODE_W / 2,
        y2: child.y,
      });
    } else if (mother) {
      links.push({
        type: 'parent',
        x1: mother.x + NODE_W / 2,
        y1: mother.y + NODE_H,
        x2: child.x + NODE_W / 2,
        y2: child.y,
      });
    }
  });

  // Ər-arvad bağlantıları
  const seenSpouse = new Set();
  people.forEach((p) => {
    if (p.spouseId && !seenSpouse.has(p.id + ':' + p.spouseId)) {
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
    }
  });

  const width = Math.max(...nodes.map((n) => n.x + NODE_W), 400);
  const height = Math.max(...nodes.map((n) => n.y + NODE_H), 300);

  return { nodes, links, width, height, NODE_W, NODE_H };
}
