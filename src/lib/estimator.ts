import { providers } from "./catalog";
import type { Country, CostLineItem, Estimate, ProviderPricing, WorkloadInput } from "./types";

const HOURS_PER_MONTH = 730;

function positive(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function afterFree(usage: number, allowance = 0) {
  return Math.max(0, usage - allowance);
}

function addLine(
  lines: CostLineItem[],
  label: string,
  monthlyUsd: number,
  detail: string,
) {
  if (monthlyUsd > 0.0001) {
    lines.push({ label, monthlyUsd, detail });
  }
}

function estimateProvider(
  provider: ProviderPricing,
  input: WorkloadInput,
  country: Country,
): Estimate {
  const compatible = provider.models.includes(input.model);
  const lines: CostLineItem[] = [];
  const warnings: string[] = [];
  const requestMillions = positive(input.monthlyRequests) / 1_000_000;
  const availabilityMultiplier = input.highAvailability ? 1.5 : 1;

  let vcpuHours: number;
  let memoryGbHours: number;
  if (input.model === "serverless" || input.model === "static") {
    const executionHours =
      positive(input.monthlyRequests) * positive(input.averageDurationMs) / 3_600_000;
    vcpuHours = executionHours * positive(input.vcpu);
    memoryGbHours = executionHours * positive(input.memoryGb);
  } else {
    const runningHours = Math.min(HOURS_PER_MONTH, positive(input.activeHours));
    vcpuHours =
      positive(input.vcpu) * Math.max(1, positive(input.instances)) *
      runningHours * availabilityMultiplier;
    memoryGbHours =
      positive(input.memoryGb) * Math.max(1, positive(input.instances)) *
      runningHours * availabilityMultiplier;
  }

  const billableRequests = afterFree(requestMillions, provider.free.requestMillions);
  const billableVcpu = afterFree(vcpuHours, provider.free.vcpuHours);
  const billableMemory = afterFree(memoryGbHours, provider.free.memoryGbHours);
  const billableStorage = afterFree(positive(input.storageGb), provider.free.storageGb);
  const billableEgress = afterFree(positive(input.egressGb), provider.free.egressGb);

  addLine(
    lines,
    "Requests",
    billableRequests * provider.pricing.requestMillion,
    `${billableRequests.toLocaleString(undefined, { maximumFractionDigits: 2 })}M billable requests`,
  );
  addLine(
    lines,
    "Application CPU",
    billableVcpu * provider.pricing.vcpuHour,
    `${Math.round(billableVcpu).toLocaleString()} vCPU-hours after free allowance`,
  );
  addLine(
    lines,
    "Application memory",
    billableMemory * provider.pricing.memoryGbHour,
    `${Math.round(billableMemory).toLocaleString()} GB-hours after free allowance`,
  );
  addLine(
    lines,
    "Storage",
    billableStorage * provider.pricing.storageGbMonth,
    `${Math.round(billableStorage).toLocaleString()} GB-month`,
  );
  addLine(
    lines,
    "Internet egress",
    billableEgress * provider.pricing.egressGb,
    `${Math.round(billableEgress).toLocaleString()} GB delivered`,
  );

  if (input.databaseHours > 0 && input.databaseVcpu > 0) {
    if (
      provider.pricing.databaseVcpuHour === 0 &&
      provider.pricing.databaseMemoryGbHour === 0
    ) {
      warnings.push("Database cost is not included; this provider requires an external database.");
    } else {
      const dbMultiplier = input.highAvailability ? 2 : 1;
      const dbHours = Math.min(HOURS_PER_MONTH, positive(input.databaseHours));
      addLine(
        lines,
        "Managed database",
        provider.pricing.databaseBaseMonthly +
          positive(input.databaseVcpu) * dbHours * dbMultiplier *
            provider.pricing.databaseVcpuHour +
          positive(input.databaseMemoryGb) * dbHours * dbMultiplier *
            provider.pricing.databaseMemoryGbHour +
          positive(input.databaseStorageGb) * provider.pricing.databaseStorageGbMonth,
        `${input.databaseVcpu} vCPU, ${input.databaseMemoryGb} GB RAM, ${input.databaseStorageGb} GB storage${input.highAvailability ? ", HA pair" : ""}`,
      );
    }
  }

  if (input.gpuHours > 0) {
    if (provider.pricing.gpuHour === null) {
      warnings.push("No comparable GPU product is included for this provider.");
    } else {
      addLine(
        lines,
        "GPU",
        positive(input.gpuHours) * provider.pricing.gpuHour,
        `${Math.round(input.gpuHours)} normalized accelerator-hours`,
      );
    }
  }

  const meteredTotal = lines.reduce((sum, line) => sum + line.monthlyUsd, 0);
  addLine(
    lines,
    "Platform minimum",
    Math.max(0, provider.pricing.baseMonthly - meteredTotal),
    provider.pricing.baseMonthly
      ? `$${provider.pricing.baseMonthly} monthly minimum or plan fee`
      : "No platform minimum",
  );

  if (!compatible) {
    warnings.unshift(`${provider.name} does not directly support the selected ${input.model} model.`);
  }
  if (input.highAvailability) {
    warnings.push("High availability is modeled with extra application capacity and a two-node database.");
  }
  warnings.push(provider.caveat);

  const totalUsd = lines.reduce((sum, line) => sum + line.monthlyUsd, 0);
  const lowConfidence =
    provider.id === "cloudflare" ||
    (input.gpuHours > 0 && provider.pricing.gpuHour === null) ||
    warnings.some((warning) => warning.includes("not included"));

  return {
    provider,
    compatible,
    totalUsd,
    lineItems: lines,
    region: provider.regions[country.code] ?? country.recommendedRegion,
    confidence: lowConfidence ? "low" : compatible ? "medium" : "low",
    warnings,
  };
}

export function estimateAll(input: WorkloadInput, country: Country): Estimate[] {
  return providers
    .map((provider) => estimateProvider(provider, input, country))
    .sort((left, right) => {
      if (left.compatible !== right.compatible) return left.compatible ? -1 : 1;
      return left.totalUsd - right.totalUsd;
    });
}

export function formatCurrency(usd: number, country: Country) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: country.currency,
    maximumFractionDigits: country.currency === "JPY" ? 0 : 2,
  }).format(usd * country.usdRate);
}

export function monthlyComputeSummary(input: WorkloadInput) {
  if (input.model === "serverless" || input.model === "static") {
    const hours = input.monthlyRequests * input.averageDurationMs / 3_600_000;
    return `${Math.round(hours * input.vcpu).toLocaleString()} vCPU-hours from request duration`;
  }
  return `${Math.round(
    input.vcpu * input.instances * Math.min(HOURS_PER_MONTH, input.activeHours),
  ).toLocaleString()} provisioned vCPU-hours`;
}
