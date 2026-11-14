# PRD – Personal Clinical Record

Verze: 1.0  
Jazyk aplikace: čeština (výchozí), architektura připravená na lokalizaci  
Časové pásmo: Europe/Prague (uživatelsky konfigurovatelné)  
Cílová zařízení: desktop a iPhone, rovnocenná priorita

## 1. Vize produktu

Vytvořit osobní elektronickou zdravotní kartu s informační architekturou inspirovanou nemocničními EHR/NIS. Umožní strukturovaně evidovat zdravotní údaje, léky a jejich skutečné užití, měření, laboratorní výsledky, symptomy, osobní pozorování, zdravotní události a dokumenty.

Aplikace má působit jako moderní klinický systém, nikoliv jako wellness tracker. Má spojovat klinickou přehlednost a informační hustotu s moderním designem, rychlým zadáváním a kvalitním mobilním ovládáním.

## 2. Cíle

1. Vést jednotnou chronologickou historii zdravotních událostí.
2. Rozlišovat plán/ordinaci od skutečně provedeného úkonu.
3. Umožnit rychlé zadání měření, medikace a poznámky.
4. Zobrazovat trendy a historii hodnot bez automatického stanovování diagnóz.
5. Uchovávat data lokálně a umožnit jejich export, zálohu a obnovu.
6. Zajistit konzistentní zkušenost na desktopu i iPhonu.
7. Navrhnout datový model tak, aby později podporoval více pacientů a více uživatelských rolí.

## 3. Ne-cíle

- Nenahrazuje zdravotnickou dokumentaci poskytovatele podle českých právních předpisů.
- Není určen k poskytování zdravotních služeb.
- Není klinický decision-support systém.
- Nepočítá dávkování ani nedoporučuje zahájení, vysazení či změnu léčby.
- Neprovádí automatické diagnózy, triáž ani predikce.
- Neintegruje se v MVP s nemocničními systémy, eReceptem, zdravotními pojišťovnami ani externími API.
- Nevyžaduje účet u externího poskytovatele.

## 4. Uživatelé a pacientský rozsah

MVP: jeden lokální vlastník účtu a jeden aktivní pacientský profil. Datový model musí mít `patient_id` u všech klinických entit a nesmí předpokládat globálně jediného pacienta. Později musí být možné přidat další pacienty bez migrace celého datového modelu.

Do budoucna lze přidat role: owner, editor/caregiver, read-only. V MVP stačí jeden administrátorský účet a pacientský profil.

## 5. Hlavní navigace

1. Přehled
2. Dekurz / Časová osa
3. Medikace
4. Vitální funkce
5. Symptomy a deník
6. Laboratoř
7. Bilance tekutin
8. Diagnózy a anamnéza
9. Dokumenty
10. Nastavení

MVP implementuje plnohodnotně Přehled, Časovou osu, Medikaci, Vitální funkce a základní Diagnózy/Alergie. Ostatní moduly mají být v datovém modelu a roadmapě připravené, nikoliv předstírané nefunkční obrazovky.

## 6. Funkční požadavky

### 6.1 Pacientská karta
- Profil: jméno, preferované oslovení, datum narození (volitelné), výška, výchozí hmotnost, krevní skupina (volitelné), kontaktní údaje (volitelné).
- Osobní anamnéza: textové položky s kategorií, datem a zdrojem.
- Diagnózy/stavy: název, popis, stav (aktivní, v remisi, vyřešeno, nepotvrzeno), datum začátku/konce, poznámka.
- Alergie/intolerance: látka, reakce, závažnost (pokud známa), stav ověření, poznámka.
- Každá informace může mít zdroj: vlastní sdělení, lékařská zpráva, laboratorní nález, jiný dokument, neznámý.
- Neznámá hodnota není totéž co negativní nález. Např. „alergie neznámé“ se nesmí zobrazit jako „bez alergií“.

### 6.2 Medikace – Medication Orders
U každé ordinace/evidence léku:
- Název přípravku a případně účinná látka.
- Síla a léková forma.
- Dávka a jednotka dávky.
- Cesta podání (perorální, sublingvální, kožní, inhalace, injekční, infuzní, oční, ušní, rektální, jiná).
- Režim: pravidelný, dle potřeby (PRN), jednorázový, kúra.
- Frekvence / plánované časy / slovní instrukce.
- Datum začátku a konce.
- Indikace a poznámka.
- Stav: návrh, aktivní, pozastavená, ukončená, zrušená.
- Zdroj ordinace: lékař, vlastní evidence podle předepsaného režimu, historický záznam, jiný.
- Nesmí se předpokládat, že aplikace sama ověřila správnost dávky nebo předpisu.

