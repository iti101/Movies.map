# Samenvatting: Eindopdracht Leerlijn Frontend (30 EC) — v3.6

Dit is een overzicht van de eindopdracht voor de leerlijn Frontend (NOVI Hogeschool), zodat je een compleet beeld hebt van wat er gemaakt en ingeleverd moet worden.

## Waar gaat het om?

De leerlijn Frontend bestaat uit drie cursussen: HTML & CSS, JavaScript en React. Met deze ene eindopdracht toon je aan dat je alle drie beheerst — je kunt geen losse cursussen apart afronden, het is alles-of-niets voor de hele leerlijn.

Je bedenkt zelf een probleem en bouwt daar een webapplicatie voor die alleen de **frontend** betreft (het gedeelte dat de gebruiker ziet en waarmee die interacteert). De applicatie moet praten met een API om data op te halen. Voorbeelden uit het document: een uitleenplatform voor een bibliotheek, een interactieve Pokédex, een heldenencyclopedie (Marvel API), of een advertentieplatform voor buurtbewoners.

**Belangrijke keuze vooraf:** voor inloggen/registreren gebruik je altijd de NOVI Dynamic API. Voor de rest van je functionaliteit mag je kiezen tussen een publieke API (bijv. Edamam, PokéAPI, Marvel API) of ook de NOVI Dynamic API (waarbij je zelf de databasestructuur mag bepalen). Een eigen backend bouwen mag, maar wordt afgeraden — het kost extra tijd en levert geen extra punten op.

**Eerste stap:** voordat je met deelopdracht 1 mag beginnen, lever je een korte casusbeschrijving (max. 250 woorden) in ter goedkeuring bij de docent. Hierin beschrijf je: het probleem dat je oplost, welke API je gebruikt, en de 4 belangrijkste functionaliteiten (waarvan registreren/inloggen er automatisch één is).

## De leeruitkomsten die je moet aantonen

1. **HTML & CSS (LU1)** — statische pagina's bouwen met styling/layout, en een visueel ontwerp (Figma/Adobe XD) omzetten naar een webpagina.
2. **JavaScript (LU2)** — schone, gestructureerde JS-code schrijven met interactie en data ophalen via een API.
3. **React (LU3)** — een interactieve, modulaire webapplicatie bouwen met herbruikbare componenten, state management en life cycles.

---

## De 4 deelopdrachten (en wat je per deelopdracht inlevert)

### 1. Functioneel ontwerp
Het plan vóórdat je gaat programmeren: wat moet de app kunnen en hoe moet die eruitzien.

