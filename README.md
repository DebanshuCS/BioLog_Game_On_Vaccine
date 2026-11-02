# 🧬 ViroQuest — Virology, Host–Virus Interaction & Vaccine Design

**ViroQuest** is a self-contained, **100% offline** interactive educational game built for **College Open Day** outreach. Specifically calibrated for **Class 12 high school students and 1st-year college freshmen**, it transforms core concepts from virology, molecular cloning, and modern vaccine engineering into tactile, GUI-driven gameplay — with zero external libraries, zero internet requirement, and instant one-click launching on any laptop.

---

## 🚀 Quick Launch (For Open Day Volunteers — Takes 5 Seconds!)

No internet connection is needed at any point. Choose **any** of the options below:

### Option A — Instant Double-Click (Simplest!)
- **Any OS (Windows / macOS / Linux):** Simply **double-click `index.html`** to open the game directly in Chrome, Edge, Safari, or Firefox!
- **Windows Server Launcher:** Double-click **`start.bat`**.
- **macOS Finder Launcher:** Double-click **`Start_ViroQuest.command`**.

### Option B — Single Terminal Command
```bash
# macOS / Linux
./start.sh

# Or using Python 3 directly (macOS / Linux / Windows)
python3 -m http.server 8000
```
Then open **`http://localhost:8000`** in your browser (or **`http://localhost:8000?demo=true`** to auto-boot into Open Day Exhibition Mode!).

---

## 🎮 The Three Interactive Game Modes

### 1. 🛡️ Mode 1: Cell Defender *(Host–Virus Lock & Key Arcade)*
- **Concept Taught:** Receptor-mediated viral entry (*Spike "Key" ↔ Host Receptor "Lock"*) and how Y-shaped **neutralizing antibodies** block infection before a virus touches the cell membrane.
- **How Visitors Play:** Incoming viruses (**COVID-19**, **Flu**, **HIV-1**, **Ebola**, **Adenovirus**) display distinct Spike shapes (`👑`, `⭐`, `🟦`, `🔺`, `⬡`). Players fire matching Y-antibodies by:
  - Clicking the **GUI Antibody Launcher Bar** at the bottom of the screen,
  - Clicking the **Receptor Ports** directly on the host cell,
  - Dragging across the canvas, or pressing keys **`1`–`5`**.
- **Pacing:** Starts gently with 2 virus types in Wave 1 and progressively unlocks all 5 real virus–receptor pairs, with a **`🔬 Sci-Notes`** toggle (`S`) for curious students.

### 2. 🧬 Mode 2: Vaccine Maker Studio *(Interactive Biotech Workbench)*
- **Concept Taught:** Reverse vaccinology, outer surface vs. hidden inner viral proteins, recombinant plasmid construction (`Promoter`, `Ori`, `KanR`), bacterial heat-shock transformation, blue-white colony screening, agarose gel electrophoresis, and modern vaccine delivery platforms.
- **5 Hands-On GUI Stations:**
  1. **Pick Target Virus:** COVID-19 (*SARS-CoV-2*), Seasonal Flu (*Influenza A*), HPV-16, or Ebola.
  2. **Visual Antigen Dissector:** Inspect a live cutaway virus diagram and click/drag an **outer surface gene** into the open `EcoRI`/`BamHI` plasmid ring.
  3. **Circular Plasmid Builder:** Snap together a human/RNA **Promoter** (`CMV` / `T7`), high-copy **Origin** (`pUC Ori`), and allergy-safe **Marker** (`KanR`) on a live circular DNA vector map.
  4. **Wet-Lab Cloning Bench:** Click **`🔥 Pulse 42°C Heat-Shock`** to transform *E. coli*, pick **2 glowing White Colonies** on the Petri dish (avoiding Blue empty-vector colonies!), and watch your inserted gene band migrate on a **UV Agarose Gel**!
  5. **Delivery Capsule & Certificate:** Package as **mRNA-LNP**, **Viral Vector**, **Purified Protein + Alum**, or **Hollow VLP Shell**, then view/print an official **Vaccine Design Certificate**!

### 3. 🕵️ Mode 3: Virus Detective *(3D Structure & Virology Matching)*
- **Concept Taught:** 3D capsid architectures (enveloped spherical, bullet helical, naked icosahedral, filamentous, brick complex), real-world transmission routes, DNA/RNA Baltimore tricks (retroviruses, segmented flu RNA, dsRNA), and landmark vaccine breakthroughs.
- **How Visitors Play:** Click or drag glowing SVG laser cables between procedural Canvas virus portraits and their matching clue cards across **4 progressive rounds**, with **`💡 Hints`** and instant bite-sized discovery facts on every match.

---

## 🖥️ Open Day Booth Tips & Shortcuts

