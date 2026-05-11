# ⚡ BESS India Cash Flow Projector

A utility-scale **Battery Energy Storage System (BESS)** financial model built as an interactive React component. Designed specifically for the **Indian IEX (Indian Energy Exchange)** market using FY2026 DAM seasonal price actuals.

!\[React](https://img.shields.io/badge/React-18+-61DAFB?logo=react\&logoColor=white)
!\[Recharts](https://img.shields.io/badge/Recharts-2.x-22B5BF)
!\[License](https://img.shields.io/badge/license-MIT-green)

\---

## 📸 Preview

> Interactive dashboard with live sliders, KPI cards, charts, and year-by-year tables.

\---

## ✨ Features

* **Interactive sliders** — adjust CAPEX, capacity (MWh), DoD, RTE, availability, and more in real time
* **Charge strategy toggle** — Solar surplus vs Off-peak grid charging
* **Capacity augmentation** — configurable year, cell cost, and SoH restoration target
* **LFP nonlinear degradation** — 3-phase SoH decay model scaled by DoD factor
* **KPI cards** — Total CAPEX, augmentation cost, payback year, Year-1 net, min sell price, avg spread
* **Charts**

  * Seasonal IEX price spread (Year 1)
  * SoH degradation curve (10-year)
  * Cumulative cash flow
  * Annual revenue vs costs (stacked bar + net line)
* **Tables**

  * Battery SoH year-on-year
  * Full cost breakdown (Year-by-Year)
  * Monthly detail (Year 1)

\---

## 🚀 Getting Started

### Prerequisites

* Node.js ≥ 18
* React ≥ 18

### Installation

```bash
# Clone the repo
git clone https://github.com/DarshakPatil/bess-india-cashflow.git
cd bess-india-cashflow

# Install dependencies
npm install
```

### Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Use in your own React project

Copy `src/BESSModel.jsx` into your project and import it:

```jsx
import BESSModel from './BESSModel';

function App() {
  return <BESSModel />;
}
```

Install the required peer dependency if you haven't already:

```bash
npm install recharts
```

\---

## ⚙️ Model Assumptions

|Parameter|Value|
|-|-|
|Price data|IEX DAM FY2026 seasonal actuals|
|Solar surplus buy price|Off-peak − ₹0.80/kWh|
|O\&M cost|₹1/kWh/year (scales with effective capacity)|
|Degradation model|LFP nonlinear, 3-phase, DoD-adjusted|
|Augmentation cost|Lost capacity × cell cost (USD/kWh)|
|Cycle rate|1 cycle/day|
|Duration|4-hour LFP|
|FX rate|₹83.5/USD (hardcoded, editable in source)|

> ⚠️ \*\*Disclaimer:\*\* This tool is indicative only and is \*\*not investment advice\*\*.

\---

## 📁 Project Structure

```
bess-india-cashflow/
├── src/
│   └── BESSModel.jsx     # Main component (all logic + UI)
├── package.json
├── vite.config.js
├── .gitignore
└── README.md
```

\---

## 🛠️ Built With

* [React](https://react.dev/) — UI framework
* [Recharts](https://recharts.org/) — Charts and data visualization
* [Vite](https://vitejs.dev/) — Build tool

\---

## 📄 License

MIT © \[DarshakPatil]