### 6.3 Skutečné užití / podání – Medication Administration
Samostatná událost navázaná na medikační záznam:
- Skutečné datum a čas užití/podání.
- Skutečně užité množství a jednotka.
- Cesta podání (předvyplněná z ordinace, ale editovatelná).
- Stav: užito/podáno, částečně užito, odmítnuto, vynecháno, odloženo, neznámé.
- Důvod nebo poznámka.
- Záznam provedl: pacient (MVP).
- Čas vytvoření záznamu a čas události se ukládají samostatně.
- Podání nesmí vzniknout automaticky jen proto, že nastal plánovaný čas.
- Aplikace nesmí prezentovat plánovanou dávku jako skutečně užitou.

### 6.4 Vitální funkce a měření
Výchozí katalog:
- Krevní tlak systolický/diastolický (mmHg) – jedna společná událost s dvojicí hodnot.
- Tepová frekvence (bpm).
- Tělesná teplota (°C).
- Saturace SpO₂ (%).
- Dechová frekvence (/min).
- Hmotnost (kg).
- Výška (cm).
- Glykemie (mmol/l).
- Bolest (0–10; subjektivní skóre, nikoliv vitální funkce).
- Volitelné vlastní veličiny.

Každé měření:
- veličina / definice,
- hodnota (numerická nebo textová podle typu),
- jednotka,
- čas měření,
- čas záznamu,
- metoda/místo/poloha (volitelné),
- kontext (např. před jídlem, po jídle, v klidu),
- poznámka,
- zdroj měření (ruční, import, zařízení – v MVP ruční).

Validace:
- Hodnoty musí být číselné tam, kde to definice vyžaduje.
- Jednotky se ukládají normalizovaně a zobrazují s českou lokalizací.
- Neobvyklé hodnoty lze označit jako „zkontrolovat“, ale aplikace nesmí sama tvrdit diagnózu ani vyvozovat klinický závěr.
- Uživatelsky definované referenční/varovné meze jsou volitelné a jasně označené jako vlastní nastavení, nikoliv univerzální klinická norma.

### 6.5 Dekurz / chronologická časová osa
Jednotný chronologický pohled na:
- měření,
- užití/podání léků,
- symptomy,
- subjektivní záznamy,
- poznámky,
- laboratorní výsledky,
- návštěvy a výkony,
- dokumenty.

Funkce:
- řazení od nejnovějšího / nejstaršího,
- filtr podle typu a období,
- full-text vyhledávání,
- detail události,
- rychlé přidání,
- zobrazení času události i času zápisu,
- oprava formou auditované korekce, nikoliv tichým přepsáním historie.

### 6.6 Symptomy a osobní deník
- Název symptomu.
- Intenzita (např. 0–10, volitelná).
- Lokalizace a charakter.
- Začátek/konec nebo okamžik.
- Kontext/spouštěč.
- Poznámka.
- Subjektivní oblasti: nálada, úzkost, energie, únava, spánek, bolest, nevolnost.
- Každou škálu lze konfigurovat a vypnout.
- Záznam musí být rychlý a nesmí působit jako diagnostický test.

### 6.7 Laboratorní výsledky
- Název testu, výsledek, jednotka, referenční interval.
- Datum/čas odběru a datum/čas výsledku.
- Laboratoř / zdroj a poznámka.
- Označení mimo referenční rozmezí se odvozuje pouze z dodaného referenčního intervalu.
- Referenční interval se ukládá společně s konkrétním výsledkem; nesmí se zpětně přepisovat globální hodnotou.
- Podpora skupin/panelů (např. krevní obraz).
- Import z CSV/PDF je pozdější fáze; OCR není MVP.

### 6.8 Bilance tekutin (pozdější modul)
- Příjem/výdej, typ, objem ml, čas, poznámka.
- Denní součty a čistá bilance.
- Žádné klinické doporučení na základě bilance.

### 6.9 Dokumenty
- Nahrání PDF/JPG/PNG.
- Název, typ, datum dokumentu, datum přidání, zdroj, poznámka.
- Vazba na pacienta a volitelně na událost/diagnózu/lab výsledek.
- Dokumenty zůstávají lokálně.
- Ověřit bezpečné limity velikosti a MIME typu.
- Náhled PDF/obrázků; soubory nesmí být veřejně dostupné bez autorizace.

