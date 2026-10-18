# 📚 Lekker Lezen! — Lijn 3 Leesspel (Groep 3 / SBO)

Een kindvriendelijke, rustige en vrolijke web-app om woordjes te oefenen volgens de leesmethode **Lijn 3 (Malmberg)**, speciaal ontworpen voor kinderen in groep 3 (SBO) op een **tablet / iPad (touchscreen)** of computer.

## 🎮 De 2 Spelvarianten

### Variant 1: Woord lezen & plaatje kiezen
- **10 rondes**, maximaal **10 punten**.
- Er staat één woord groot in beeld (in het **Andika** schoollettertype, met de echte school-`a` en school-`g`) en **4 plaatjes**.
- Klikt het kind in één keer op het juiste plaatje? Dan krijgt het **1 punt** en gaat het door naar de volgende ronde.
- Klikt het kind op een **fout plaatje**? Dan **vervaagt** dat gekozen plaatje zodat alleen de andere opties overblijven. Er is die ronde dan geen punt meer te verdienen, maar het kind zoekt nog wel het goede plaatje om door te gaan.

### Variant 2: Plaatje kijken & woord maken
- **5 rondes**, met **2 punten per ronde** (maximaal **10 punten**).
- Bij de start van dit spel kun je kiezen uit twee manieren van spelen:
  1. **Letters slepen (10 letters gegeven)**: Het kind sleept (of tikt) de juiste letters in de juiste volgorde naar de vakjes. Optioneel kun je **Lijn 3 klankblokjes** aanzetten zodat tweeletterklanken (`aa`, `ee`, `oo`, `oe`, `ij`, `ui`, `eu`, `ie`, enz.) samen op één blokje staan.
  2. **Zelf typen (geen letters gegeven)**: Het kind typt zelf het woord via het toetsenbord (werkt zowel met het ingebouwde touch-toetsenbord met kleine schoolletters op de iPad/tablet als met een echt toetsenbord).
- **Puntentelling**:
  - In één keer alle letters op de juiste volgorde = **2 punten**.
  - Zit er **1 foutje** in? De goede letters kleuren groen en blijven staan, de foute vakjes worden weer leeg en het kind mag het woord **verbeteren om alsnog 1 punt te scoren** voordat we naar het volgende woord gaan!

---

## 🚀 Online zetten via GitHub Pages

Omdat de app volledig bestaat uit statische bestanden (`index.html`, `style.css`, `words.js`, `app.js`), kun je hem gratis online zetten via **GitHub Pages**:

1. Maak een nieuwe repository aan op [GitHub](https://github.com/new) (bijvoorbeeld `leesspel`).
2. Voeg de bestanden toe en push ze naar GitHub:
   ```bash
   git init
   git add index.html style.css words.js app.js README.md
   git commit -m "Eerste versie van Lekker Lezen (Lijn 3 leesspel)"
   git branch -M main
   git remote add origin https://github.com/<jouw-gebruikersnaam>/leesspel.git
   git push -u origin main
   ```
3. Ga op GitHub naar je repository → **Settings** → **Pages** (in het linkermenu).
4. Kies onder **Build and deployment** bij **Source** voor `Deploy from a branch`, en selecteer de branch `main` en map `/ (root)`. Klik op **Save**.
5. Na ongeveer 1 minuut staat het spel online op:
   `https://<jouw-gebruikersnaam>.github.io/leesspel/`

> **Tip voor op de iPad:** Open de link in Safari op de iPad, tik op het **Deel-icoontje** (vierkantje met pijltje omhoog) en kies **"Zet op beginscherm"**. Dan verschijnt er een eigen app-icoontje op het startscherm van de iPad, zonder adresbalk!
