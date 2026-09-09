"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  siCloudflare,
  siDigitalocean,
  siFlydotio,
  siGooglecloud,
  siHetzner,
  siRailway,
  siRender,
  siVercel,
} from "simple-icons";
import { CATALOG_DATE, countries, providers, workloadPresets } from "@/lib/catalog";
import { estimateAll, formatCurrency, monthlyComputeSummary } from "@/lib/estimator";
import type {
  Country,
  DeploymentModel,
  Estimate,
  WorkloadId,
  WorkloadInput,
} from "@/lib/types";

type PlannerMode = "guided" | "advanced";
type Theme = "light" | "dark";

const providerIcons = {
  gcp: siGooglecloud,
  cloudflare: siCloudflare,
  digitalocean: siDigitalocean,
  vercel: siVercel,
  railway: siRailway,
  render: siRender,
  fly: siFlydotio,
  hetzner: siHetzner,
};

function ProviderLogo({ id, compact = false }: { id: string; compact?: boolean }) {
  if (id === "aws" || id === "azure") {
    return (
      <span className={`provider-logo ${compact ? "compact" : ""}`}>
        <Image
          src={`/providers/${id}.svg`}
          alt=""
          width={compact ? 15 : 22}
          height={compact ? 15 : 22}
        />
      </span>
    );
  }

  const icon = providerIcons[id as keyof typeof providerIcons];
  if (!icon) return null;
  return (
    <span
      className={`provider-logo ${compact ? "compact" : ""}`}
      style={{ color: `#${icon.hex}` }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d={icon.path} />
      </svg>
    </span>
  );
}

function ThemeIcon({ theme }: { theme: Theme }) {
  return theme === "light" ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.64 5.64l1.42 1.42m9.88 9.88 1.42 1.42m0-12.72-1.42 1.42M7.06 16.94l-1.42 1.42" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 15.2A8.3 8.3 0 0 1 8.8 4a8.3 8.3 0 1 0 11.2 11.2Z" />
    </svg>
  );
}

function WorkloadIcon({ id }: { id: WorkloadId }) {
  const paths: Record<WorkloadId, React.ReactNode> = {
    "static-site": <><path d="M4 5h16v14H4z" /><path d="M4 9h16M7 7h.01M10 7h.01" /></>,
    api: <><path d="M8 9 5 12l3 3M16 9l3 3-3 3M14 5l-4 14" /></>,
    saas: <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M3 9h18M8 9v11" /></>,
    ecommerce: <><path d="M5 8h14l-1 11H6L5 8Z" /><path d="M9 9V7a3 3 0 0 1 6 0v2" /></>,
    "media-worker": <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m10 9 5 3-5 3V9Z" /></>,
    "ai-inference": <><path d="M9 3h6v3h3v3h3v6h-3v3h-3v3H9v-3H6v-3H3V9h3V6h3V3Z" /><circle cx="12" cy="12" r="3" /></>,
  };

  return (
    <span className="workload-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24">{paths[id]}</svg>
    </span>
  );
}

const deploymentModels: Array<{
  id: DeploymentModel;
  name: string;
  hint: string;
}> = [
  { id: "serverless", name: "Serverless", hint: "Pay around request execution" },
  { id: "container", name: "Containers", hint: "Always-on or queued services" },
  { id: "virtual-machine", name: "Virtual machines", hint: "Maximum runtime control" },
  { id: "static", name: "Static + edge", hint: "Pages, assets, and light APIs" },
];