Moet bevatten:
- Titelblad, inleiding, inhoudsopgave
- Probleembeschrijving + oplossing, met de 4 kernfunctionaliteiten als **user stories**
- Minimaal **4 use case tabellen** (1 voor authenticatie, 3 voor zelfbedachte functionaliteit), elk met 1 main success scenario + 1-3 alternatieve scenario's
- Minimaal **25 functionele en niet-functionele eisen** (samen, niet per se gelijk verdeeld)
- Minimaal **3 inspiratiebronnen** (screenshots/foto's van andere apps) mét toelichting waarom en hoe je dit gebruikt
- Minimaal **5 handgetekende wireframes** (gescand/gefotografeerd), met leesbare begeleidende tekst
- Minimaal **5 screenshots van uitgewerkte schermontwerpen** (Figma/Adobe XD), met titels en beschrijvingen — gedetailleerd genoeg dat je tijdens het coderen geen ontwerpbeslissingen meer hoeft te nemen

**In te leveren:**
- Functioneel ontwerp als PDF (.pdf)
- Link naar het *openbare* Figma/Adobe XD-project met de 5 schermontwerpen

### 2. Verantwoordingsdocument
Een reflectief document dat je bijhoudt terwijl je programmeert: welke technische keuzes je maakt en waarom.

Moet bevatten:
- Minimaal **5 beargumenteerde technische implementatiekeuzes**, elk met een eigen reflectie (waarom deze npm package, waarom een custom hook, etc. — focus op je eigen redenatie, niet op algemene kennis)
- Minimaal **5 limitaties** van de applicatie (functionaliteit, niet styling) + mogelijke doorontwikkelingen
- Reflectie op je eigen leerproces

**In te leveren:**
- Verantwoordingsdocument als PDF (.pdf), inclusief link naar de openbare GitHub-repository
- *Alleen bij herkansing:* het ingevulde 'Template herkansingsfeedback' (Word-document, te vinden in Teams)

### 3. Broncode React
De daadwerkelijke webapplicatie, gebouwd op basis van je schermontwerpen.

Eisen:
- Externe data ophalen via **netwerk requests naar een API**
- Naast login/registratie, 3 andere kernfunctionaliteiten (bijv. doorzoeken/filteren, beheren, aanmaken)
- Een deel van de content alleen zichtbaar voor ingelogde gebruikers, via **React Context** + de NOVI Dynamic API
- Zelf geschreven CSS met **Flexbox** — géén Bootstrap, Material-UI, Tailwind e.d. (iconpacks zoals Phosphor Icons mag wel)
- **React Router** voor navigatie tussen pagina's
- Gebruik van **Git**: klein en beschrijvend committen, pull requests per feature, regelmatig mergen naar main, project op GitHub

**In te leveren:**
- Projectmap met de broncode van de React-applicatie, inclusief installatiehandleiding in de README.md

### 4. Installatiehandleiding
Een README zodat een andere ontwikkelaar (zonder voorkennis van jouw gekozen technieken) het project kan draaien.

Moet bevatten:
- Inhoudsopgave + inleiding (kort doel + belangrijkste functionaliteiten)
- Een screenshot van één van de pagina's
- Gebruikte technieken en frameworks
- Stappenplan om het project lokaal op te zetten (configuratiebestanden, omgevingsvariabelen, API-keys — **let op: jij levert zelf je API key aan in een .env-bestand**, vraag dit nooit aan de nakijkende docent)
- Inloggegevens indien er testaccounts beschikbaar zijn
- Overige beschikbare npm-commando's

**In te leveren:**
- Zelfgeschreven README.md in de root van de React-projectmap
- JSON-configuratiebestand voor de NOVI Dynamic API

---

## Volledige lijst van alle op te leveren producten

1. **Functioneel ontwerp** — PDF
2. **Verantwoordingsdocument** — PDF (+ evt. Template herkansingsfeedback bij herkansing)
3. **Projectmap met broncode React-applicatie** — ZIP-bestand (incl. README.md)
4. **Zelfgeschreven installatiehandleiding (README.md)** — onderdeel van de projectmap
5. **JSON-configuratiebestand voor de NOVI Dynamic API** — los bestand, als ZIP ingeleverd
6. **Link naar het openbare Figma/Adobe XD-project** (in het functioneel ontwerp)
7. **Link naar de openbare GitHub-repository** (in het verantwoordingsdocument)

Let op de inlevervorm: het functioneel ontwerp en het verantwoordingsdocument worden als **losse PDF-documenten** ingeleverd (niet in een ZIP), terwijl de broncode + het JSON-configuratiebestand wél **samen in één ZIP-bestand** (geen RAR) worden ingeleverd.

---

## Quickscan — check dit voordat je inlevert

**Algemene eisen:**
- Naam, inleverdatum en leerlijntitel op de titelpagina
- Documentatie digitaal als .pdf
- Functioneel ontwerp + verantwoordingsdocument los ingeleverd (geen ZIP)
- Broncode + JSON-configuratiebestand wél als ZIP (geen RAR)
- Alle 4 deelopdrachten volledig uitgewerkt
- Geen taal-/spelfouten, goed leesbaar
- Bronvermelding volgens APA-richtlijnen (tekst + bronnenlijst)
- Pagina's genummerd en terug te vinden in de inhoudsopgave
- Bijlagen overzichtelijk genummerd
- Relevant gebruik van afbeeldingen/grafieken/tabellen
- AI-gebruik toegestaan, maar moet vermeld worden in de bronnenlijst (welke tool) + gebruikte prompts als bijlage. Jij blijft zelf verantwoordelijk voor het aantonen van de leeruitkomsten
- Bij herkansing: ingevuld 'Template herkansingsfeedback' toegevoegd

**Inhoudelijke eisen:**
- Project geüpload naar een **publieke** GitHub-repository, link in verantwoordingsdocument
- Gebouwd met JavaScript + React (géén TypeScript), gebruik van React Context (géén Redux)
- Geen gebruik van out-of-the-box stylingsystemen (Bootstrap, Material-UI, Tailwind)
- Broncode zonder `node_modules`-map en `.idea`-map ingeleverd
- Wireframes op papier getekend
- Schermontwerpen gemaakt met Figma of Adobe XD
- NOVI API voor authenticatie; voor de rest een API naar keuze
- API key + persoonlijk JSON-configuratiebestand voor de NOVI API aangeleverd
- De applicatie start zonder te crashen

---

## Beoordelingscriteria (wegingen)

| Onderdeel | Weging | Toetst |
|---|---|---|
| **1. Functioneel ontwerp** | **20%** | LU1 (HTML & CSS) |
| — 1.1 Compleet functioneel ontwerp (probleem/oplossing, 4 user stories, 25+ eisen, 4 use case tabellen, 3 inspiratiebronnen) | 15% | |
| — 1.2 Wireframes + schermontwerpen | 5% | |
| **2. Verantwoordingsdocument** | **10%** | LU2, LU3 |
| — 2.1 Min. 5 implementatiekeuzes + reflectie | 5% | |
| — 2.2 Min. 5 limitaties + doorontwikkelingen | 5% | |
| **3. Broncode React** | **65%** | LU1, LU2, LU3 |
| — 3.1 Semantische HTML | 5% | |
| — 3.2 Responsief, gestructureerde CSS/Flexbox | 5% | |
| — 3.3 Schone JS/React-code, clean code | 10% | |
| — 3.4 6 asynchrone functies, error/laadtijd-afhandeling | 5% | |
| — 3.5 4 kernfunctionaliteiten correct geïmplementeerd | 10% | |
| — 3.6 Min. 6 herbruikbare componenten | 10% | |
| — 3.7 State management + React Life Cycles | 10% | |
| — 3.8 Routing (dynamic + private routes) | 5% | |
| — 3.9 Git-gebruik (20+ commits, 5+ pull requests) | 5% | |
| **4. Installatiehandleiding** | **5%** | LU3 |
| — 4.1 Professionele, zelfstandig te volgen handleiding | 5% | |
| **Totaal** | **100%** | |

**Let op:** bij elk criterium geldt een minimale eis. Voldoe je daar niet aan, dan krijg je **0 punten** voor dat hele onderdeel — dus liever iets minder gepolijst maar wel alle verplichte onderdelen aanwezig, dan een mooi ontwerp dat een verplicht onderdeel mist.

Broncode/React weegt verreweg het zwaarst (65%), gevolgd door het functioneel ontwerp (20%).
