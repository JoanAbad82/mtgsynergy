import { Fragment,h } from "preact";
import renderToString from "preact-render-to-string";
import { beforeAll,afterAll,describe,it,expect } from "vitest";
import { ExternalCardDiscoveryPanel } from "../panels/ExternalCardDiscoveryPanel";
const g=globalThis as typeof globalThis & {React?:{createElement:typeof h;Fragment:typeof Fragment}};
const prior=g.React;
beforeAll(()=>{g.React={createElement:h,Fragment};});
afterAll(()=>{if(prior)g.React=prior;else delete g.React;});
describe("RED: legal cards must not display stale pre-gate warning",()=>{
it("a format-verified visible card cannot also say legality is unverified",()=>{
const warning="Compatibilidad semántica; legalidad de formato no verificada.";
const row:any={candidate:{identityKey:"name:silverback elder",card:{name:"Silverback Elder"},retrievedByAnchors:[]}, contextualScore:7,connectedDeckCardCount:1,relatedDeckCards:[{name:"Collected Company"}],reasons:[],evidenceLevel:"limited",warnings:[warning]};
const html=renderToString(h(ExternalCardDiscoveryPanel,{candidates:[row],loading:false,error:null,selectedFormat:"modern",legality:{legal:[row],unknown:[],excluded:0,restricted:0,sourceUpdatedAt:"2026-10-12T09:02:38Z",degraded:false,warning:null},mana:{direct:[{row,fit:"direct",required:["G"],withoutDirectSource:[],note:""}],needsReview:[],unknown:[],evaluatedCount:1,directColors:["G"],landSourcesNotModelled:0,sourceUpdatedAt:"2026-10-12T09:02:38Z",degraded:false,warning:null}} as any));
expect(html).toContain("Recomendaciones con legalidad de formato verificada");
expect(html).not.toContain(warning);
expect(renderToString(h(ExternalCardDiscoveryPanel,{candidates:[{...row,warnings:[warning,"Evidencia semántica limitada."]}],loading:false,error:null,selectedFormat:"modern",legality:{legal:[row],unknown:[],excluded:0,restricted:0,sourceUpdatedAt:"2026-10-12T09:02:38Z",degraded:false,warning:null}} as any))).toContain("Evidencia semántica limitada.");
expect(renderToString(h(ExternalCardDiscoveryPanel,{candidates:[row],loading:false,error:null} as any))).toContain(warning);
});
});
