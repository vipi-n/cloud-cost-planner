export type DeploymentModel = "serverless" | "container" | "virtual-machine" | "static";

export type WorkloadId =
  | "static-site"
  | "api"
  | "saas"
  | "ecommerce"
  | "media-worker"
  | "ai-inference";

export type CurrencyCode =
  | "USD"
  | "INR"
  | "GBP"
  | "EUR"
  | "CAD"
  | "AUD"
  | "SGD"
  | "JPY"
  | "BRL"
  | "AED";

export interface Country {
  code: string;
  name: string;
  currency: CurrencyCode;
  usdRate: number;
  recommendedRegion: string;
}

export interface WorkloadInput {
  workload: WorkloadId;
  model: DeploymentModel;
  monthlyRequests: number;
  averageDurationMs: number;
  vcpu: number;
  memoryGb: number;
  instances: number;
  activeHours: number;
  storageGb: number;
  egressGb: number;
  databaseVcpu: number;
  databaseMemoryGb: number;
  databaseStorageGb: number;
  databaseHours: number;
  gpuHours: number;
  highAvailability: boolean;
}

export interface WorkloadPreset {
  id: WorkloadId;
  name: string;
  shortDescription: string;
  guidance: string;
  defaults: WorkloadInput;
}

export interface FreeAllowance {
  requestMillions?: number;
  vcpuHours?: number;
  memoryGbHours?: number;
  storageGb?: number;
  egressGb?: number;
}

export interface ProviderPricing {
  id: string;
  name: string;
  shortName: string;
  description: string;
  models: DeploymentModel[];
  regions: Record<string, string>;
  pricing: {
    baseMonthly: number;
    requestMillion: number;
    vcpuHour: number;
    memoryGbHour: number;
    storageGbMonth: number;
    egressGb: number;
    databaseVcpuHour: number;
    databaseMemoryGbHour: number;
    databaseStorageGbMonth: number;
    databaseBaseMonthly: number;
    gpuHour: number | null;
  };
  free: FreeAllowance;
  sourceUrl: string;
  sourceLabel: string;
  sourceKind: "official-api" | "official-page";
  ingestionCadence: "daily" | "weekly";
  updatedAt: string;
  operationalScore: 1 | 2 | 3 | 4 | 5;
  caveat: string;
}

export interface CostLineItem {
  label: string;
  monthlyUsd: number;
  detail: string;
}

export interface Estimate {
  provider: ProviderPricing;
  compatible: boolean;
  totalUsd: number;
  lineItems: CostLineItem[];
  region: string;
  confidence: "high" | "medium" | "low";
  warnings: string[];
}
