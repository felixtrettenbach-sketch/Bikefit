/**
 * Wissenschaftliche Referenzdaten für das Bike-Fitting.
 *
 * Alle Zielbereiche beziehen sich – sofern nicht anders angegeben – auf
 * DYNAMISCHE Messungen (Videoanalyse während des Pedalierens). Statisch
 * (Goniometer, Fuß auf Pedal in Unterste-Totpunkt-Stellung) gemessene
 * Winkel fallen systematisch ca. 5–10° kleiner aus als dynamisch
 * gemessene (Ferrer-Roca et al. 2012).
 */

export const REFERENCES = [
  {
    id: "holmes1994",
    short: "Holmes et al. 1994",
    full: "Holmes JC, Pruitt AL, Whalen NJ (1994). Lower extremity overuse in bicycling. Clinics in Sports Medicine 13(1): 187–205.",
  },
  {
    id: "peveler2008",
    short: "Peveler 2008",
    full: "Peveler WW (2008). Effects of saddle height on economy in cycling. Journal of Strength and Conditioning Research 22(4): 1355–1359.",
  },
  {
    id: "peveler2011",
    short: "Peveler & Green 2011",
    full: "Peveler WW, Green JM (2011). Effects of saddle height on economy and anaerobic power in trained cyclists. Journal of Strength and Conditioning Research 25(3): 629–633.",
  },
  {
    id: "bini2011",
    short: "Bini et al. 2011",
    full: "Bini R, Hume PA, Croft JL (2011). Effects of bicycle saddle height on knee injury risk and cycling performance. Sports Medicine 41(6): 463–476.",
  },
  {
    id: "ferrerroca2012",
    short: "Ferrer-Roca et al. 2012",
    full: "Ferrer-Roca V, Roig A, Galilea P, García-López J (2012). Influence of saddle height on lower limb kinematics in well-trained cyclists: static vs. dynamic evaluation in bike fitting. Journal of Strength and Conditioning Research 26(11): 3025–3029.",
  },
  {
    id: "hamley1967",
    short: "Hamley & Thomas 1967",
    full: "Hamley EJ, Thomas V (1967). Physiological and postural factors in the calibration of the bicycle ergometer. Journal of Physiology 191(2): 55P–56P.",
  },
  {
    id: "lemond1987",
    short: "LeMond & Gordis 1987",
    full: "LeMond G, Gordis K (1987). Greg LeMond's Complete Book of Bicycling. Perigee Books. (Sattelhöhe = 0,883 × Schrittlänge, Tretlagermitte bis Satteloberkante)",
  },
  {
    id: "winter2009",
    short: "Winter 2009",
    full: "Winter DA (2009). Biomechanics and Motor Control of Human Movement, 4. Aufl., Wiley. (Anthropometrische Segmentlängen: Oberschenkel ≈ 0,245 × Körpergröße, Unterschenkel ≈ 0,246 × Körpergröße)",
  },
  {
    id: "fintelman2014",
    short: "Fintelman et al. 2014",
    full: "Fintelman DM, Sterling M, Hemida H, Li FX (2014). Optimal cycling time trial position models: Aerodynamics versus power output and metabolic energy. Journal of Biomechanics 47(8): 1894–1898. (Trade-off: flacherer Rumpfwinkel senkt Luftwiderstand, reduziert aber Leistungsabgabe und Effizienz)",
  },
  {
    id: "deveymestdagh1998",
    short: "de Vey Mestdagh 1998",
    full: "de Vey Mestdagh K (1998). Personal perspective: in search of an optimum cycling posture. Applied Ergonomics 29(5): 325–334. (Sattel-Längsposition, KOPS-Heuristik und ihre Grenzen)",
  },
  {
    id: "salai1999",
    short: "Salai et al. 1999",
    full: "Salai M, Brosh T, Blankstein A, Oran A, Chechik A (1999). Effect of changing the saddle angle on the incidence of low back pain in recreational bicyclists. British Journal of Sports Medicine 33(6): 398–400. (Leichte Sattelneigung nach vorn kann Rückenschmerzen reduzieren)",
  },
  {
    id: "burt2014",
    short: "Burt 2014",
    full: "Burt P (2014). Bike Fit: Optimise your bike position for high performance and injury avoidance. Bloomsbury. (Praxisorientierte Richtwerte für Rumpf-, Ellbogen- und Hüftwinkel aus der professionellen Fitting-Praxis, u.a. Retül/BC-Normwerte)",
  },
  {
    id: "priego2019",
    short: "Priego Quesada et al. 2019",
    full: "Priego Quesada JI, Kerr ZY, Bertucci WM, Carpes FP (2019). A retrospective international study on factors associated with injury, discomfort and pain perception among cyclists. PLoS ONE 14(1): e0211197. (Zusammenhang zwischen Sitzposition und Beschwerdebildern)",
  },
];

