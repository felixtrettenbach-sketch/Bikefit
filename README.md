# 🚴 BikeFit – Videobasiertes Rennrad-Fitting im Browser

BikeFit analysiert Videoaufnahmen eines Fahrers auf der Rolle (Seitenansicht),
bestimmt daraus die zentralen Gelenkwinkel, **bewertet die Ausgangslage** anhand
wissenschaftlich publizierter Zielbereiche und leitet zusammen mit den
**Körper- und Radmaßen** konkrete, millimetergenaue **Einstellempfehlungen** ab.

Die gesamte Auswertung (Pose-Erkennung mit MediaPipe) läuft **lokal im Browser** –
es werden keine Videodaten hochgeladen.

## Starten

Die App ist eine statische Web-App ohne Build-Schritt. Wegen der ES-Module muss
sie über einen lokalen Webserver geöffnet werden:

```bash
# im Projektverzeichnis, Variante 1:
python3 -m http.server 8000
# oder Variante 2:
npx serve .
```

Dann im Browser <http://localhost:8000> öffnen (Chrome/Edge empfohlen).
Die MediaPipe-Bibliothek, die WASM-Laufzeit und das Pose-Modell liegen lokal
unter `vendor/mediapipe/` – die App funktioniert damit vollständig **offline**.
Fehlen die vendor-Dateien, lädt die App automatisch als Fallback vom
jsDelivr-CDN nach.

## Ablauf

1. **Maße eingeben** – Körpergröße und Schrittlänge (Pflicht), optional
   Fahrertyp/Ziel, Kurbellänge, aktuelle Sattelhöhe, Setback und Überhöhung.
2. **Aufnahmen erfassen** – Video-Upload oder Webcam. Kamera exakt seitlich auf
   Hüfthöhe, ganzer Fahrer im Bild, 15–20 s pedalieren bei normaler
   Trittfrequenz. Mehrere Aufnahmen (Unterlenker/Oberlenker, ermüdet/frisch)
   werden gemeinsam ausgewertet.
3. **Ausgangslage** – Messwerte, Zielbereiche und Bewertung pro Gelenkwinkel,
   inklusive Verlaufskurve der Kniebeugung.
4. **Empfehlungen** – priorisierte Einstellungsvorschläge (Sattelhöhe in mm,
   Cockpit-Höhe/-Länge, Kurbellänge, Sattel-Längsposition) plus Vergleich mit
   den klassischen anthropometrischen Formeln (LeMond, Hamley).

## Gemessene Größen und Zielbereiche

Alle Zielbereiche gelten für **dynamische** Messungen (während des Pedalierens).
Statische Goniometer-Werte fallen systematisch 5–10° kleiner aus
(Ferrer-Roca et al. 2012).

| Messgröße | Zielbereich (dynamisch) | Grundlage |
|---|---|---|
| Kniebeugung am unteren Totpunkt | 30–40° | Holmes et al. 1994 (statisch 25–35°), Ferrer-Roca et al. 2012, Peveler 2008, Bini et al. 2011 |
| Kniebeugung am oberen Totpunkt | 100–115° | Bini et al. 2011, Burt 2014 |
| Minimaler Hüftwinkel | > 45° | Burt 2014, Priego Quesada et al. 2019 |
| Rumpfwinkel zur Horizontalen | 40–50° (Komfort) / 33–43° (Endurance) / 25–35° (Race) | Burt 2014, Fintelman et al. 2014 |
| Ellbogenwinkel | 140–165° | Burt 2014 |

Die Totpunkt-Winkel werden als 5./95. Perzentil der Winkelzeitreihe bestimmt –
das ist robust gegenüber einzelnen Fehldetektionen der Pose-Erkennung.

Empfohlene Sattelhöhen-Änderungen werden geometrisch (Kosinussatz) über die
Beinsegmentlängen berechnet; die Segmentlängen werden anthropometrisch aus der
Körpergröße geschätzt (Oberschenkel ≈ 0,245 × Körpergröße, Unterschenkel ≈
0,246 × Körpergröße; Winter 2009).

## Wissenschaftliche Referenzen

- Holmes JC, Pruitt AL, Whalen NJ (1994). Lower extremity overuse in bicycling. *Clin Sports Med* 13(1): 187–205.
- Peveler WW (2008). Effects of saddle height on economy in cycling. *J Strength Cond Res* 22(4): 1355–1359.
- Peveler WW, Green JM (2011). Effects of saddle height on economy and anaerobic power in trained cyclists. *J Strength Cond Res* 25(3): 629–633.
- Bini R, Hume PA, Croft JL (2011). Effects of bicycle saddle height on knee injury risk and cycling performance. *Sports Med* 41(6): 463–476.
- Ferrer-Roca V, Roig A, Galilea P, García-López J (2012). Influence of saddle height on lower limb kinematics in well-trained cyclists: static vs. dynamic evaluation in bike fitting. *J Strength Cond Res* 26(11): 3025–3029.
- Hamley EJ, Thomas V (1967). Physiological and postural factors in the calibration of the bicycle ergometer. *J Physiol* 191(2): 55P–56P.
- LeMond G, Gordis K (1987). *Greg LeMond's Complete Book of Bicycling.* Perigee.
- Winter DA (2009). *Biomechanics and Motor Control of Human Movement*, 4. Aufl. Wiley.
- Fintelman DM, Sterling M, Hemida H, Li FX (2014). Optimal cycling time trial position models: aerodynamics versus power output and metabolic energy. *J Biomech* 47(8): 1894–1898.
- de Vey Mestdagh K (1998). Personal perspective: in search of an optimum cycling posture. *Appl Ergon* 29(5): 325–334.
- Salai M, Brosh T, Blankstein A, Oran A, Chechik A (1999). Effect of changing the saddle angle on the incidence of low back pain in recreational bicyclists. *Br J Sports Med* 33(6): 398–400.
- Burt P (2014). *Bike Fit: Optimise your bike position for high performance and injury avoidance.* Bloomsbury.
- Priego Quesada JI, Kerr ZY, Bertucci WM, Carpes FP (2019). A retrospective international study on factors associated with injury, discomfort and pain perception among cyclists. *PLoS ONE* 14(1): e0211197.

## Grenzen der Methode

- **2D-Analyse**: Winkel werden in der Bildebene gemessen. Die Kamera muss exakt
  senkrecht zur Fahrerebene und auf Hüfthöhe stehen, sonst entstehen
  Parallaxenfehler.
- Die mm-Empfehlungen sind geometrische Näherungen und als Orientierung für
  schrittweise Anpassungen (≤ 5 mm pro Schritt, danach neu messen) gedacht.
- Die App ersetzt weder ein professionelles Bike-Fitting noch medizinische
  Beratung – insbesondere bei bestehenden Schmerzen oder Taubheitsgefühlen.

## Technik

- Vanilla JavaScript (ES-Module), kein Build-Schritt
- [MediaPipe Pose Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker)
  (Tasks Vision API) für die Pose-Erkennung, GPU-beschleunigt via WebGL
- Auswertung: robuste Perzentil-Statistik über die Winkelzeitreihen