function NumberField({
  label,
  hint,
  value,
  min = 0,
  max = 10_000,
  step = 1,
  placeholder,
  scale = "linear",
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  scale?: "linear" | "log";
  onChange: (value: number) => void;
}) {
  const safeMin = scale === "log" ? Math.max(1, min) : min;
  const sliderValue = scale === "log"
    ? (Math.log10(Math.max(safeMin, value)) - Math.log10(safeMin)) /
      (Math.log10(max) - Math.log10(safeMin)) * 1000
    : value;
  const progress = scale === "log"
    ? sliderValue / 10
    : (value - min) / (max - min) * 100;

  function updateFromSlider(raw: number) {
    if (scale === "log") {
      const exponent = Math.log10(safeMin) +
        raw / 1000 * (Math.log10(max) - Math.log10(safeMin));
      const next = Math.pow(10, exponent);
      onChange(Math.round(next / step) * step);
      return;
    }
    onChange(raw);
  }

  return (
    <div className="field">
      <div className="field-topline">
        <span className="field-label">{label}</span>
        <span className="field-value">{value.toLocaleString()}</span>
      </div>
      <input
        className="range-input"
        type="range"
        min={scale === "log" ? 0 : min}
        max={scale === "log" ? 1000 : max}
        step={scale === "log" ? 1 : step}
        value={sliderValue}
        style={{
          background: `linear-gradient(90deg, var(--primary) 0%, var(--primary) ${Math.max(0, Math.min(100, progress))}%, rgba(24, 50, 75, 0.12) ${Math.max(0, Math.min(100, progress))}%, rgba(24, 50, 75, 0.12) 100%)`,
        }}
        onChange={(event) => updateFromSlider(Number(event.target.value))}
        aria-label={`${label} slider`}
      />
      <div className="field-footer">
        <span className="field-hint">
          {hint || `Range ${min.toLocaleString()}–${max.toLocaleString()}`}
          {placeholder ? ` · ${placeholder}` : ""}
        </span>
        <input
        className="number-input"
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(Math.min(max, Math.max(min, Number(event.target.value) || 0)))
        }
        aria-label={`Exact ${label}`}
      />
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <label className="toggle-row">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle-control" aria-hidden="true"><i /></span>
    </label>
  );
}

function CostBar({ estimate, maximum }: { estimate: Estimate; maximum: number }) {
  const width = maximum > 0 ? Math.max(3, estimate.totalUsd / maximum * 100) : 3;
  return (
    <div className="cost-track" aria-hidden="true">
      <span style={{ width: `${Math.min(100, width)}%` }} />
    </div>
  );
}

