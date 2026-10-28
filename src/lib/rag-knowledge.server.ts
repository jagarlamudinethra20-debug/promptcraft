// 20 curated agronomic grounding chunks on Super El Niño mitigation in
// South & South-East Asian agriculture. Used to ground the AI judge.

export const RAG_CHUNKS: string[] = [
  "Super El Niño events warm the central-eastern Pacific by more than 2 degrees C above normal, typically suppressing the South Asian summer monsoon and delaying onset by 1-3 weeks across India, Bangladesh and Pakistan.",
  "El Niño years in South-East Asia correlate with rainfall deficits of 10-30 percent in Indonesia, the Philippines and Thailand, with the strongest impact on rain-fed rice during the wet-season (kharif / main-season) crop.",
  "Short-duration and drought-tolerant rice varieties (e.g. Sahbhagi Dhan, DRR Dhan 44, Sahod Ulan lines) can mature in 100-110 days, letting farmers escape terminal drought during a failing monsoon.",
  "Alternate Wetting and Drying (AWD) irrigation reduces rice water use by 15-30 percent without yield loss when the field water tube shows a water table no lower than 15 cm below the surface before re-flooding.",
  "Direct-Seeded Rice (DSR) saves roughly 30 percent of irrigation water and 15-20 days of crop duration compared with puddled transplanted rice, an important buffer when reservoir storage is low.",
  "Crop diversification from paddy to pulses, millets, sorghum and oilseeds in deficit years lowers water demand per hectare by 40-60 percent and improves soil nitrogen through legume fixation.",
  "Contingency cropping plans issued by district agriculture offices should be triggered when cumulative rainfall is below 50 percent of normal by the third week of the sowing window.",
  "Mulching with crop residue at 4-6 tonnes per hectare reduces evaporative soil moisture loss by up to 25 percent and lowers surface soil temperature by 3-5 degrees C during heat spikes.",
  "Micro-irrigation (drip and sprinkler) improves water-use efficiency to 85-95 percent versus 35-50 percent for flood irrigation, and is subsidised in India under PMKSY 'Per Drop More Crop'.",
  "Farm ponds and community rainwater harvesting structures sized to 300-500 cubic metres per hectare can provide one or two life-saving irrigations during a mid-season dry spell.",
  "Seasonal climate forecasts from IRI, ECMWF and national meteorological agencies gain skill 3-6 months ahead during strong ENSO events, making them actionable for sowing-date and variety decisions.",
  "Index-based (parametric) crop insurance pays out on a rainfall or NDVI trigger rather than loss assessment, reducing claim settlement time from months to weeks - critical for smallholder liquidity.",
  "Heat stress during rice flowering above 35 degrees C for more than one hour causes spikelet sterility; shifting the flowering window by adjusting transplanting dates is a low-cost mitigation.",
  "Livestock feed shortages follow El Niño droughts; silage making, urea-treated straw and fodder banks maintain milk yields when green fodder availability drops.",
  "Groundwater over-extraction during El Niño years accelerates aquifer decline; conjunctive use with managed aquifer recharge protects the following season's supply.",
  "Soil Health Cards and site-specific nutrient management prevent over-application of nitrogen, which increases crop water demand and lodging risk under moisture stress.",
  "Agroforestry and shelterbelts reduce wind speed by 30-50 percent downwind, lowering evapotranspiration and protecting crops during hot dry spells.",
  "Early-warning dissemination through SMS, IVR and local-language advisories (e.g. Kisan Call Centre, Mahatma Phule Krishi advisories) materially increases farmer adoption of contingency measures.",
  "Post-harvest losses rise during erratic weather; hermetic storage bags and solar dryers protect grain quality when unseasonal rain follows an El Niño-driven dry spell.",
  "Equity matters: tenant farmers, women farmers and landless labourers face the largest income shocks from El Niño, so mitigation plans must include wage-employment and food-security safety nets.",
];

export const RAG_CONTEXT = RAG_CHUNKS.map((c, i) => `[${i + 1}] ${c}`).join("\n");