### 6.10 Export a záloha
- Export vybraného období do PDF.
- Export strukturovaných dat do CSV a JSON.
- Kompletní záloha databáze a přiložených souborů.
- Obnova ze zálohy s kontrolou integrity.
- Export musí uvádět datum vytvoření, časové pásmo, filtry a zdroje.
- PDF je informativní výpis osobního záznamníku, ne oficiální zdravotnická dokumentace.

## 7. Dashboard

Dashboard obsahuje:
- pacientský header,
- důležité upozornění (např. alergie – pokud jsou evidované),
- poslední měření,
- poslední užití léků,
- aktivní medikační přehled,
- poslední události,
- rychlé akce: Přidat měření, Zaznamenat užití léku, Přidat poznámku, Zaznamenat symptom,
- grafy trendů za 7/30/90 dní.

Dashboard nesmí generovat skóre zdravotního rizika ani falešný „celkový zdravotní stav“.

## 8. Rychlé zadávání

Každá hlavní agenda musí podporovat rychlé přidání:
- Desktop: klávesová zkratka (např. `N` otevře nabídku nového záznamu; zkratky nesmí kolidovat s editací textu).
- iPhone: výrazné tlačítko „+“ / spodní quick-action panel.
- Čas události se předvyplní aktuálním lokálním časem.
- Umožnit zpětné zadání času.
- Formuláře mají rozumné výchozí hodnoty, ale nikdy nesmí předvyplnit stav „užito“ bez potvrzení.
- Po uložení zobrazit jasné potvrzení a možnost otevřít záznam.

## 9. Nefunkční požadavky

- Responzivní UI od šířky 320 CSS px.
- WCAG 2.2 AA jako cíl.
- Touch targety na mobilu ideálně alespoň 44×44 CSS px.
- Žádné horizontální přetékání hlavního layoutu; široké klinické tabulky mohou mít vlastní řízený horizontální scroll.
- Výchozí čeština, české formáty data/času/čísel.
- Časové pásmo Europe/Prague, ukládat UTC timestamp a zachovat lokální offset/zone pro zobrazení.
- Rychlé načítání lokální aplikace; stránkování historie.
- Žádné externí fonty, CDN nebo analytické skripty v produkčním lokálním režimu.
- Přístupnost klávesnicí, viditelný focus, sémantické popisky.
- Konzistentní chování na Safari iOS a desktopových Chromium/Safari.

## 10. Bezpečnost a soukromí

- Aplikace poslouchá pouze na loopback/LAN rozhraní podle explicitní konfigurace.
- Výchozí režim nesmí být veřejně dostupný z internetu.
- Autentizace před přístupem k jakémukoliv pacientskému endpointu.
- Hesla hashovat Argon2id (neukládat plaintext).
- Bezpečné, HttpOnly, SameSite cookies; Secure při HTTPS.
- CSRF ochrana pro mutační endpointy.
- Ochrana proti XSS, SQL injection a path traversal.
- Rate limit login endpointu.
- Auditní log změn.
- Šifrované zálohy; doporučená šifrovaná záloha mimo hostitelský disk.
- Dokumenty ukládat mimo veřejný webroot.
- Žádná telemetrie, reklamní SDK, tracking nebo automatické cloudové synchronizace.
- Zdravotní údaje se nesmí zapisovat do aplikačních logů.
- Uživatel musí být upozorněn, že přístup přes nešifrované HTTP v LAN není vhodný pro reálné zdravotní údaje; pro běžné používání nastavit HTTPS.

## 11. Akceptační kritéria produktu

MVP je přijatelné, pokud uživatel dokáže:
1. vytvořit a upravit pacientský profil;
2. přidat aktivní medikační záznam;
3. zaznamenat skutečné užití léku s časem a dávkou;
4. zaznamenat vynechání/odložení bez falešného podání;
5. přidat krevní tlak a další vitální hodnoty;
6. vytvořit vlastní měřenou veličinu;
7. zobrazit historii měření v tabulce a grafu;
8. přidat symptom a volný klinicky strukturovaný záznam;
9. zobrazit všechny události v jedné časové ose;
10. exportovat vybrané záznamy;
11. vytvořit zálohu a obnovit ji;
12. provést stejné základní úkony na desktopu i iPhonu;
13. používat aplikaci bez internetového připojení k externím službám (při dostupnosti lokálního serveru).
