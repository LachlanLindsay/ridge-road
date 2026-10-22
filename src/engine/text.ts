// Plain words for quantities of stores, shared by the engine's report lines and the UI.

const num = (v: number) => {
  const r = Math.round(v * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
};
const lb = (v: number) => `${Math.round(v)} lb`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function itemText(item: string, qty: number): string {
  switch (item) {
    case 'flour':
      return `${lb(qty)} flour`;
    case 'saltMeat':
      return `${lb(qty)} salt meat`;
    case 'tea':
      return `${lb(qty)} tea and sugar`;
    case 'shots':
      return plural(Math.round(qty), 'shot');
    case 'axes':
      return plural(qty, 'axe');
    case 'hatchets':
      return plural(qty, 'hatchet');
    case 'hoe':
      return 'the hoe';
    case 'blankets':
      return plural(qty, 'blanket');
    case 'shoes':
      return `${plural(qty, 'pair')} of shoes`;
    case 'campKit':
      return 'the camp kit';
    case 'grass':
      return `${lb(qty)} cut grass`;
    default:
      return `${num(qty)} ${item}`;
  }
}