function CostChart({
  estimates,
  country,
}: {
  estimates: Estimate[];
  country: Country;
}) {
  const compatible = estimates.filter((estimate) => estimate.compatible);
  const maximum = Math.max(...compatible.map((estimate) => estimate.totalUsd), 1);

  function compactCurrency(usd: number) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: country.currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(usd * country.usdRate);
  }

  return (
    <section className="cost-chart" aria-label="Monthly provider cost comparison">
      <div className="chart-heading">
        <div>
          <span>Live comparison</span>
          <h3>Estimated monthly cost</h3>
        </div>
        <small>{country.currency} · lower is better</small>
      </div>
      <div className="chart-body">
        <div className="chart-axis" aria-hidden="true">
          <span>{compactCurrency(maximum)}</span>
          <span>{compactCurrency(maximum / 2)}</span>
          <span>{compactCurrency(0)}</span>
        </div>
        <div className="chart-plot">
          <div className="grid-line grid-line-top" />
          <div className="grid-line grid-line-middle" />
          <div className="grid-line grid-line-bottom" />
          <div className="chart-bars">
            {estimates.map((estimate, index) => {
              const height = estimate.compatible
                ? Math.max(4, estimate.totalUsd / maximum * 100)
                : 2;
              return (
                <div
                  className="chart-column"
                  key={estimate.provider.id}
                  aria-label={estimate.compatible
                    ? `${estimate.provider.name}: ${formatCurrency(estimate.totalUsd, country)} per month`
                    : `${estimate.provider.name}: unavailable for this deployment model`}
                >
                  <div className="bar-area">
                    <span className="bar-tooltip">
                      {estimate.compatible
                        ? formatCurrency(estimate.totalUsd, country)
                        : "Not compatible"}
                    </span>
                    <span
                      className={`chart-bar ${index === 0 ? "best" : ""} ${!estimate.compatible ? "unavailable" : ""}`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="chart-label">
                    <ProviderLogo id={estimate.provider.id} compact />
                    <span>{estimate.provider.shortName}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function EstimateCard({
  estimate,
  country,
  maximum,
  rank,
}: {
  estimate: Estimate;
  country: Country;
  maximum: number;
  rank: number;
}) {
  return (
    <details className={`estimate-card ${!estimate.compatible ? "is-incompatible" : ""}`}>
      <summary>
        <div className="rank">{estimate.compatible ? String(rank).padStart(2, "0") : "—"}</div>
        <div className="provider-summary">
          <div className="provider-title">
            <ProviderLogo id={estimate.provider.id} />
            <h3>{estimate.provider.name}</h3>
            {rank === 1 && estimate.compatible && <span className="best-badge">Best value</span>}
          </div>
          <p>{estimate.compatible ? estimate.region : "Not a direct service fit"}</p>
          <CostBar estimate={estimate} maximum={maximum} />
        </div>
        <div className="estimate-total">
          <strong>{formatCurrency(estimate.totalUsd, country)}</strong>
          <span>${estimate.totalUsd.toFixed(2)} USD / month</span>
        </div>
        <span className="expand-mark" aria-hidden="true">+</span>
      </summary>
      <div className="estimate-details">
        <div>
          <h4>Cost breakdown</h4>
          <ul className="line-items">
            {estimate.lineItems.map((line) => (
              <li key={line.label}>
                <span>
                  <strong>{line.label}</strong>
                  <small>{line.detail}</small>
                </span>
                <b>{formatCurrency(line.monthlyUsd, country)}</b>
              </li>
            ))}
          </ul>
        </div>
        <div className="estimate-notes">
          <h4>Fit and assumptions</h4>
          <p>{estimate.provider.description}</p>
          <p className="source-method">
            <strong>
              {estimate.provider.sourceKind === "official-api"
                ? "Official API catalog"
                : "Official-page catalog"}
            </strong>
            {" · "}
            {estimate.provider.ingestionCadence} review
            {" · "}
            observed {estimate.provider.updatedAt}
          </p>
          <ul>
            {estimate.warnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
          <a href={estimate.provider.sourceUrl} target="_blank" rel="noreferrer">
            Check {estimate.provider.sourceLabel} ↗
          </a>
        </div>
      </div>
    </details>
  );
}

export function Planner() {
  const initialPreset = workloadPresets.find((preset) => preset.id === "api")!;
  const [mode, setMode] = useState<PlannerMode>("guided");
  const [countryCode, setCountryCode] = useState("IN");
  const [input, setInput] = useState<WorkloadInput>(initialPreset.defaults);
  const [showIncompatible, setShowIncompatible] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = window.localStorage.getItem("cloudscope-theme");
    const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    const nextTheme: Theme = saved === "dark" || saved === "light" ? saved : preferred;
    document.documentElement.dataset.theme = nextTheme;
    const frame = window.requestAnimationFrame(() => setTheme(nextTheme));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const country = countries.find((item) => item.code === countryCode) ?? countries[0];
  const preset = workloadPresets.find((item) => item.id === input.workload) ?? initialPreset;
  const estimates = useMemo(() => estimateAll(input, country), [input, country]);
  const visibleEstimates = showIncompatible
    ? estimates
    : estimates.filter((estimate) => estimate.compatible);
  const compatibleEstimates = estimates.filter((estimate) => estimate.compatible);
  const maximum = Math.max(...compatibleEstimates.map((estimate) => estimate.totalUsd), 1);
  const best = compatibleEstimates[0];

  function update<K extends keyof WorkloadInput>(key: K, value: WorkloadInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  function selectWorkload(workload: WorkloadId) {
    const next = workloadPresets.find((item) => item.id === workload);
    if (next) setInput({ ...next.defaults });
  }

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("cloudscope-theme", nextTheme);
  }

  return (
    <main>
      <div className="ambient-clouds" aria-hidden="true">
        <span className="ambient-cloud cloud-one" />
        <span className="ambient-cloud cloud-two" />
        <span className="ambient-cloud cloud-three" />
        <span className="ambient-cloud cloud-four" />
      </div>
      <header className="site-header">
        <a className="wordmark" href="#" aria-label="CloudScope home">
          <span className="logo-mark">
            <Image src="/cloudscope-mark.svg" alt="" width={37} height={37} priority />
          </span>
          <span>Cloud<span>Scope</span></span>
        </a>
        <nav className="header-nav" aria-label="Main navigation">
          <a href="#compare">Compare</a>
          <a href="#methodology">Methodology</a>
          <span><i /> Pricing data live</span>
        </nav>
        <div className="header-meta">
          <button
            className="theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            <ThemeIcon theme={theme} />
          </button>
          <label className="country-picker">
            <span>Billing country</span>
            <select
              value={countryCode}
              onChange={(event) => setCountryCode(event.target.value)}
              aria-label="Billing country and currency"
            >
              {countries.map((item) => (
                <option value={item.code} key={item.code}>
                  {item.name} · {item.currency}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow"><span /> Independent cloud intelligence</p>
          <h1>Find the right cloud.<br /><em>Before the bill finds you.</em></h1>
          <p className="hero-copy">
            Model your workload once and compare transparent monthly estimates
            across {providers.length} leading cloud platforms—in your local currency.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#compare">
              Start comparing <span>↓</span>
            </a>
            <div className="hero-trust">
              <strong>Official pricing sources</strong>
              <span>Updated {CATALOG_DATE}</span>
            </div>
          </div>
          <div className="provider-cloud" aria-label={`${providers.length} compared cloud providers`}>
            <span>Comparing</span>
            <div>
              {providers.map((provider) => (
                <ProviderLogo id={provider.id} compact key={provider.id} />
              ))}
            </div>
            <strong>+{providers.length}</strong>
          </div>
        </div>
        <div className="hero-preview" aria-label="Live cost preview">
          <div className="preview-glow" />
          <div className="preview-topbar">
            <span><i /> Live estimate</span>
            <small>{country.currency} / month</small>
          </div>
          <div className="preview-range">
            <span>Modeled range</span>
            <strong>
              {best ? formatCurrency(best.totalUsd, country) : "—"}
              <i> to </i>
              {compatibleEstimates.length
                ? formatCurrency(maximum, country)
                : "—"}
            </strong>
            <small>Across compatible providers</small>
          </div>
          <div className="preview-providers">
            {compatibleEstimates.slice(0, 3).map((estimate, index) => (
              <div key={estimate.provider.id}>
                <span>
                  <ProviderLogo id={estimate.provider.id} compact />
                  <b>{estimate.provider.shortName}</b>
                </span>
                <i><span style={{ width: `${Math.max(16, 100 - index * 22)}%` }} /></i>
                <strong>{formatCurrency(estimate.totalUsd, country)}</strong>
              </div>
            ))}
          </div>
          <div className="preview-footer">
            <span><i /> Region matched</span>
            <span><i /> Free tiers included</span>
          </div>
        </div>
      </section>

      <div className="mode-tabs" id="compare" role="tablist" aria-label="Planner mode">
        <button
          className={mode === "guided" ? "active" : ""}
          onClick={() => setMode("guided")}
          role="tab"
          aria-selected={mode === "guided"}
        >
          <span>01</span>
          <i>
            <strong>Guided planner</strong>
            <small>Start with what you are building</small>
          </i>
        </button>
        <button
          className={mode === "advanced" ? "active" : ""}
          onClick={() => setMode("advanced")}
          role="tab"
          aria-selected={mode === "advanced"}
        >
          <span>02</span>
          <i>
            <strong>Infrastructure model</strong>
            <small>Control every usage assumption</small>
          </i>
        </button>
      </div>

      <section className="planner-shell">
        <aside className="configuration">
          <div className="panel-topbar">
            <div>
              <span className="panel-kicker">Workload designer</span>
              <strong>{mode === "guided" ? "Guided configuration" : "Advanced configuration"}</strong>
            </div>
            <span className="completion"><i /> Live</span>
          </div>
          {mode === "guided" ? (
            <>
              <div className="section-heading">
                <span>Step 1</span>
                <div>
                  <h2>What are you building?</h2>
                  <p>Choose the closest starting point. You can adjust usage next.</p>
                </div>
              </div>
              <div className="workload-grid">
                {workloadPresets.map((item) => (
                  <button
                    key={item.id}
                    className={input.workload === item.id ? "selected" : ""}
                    onClick={() => selectWorkload(item.id)}
                  >
                    <span className="workload-topline">
                      <WorkloadIcon id={item.id} />
                      <i>{String(workloadPresets.indexOf(item) + 1).padStart(2, "0")}</i>
                    </span>
                    <strong>{item.name}</strong>
                    <span>{item.shortDescription}</span>
                    <small>Use this template <b>→</b></small>
                  </button>
                ))}
              </div>

              <div className="guidance-note">
                <span>Suggested setup</span>
                <p>{preset.guidance}</p>
              </div>

              <div className="section-heading compact">
                <span>Step 2</span>
                <div>
                  <h2>Size the workload</h2>
                  <p>Reasonable defaults are filled in. Change what you know.</p>
                </div>
              </div>
              <div className="field-grid">
                <NumberField
                  label="Monthly requests"
                  hint="Page views, API calls, or jobs"
                  value={input.monthlyRequests}
                  step={10000}
                  min={1000}
                  max={100_000_000}
                  placeholder="e.g. 5,000,000"
                  scale="log"
                  onChange={(value) => update("monthlyRequests", value)}
                />
                <NumberField
                  label="Outbound transfer"
                  hint="GB sent to end users each month"
                  value={input.egressGb}
                  max={10_000}
                  step={10}
                  placeholder="e.g. 250 GB"
                  onChange={(value) => update("egressGb", value)}
                />
                <NumberField
                  label="Application storage"
                  hint="Files and objects in GB"
                  value={input.storageGb}
                  max={10_000}
                  step={10}
                  placeholder="e.g. 100 GB"
                  onChange={(value) => update("storageGb", value)}
                />
                <NumberField
                  label="Database size"
                  hint="Managed database storage in GB"
                  value={input.databaseStorageGb}
                  max={5_000}
                  step={10}
                  placeholder="e.g. 50 GB"
                  onChange={(value) => update("databaseStorageGb", value)}
                />
              </div>
              <Toggle
                checked={input.highAvailability}
                onChange={(value) => update("highAvailability", value)}
                label="High availability"
                description="Extra application capacity and a database standby"
              />
            </>
          ) : (
            <>
              <div className="section-heading">
                <span>Model</span>
                <div>
                  <h2>Deployment model</h2>
                  <p>This determines whether compute is request-driven or provisioned.</p>
                </div>
              </div>
              <div className="model-grid">
                {deploymentModels.map((model) => (
                  <button
                    key={model.id}
                    className={input.model === model.id ? "selected" : ""}
                    onClick={() => update("model", model.id)}
                  >
                    <strong>{model.name}</strong>
                    <span>{model.hint}</span>
                  </button>
                ))}
              </div>

              <h3 className="form-group-title">Traffic and execution</h3>
              <div className="field-grid">
                <NumberField label="Monthly requests" value={input.monthlyRequests} min={1000} max={100_000_000} step={10000} scale="log" placeholder="e.g. 5,000,000" onChange={(value) => update("monthlyRequests", value)} />
                <NumberField label="Average duration (ms)" value={input.averageDurationMs} min={10} max={300_000} step={10} scale="log" placeholder="e.g. 250 ms" onChange={(value) => update("averageDurationMs", value)} />
                <NumberField label="vCPU per instance" value={input.vcpu} min={0.25} max={64} step={0.25} placeholder="e.g. 2 vCPU" onChange={(value) => update("vcpu", value)} />
                <NumberField label="Memory per instance (GB)" value={input.memoryGb} min={0.25} max={256} step={0.25} placeholder="e.g. 4 GB" onChange={(value) => update("memoryGb", value)} />
                <NumberField label="Instances" value={input.instances} min={1} max={50} placeholder="e.g. 2" onChange={(value) => update("instances", value)} />
                <NumberField label="Active hours / month" hint="0–730 hours" value={input.activeHours} max={730} placeholder="e.g. 730" onChange={(value) => update("activeHours", value)} />
              </div>

              <h3 className="form-group-title">Storage and network</h3>
              <div className="field-grid">
                <NumberField label="Application storage (GB)" value={input.storageGb} max={10_000} step={10} placeholder="e.g. 100 GB" onChange={(value) => update("storageGb", value)} />
                <NumberField label="Internet egress (GB)" value={input.egressGb} max={20_000} step={10} placeholder="e.g. 500 GB" onChange={(value) => update("egressGb", value)} />
              </div>

              <h3 className="form-group-title">Managed database</h3>
              <div className="field-grid">
                <NumberField label="Database vCPU" value={input.databaseVcpu} max={64} step={0.25} placeholder="e.g. 2 vCPU" onChange={(value) => update("databaseVcpu", value)} />
                <NumberField label="Database memory (GB)" value={input.databaseMemoryGb} max={256} step={0.25} placeholder="e.g. 8 GB" onChange={(value) => update("databaseMemoryGb", value)} />
                <NumberField label="Database storage (GB)" value={input.databaseStorageGb} max={10_000} step={10} placeholder="e.g. 100 GB" onChange={(value) => update("databaseStorageGb", value)} />
                <NumberField label="Database hours" value={input.databaseHours} max={730} placeholder="e.g. 730" onChange={(value) => update("databaseHours", value)} />
              </div>

              <h3 className="form-group-title">Accelerators and reliability</h3>
              <div className="field-grid">
                <NumberField label="GPU hours / month" hint="Normalized accelerator estimate" value={input.gpuHours} max={730} placeholder="e.g. 200" onChange={(value) => update("gpuHours", value)} />
              </div>
              <Toggle
                checked={input.highAvailability}
                onChange={(value) => update("highAvailability", value)}
                label="High availability"
                description="Models redundant app capacity and a database standby"
              />
            </>
          )}
        </aside>

        <section className="results" aria-live="polite">
          <div className="results-sticky">
            <div className="panel-topbar results-topbar">
              <div>
                <span className="panel-kicker">Cost intelligence</span>
                <strong>Provider ranking</strong>
              </div>
              <span className="completion"><i /> Auto-updating</span>
            </div>
            <div className="results-header">
              <div>
                <p className="eyebrow">Monthly planning estimate</p>
                <h2>Best options for this workload</h2>
              </div>
              <label className="show-all">
                <input
                  type="checkbox"
                  checked={showIncompatible}
                  onChange={(event) => setShowIncompatible(event.target.checked)}
                />
                Show incompatible
              </label>
            </div>

            {best && (
              <div className="recommendation">
                <div>
                  <span>Lowest modeled cost</span>
                  <strong>
                    <ProviderLogo id={best.provider.id} />
                    {best.provider.name}
                  </strong>
                  <small>{best.region}</small>
                </div>
                <div>
                  <b>{formatCurrency(best.totalUsd, country)}</b>
                  <span>estimated / month</span>
                </div>
              </div>
            )}

            <CostChart estimates={estimates} country={country} />

            <div className="assumption-strip">
              <span>{input.model.replace("-", " ")}</span>
              <span>{monthlyComputeSummary(input)}</span>
              <span>{input.egressGb.toLocaleString()} GB egress</span>
              <span>{country.currency} display</span>
            </div>

            <div className="estimate-list">
              {visibleEstimates.map((estimate) => (
                <EstimateCard
                  key={estimate.provider.id}
                  estimate={estimate}
                  country={country}
                  maximum={maximum}
                  rank={compatibleEstimates.findIndex((item) => item.provider.id === estimate.provider.id) + 1}
                />
              ))}
            </div>
          </div>
        </section>
      </section>

      <section className="methodology" id="methodology">
        <div>
          <p className="eyebrow">How to read this</p>
          <h2>A planning estimate,<br />not a cloud invoice.</h2>
        </div>
        <div className="method-grid">
          <article>
            <span>01</span>
            <h3>Normalized first</h3>
            <p>Provider SKUs are translated into shared units: vCPU-hours, GB-hours, requests, GB-month, and egress.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Region-aware</h3>
            <p>Your country selects a nearby provider region and display currency. Actual taxes and latency still need validation.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Assumptions exposed</h3>
            <p>Open any provider row to see each line item, free allowance, limitation, source, and pricing assumptions.</p>
          </article>
        </div>
      </section>

      <footer>
        <div className="wordmark">
          <span className="logo-mark"><Image src="/cloudscope-mark.svg" alt="" width={37} height={37} /></span>
          <span>Cloud<span>Scope</span></span>
        </div>
        <p>Catalog snapshot {CATALOG_DATE}. Verify provider quotes before purchasing.</p>
      </footer>
    </main>
  );
}