export function refById(id) {
  return REFERENCES.find((r) => r.id === id);
}

/**
 * Zielbereiche für dynamisch gemessene Gelenkwinkel (Grad).
 * "goal" differenziert Rumpfwinkel-Ziele nach Fahrertyp.
 */
export const TARGETS = {
  // Kniebeugung (Flexion) am unteren Totpunkt (UT/BDC).
  // Statische Empfehlung 25–35° (Holmes 1994); dynamisch gemessen liegen die
  // Werte 5–10° höher (Ferrer-Roca 2012) → dynamischer Zielbereich 30–40°.
  kneeFlexBDC: {
    min: 30,
    max: 40,
    optimal: 35,
    label: "Kniebeugung am unteren Totpunkt",
    refs: ["holmes1994", "ferrerroca2012", "peveler2008", "bini2011"],
    note:
      "Weniger Beugung (gestreckteres Bein) verbessert tendenziell die Ökonomie, " +
      "erhöht aber das Risiko für Beschwerden der hinteren Kette (Kniekehle, " +
      "Hamstrings, Achillessehne); mehr Beugung belastet das Patellofemoralgelenk.",
  },
  // Maximale Kniebeugung am oberen Totpunkt (informativ).
  kneeFlexTDC: {
    min: 100,
    max: 115,
    optimal: 110,
    label: "Kniebeugung am oberen Totpunkt",
    refs: ["bini2011", "burt2014"],
    note:
      "Stark erhöhte Werte deuten auf zu niedrigen Sattel oder zu lange Kurbeln " +
      "hin und erhöhen die patellofemorale Kompression.",
  },
  // Minimaler Hüftwinkel (Schulter–Hüfte–Knie) am oberen Totpunkt.
  hipAngleMin: {
    min: 45,
    max: 90,
    optimal: 55,
    label: "Minimaler Hüftwinkel (geschlossene Hüfte)",
    refs: ["burt2014", "priego2019"],
    note:
      "Ein zu stark geschlossener Hüftwinkel begrenzt die Kraftentfaltung am " +
      "oberen Totpunkt und begünstigt Hüft-/Leistenbeschwerden sowie ein " +
      "instabiles Becken.",
  },
  // Rumpfwinkel gegen die Horizontale, zielabhängig.
  torsoAngle: {
    byGoal: {
      comfort: { min: 40, max: 50, label: "Komfort / Einsteiger" },
      endurance: { min: 33, max: 43, label: "Endurance / Langstrecke" },
      race: { min: 25, max: 35, label: "Sportlich / Race" },
    },
    label: "Rumpfwinkel zur Horizontalen",
    refs: ["burt2014", "fintelman2014"],
    note:
      "Flachere Position = aerodynamisch günstiger, aber metabolisch teurer und " +
      "höhere Anforderungen an Beweglichkeit und Rumpfstabilität (Fintelman 2014).",
  },
  // Ellbogenwinkel (Schulter–Ellbogen–Handgelenk).
  elbowAngle: {
    min: 140,
    max: 165,
    optimal: 155,
    label: "Ellbogenwinkel",
    refs: ["burt2014"],
    note:
      "Leicht gebeugte Ellbogen dämpfen Stöße und entlasten Schulter/Nacken. " +
      "Durchgestreckte Arme (>165°) deuten auf ein zu langes/tiefes Cockpit hin.",
  },
};

/** Anthropometrische Segmentlängen nach Winter (2009), Anteil der Körpergröße. */
export const SEGMENT_FRACTIONS = {
  thigh: 0.245, // Hüfte–Knie
  shank: 0.246, // Knie–Sprunggelenk
};

/** Sattelhöhen-Formeln (klassische anthropometrische Startwerte). */
export const SADDLE_FORMULAS = {
  // Tretlagermitte bis Satteloberkante entlang des Sitzrohrs
  lemond: { factor: 0.883, ref: "lemond1987", label: "LeMond (0,883 × Schrittlänge, Tretlager→Satteloberkante)" },
  // Pedalachse (unten) bis Satteloberkante
  hamley: { factor: 1.09, ref: "hamley1967", label: "Hamley (1,09 × Schrittlänge, Pedalachse→Satteloberkante)" },
};
