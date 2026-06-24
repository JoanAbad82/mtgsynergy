export type SemanticComparisonCardDeltaV1 = { key: string; name: string; quantityA: number; quantityB: number; delta: number };
export type SemanticComparisonItemV1 = { key: string; label: string };
export type SemanticComparisonResultV1 = { cardsAdded: SemanticComparisonCardDeltaV1[]; cardsRemoved: SemanticComparisonCardDeltaV1[]; quantityChanges: SemanticComparisonCardDeltaV1[]; connectionsGained: SemanticComparisonItemV1[]; connectionsLost: SemanticComparisonItemV1[]; eventsGained: SemanticComparisonItemV1[]; eventsLost: SemanticComparisonItemV1[]; coverageA: number | null; coverageB: number | null; coverageDelta: number | null };
type R = Record<string, unknown>;
const rec=(v:unknown):R|null=>v!==null&&typeof v==="object"?v as R:null;
const arr=(v:unknown):unknown[]=>Array.isArray(v)?v:[];
const txt=(v:unknown):string=>typeof v==="string"?v:"";
const n=(v:unknown):number=>typeof v==="number"&&Number.isFinite(v)?v:0;
function canonicalDeckEntries(input: unknown): unknown[] {
  const root = rec(input);
  let value: unknown = rec(root?.deckState);
  for (const segment of ["deck", "entries"]) {
    value = rec(value)?.[segment];
  }
  return arr(value);
}

function cardMap(input: unknown) {
  const source = canonicalDeckEntries(input);
  const map = new Map<string, { key: string; name: string; quantity: number }>();
  for (const raw of source) {
    const entry = rec(raw);
    if (!entry) continue;
    const canonicalIdentity = entry["name_norm"];
    const visibleName = entry["name"];
    const rawQuantity = entry["count"];
    const key = txt(canonicalIdentity).trim().toLowerCase();
    const quantity = n(rawQuantity);
    if (!key || quantity <= 0) continue;
    const current = map.get(key);
    map.set(key, {
      key,
      name: txt(visibleName) || txt(canonicalIdentity) || key,
      quantity: (current?.quantity ?? 0) + quantity,
    });
  }
  return map;
}
function overlay(input:unknown){const r=rec(input);return rec(r?.semanticOverlay)??rec(r?.semantic_overlay)??rec(r?.overlay);}
function item(raw:unknown,kind:"connection"|"event"):SemanticComparisonItemV1|null{const x=rec(raw);if(!x)return null;if(kind==="event"){const id=txt(x.eventId)||txt(x.event_id)||txt(x.id)||txt(x.key);return id?{key:id,label:txt(x.label)||txt(x.name)||id}:null;}const reason=rec(x.reason),source=txt(x.source)||txt(x.from),target=txt(x.target)||txt(x.to),reasonKey=reason?.key===undefined?"":String(reason.key),key=[source,target,reasonKey].join("::");return key==="::::"?null:{key,label:txt(x.label)||[source,target].filter(Boolean).join(" → ")||key};}
function itemMap(values:unknown[],kind:"connection"|"event"){const m=new Map<string,SemanticComparisonItemV1>();for(const v of values){const i=item(v,kind);if(i)m.set(i.key,i);}return m;}
function diff<T extends {key:string}>(a:Map<string,T>,b:Map<string,T>){return [...a.values()].filter(x=>!b.has(x.key)).sort((x,y)=>x.key.localeCompare(y.key));}
function coverage(input:unknown){const o=overlay(input),v=o?.coverage;return typeof v==="number"&&Number.isFinite(v)?v:null;}
export function compareSemanticAnalysisResultsV1(inputA:unknown,inputB:unknown):SemanticComparisonResultV1{const a=cardMap(inputA),b=cardMap(inputB),keys=[...new Set([...a.keys(),...b.keys()])].sort(),combined=keys.map(key=>{const quantityA=a.get(key)?.quantity??0,quantityB=b.get(key)?.quantity??0;return{key,name:a.get(key)?.name??b.get(key)?.name??key,quantityA,quantityB,delta:quantityB-quantityA};});const oa=overlay(inputA),ob=overlay(inputB),ca=itemMap(arr(oa?.connections).length?arr(oa?.connections):arr(oa?.edges),"connection"),cb=itemMap(arr(ob?.connections).length?arr(ob?.connections):arr(ob?.edges),"connection"),ea=itemMap(arr(oa?.events),"event"),eb=itemMap(arr(ob?.events),"event"),coverageA=coverage(inputA),coverageB=coverage(inputB);return{cardsAdded:combined.filter(x=>x.quantityA===0&&x.quantityB>0),cardsRemoved:combined.filter(x=>x.quantityA>0&&x.quantityB===0),quantityChanges:combined.filter(x=>x.quantityA>0&&x.quantityB>0&&x.quantityA!==x.quantityB),connectionsGained:diff(cb,ca),connectionsLost:diff(ca,cb),eventsGained:diff(eb,ea),eventsLost:diff(ea,eb),coverageA,coverageB,coverageDelta:coverageA!==null&&coverageB!==null?coverageB-coverageA:null};}