| Action | GUI Control | Keyboard Shortcut |
|---|---|---|
| **Open Day Exhibition Mode** *(Larger UI + Top Banner)* | `🖥️ Open Day Mode` button (Top-Right) | `D` *(on Main Menu)* or `?demo=true` |
| **Fullscreen Booth Display** | `⛶ Fullscreen` button (Top-Right) | `F` or `F11` |
| **Mute / Unmute Sound** | `🔊 Sound ON` button (Top-Right) | `M` |
| **Quick Launch Mode 1 / 2 / 3** | Click any Mode Card | `1`, `2`, `3` *(on Main Menu)* |
| **Dedicated Station URL** *(Multi-Laptop Booths)* | `?mode=1`, `?mode=2`, or `?mode=3` | — |
| **Pause Mode 1 / Return to Menu** | `⏸ Pause` / `← Menu` | `P` / `Esc` |
| **Reset Leaderboard for Next Group** | `🏆 Leaderboard → 🗑️ Reset Scores` (or `⚙️ Settings`) | — |

---

## 🔬 Scientific Accuracy & Curriculum Alignment

Designed specifically to bridge **Class 12 Biology / Biotechnology (NCERT)** and **1st-Year Undergraduate Life Sciences**:
- **Receptor Tropism (Mode 1):** Uses authentic human host-cell entry pairs: *SARS-CoV-2 Spike ↔ ACE2*, *Influenza HA ↔ Sialic Acid*, *HIV-1 gp120 ↔ CD4*, *Ebola GP ↔ NPC1*, and *Adenovirus Fiber ↔ CAR*.
- **Recombinant DNA & Vaccine Pipeline (Mode 2):** Accurately distinguishes surface neutralizing targets (`S`, `HA`, `L1`, `GP`) from internal nucleocapsid/matrix proteins (`N`, `M1`, `VP40`), explains why clinical manufacturing favors **Kanamycin (`KanR`)** over penicillin-class Ampicillin (`AmpR`), demonstrates **42°C heat-shock transformation**, **blue-white `lacZ` insertional inactivation**, **UV restriction-digest gel verification**, and matches real licensed vaccines (*Comirnaty/Spikevax*, *Flublok*, *Gardasil-9/Cervavac*, *Ervebo*).
- **Virology & Epidemiology (Mode 3):** Covers lipid-envelope soap sensitivity, naked capsid acid stability (Poliovirus), reverse transcription (HIV-1), 8-segment antigenic reassortment (Influenza A), Smallpox eradication, and recombinant yeast Hepatitis B vaccines.

---

## 🛠️ Project Structure & Extending Content

```text
OpenDayGameDemo/
├── index.html                 # Main application shell & modals
├── start.sh                   # One-command launcher (macOS / Linux)
├── Start_ViroQuest.command    # macOS Finder double-click launcher
├── start.bat / server.ps1     # Windows double-click launcher & HTTP server
├── package_demo.py            # Creates a portable ZIP for USB distribution
├── css/
│   ├── main.css               # Design tokens, modals, leaderboards, demo/contrast modes
│   ├── menu.css               # Main menu cards, quick-control bar & badge strip
│   └── hud.css                # Full-viewport game HUDs & Mode 1/2/3 workbenches
└── js/
    ├── core/                  # utils.js, audio.js, storage.js, particles.js, app.js
    ├── data/                  # Easy-to-edit scientific content files!
    │   ├── viruses.js         # Mode 1 virus–receptor Lock & Key pairs
    │   ├── vaccines.js        # Mode 2 target viruses, antigens, plasmid parts & capsules
    │   └── taxonomy.js        # Mode 3 detective rounds & procedural Canvas virus art
    └── modes/                 # mode1-arcade.js, mode2-lab.js, mode3-matching.js
```

- **Add a Virus to Mode 1:** Append an object to `VIRUS_RECEPTOR_PAIRS` in `js/data/viruses.js`.
- **Add a Target Virus to Mode 2:** Append an entry to `TARGET_VIRUSES` in `js/data/vaccines.js`.
- **Add a Detective Round to Mode 3:** Append a round object to `MATCHING_ROUNDS` in `js/data/taxonomy.js`.
- **Package a Clean ZIP for Another Laptop:** Run `python3 package_demo.py`.

---

## 🩺 Troubleshooting

- **No Sound?** Browsers unlock Web Audio on your first mouse click or keypress. Check the `🔊 Sound ON` pill at the top-right (or press `M`).
- **Screen Looks Slightly Cropped on a Small Projector?** Press `F` (or `F11`) for Fullscreen and reset browser zoom to `100%` (`Cmd+0` / `Ctrl+0`). ViroQuest automatically adapts from `1920×1080` down to `1366×768`.
- **Port 8000 Busy?** `start.sh` and `server.ps1` automatically switch to a backup port (`8088` / `8080`), or you can simply open `index.html` directly!
