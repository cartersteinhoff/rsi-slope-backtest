import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SignalType, BranchOverview } from "@/types";

export type Theme = "light" | "dark" | "system";

// Params that affect overview results
interface OverviewParams {
	slopeWindow: number;
	posThreshold: number;
	negThreshold: number;
	signalType: SignalType;
}

// Progress state for overview loading
interface OverviewProgress {
	current: number;
	total: number;
	branch: string;
	percent: number;
}

// Cached overview results
interface OverviewCache {
	params: OverviewParams | null;
	branches: BranchOverview[] | null;
}

// Overview loading state
interface OverviewLoadingState {
	isLoading: boolean;
	progress: OverviewProgress | null;
	error: string | null;
}

interface ParametersState {
	// Analysis parameters
	slopeWindow: number;
	posThreshold: number;
	negThreshold: number;
	signalType: SignalType;

	// Selection state
	selectedTicker: string;
	selectedBranch: string;
	selectionMode: "ticker" | "all";

	// UI state
	showYearlyBreakdown: boolean;
	activeTab: "individual" | "overview" | "reports" | "branches";
	sidebarCollapsed: boolean;
	sidebarWidth: number;

	// Theme state
	theme: Theme;

	// Chart time range state
	chartTimeRange: string;

	// Cached overview results (not persisted)
	overviewCache: OverviewCache;

	// Overview loading state (not persisted)
	overviewLoading: OverviewLoadingState;

	// Actions
	setSlopeWindow: (value: number) => void;
	setPosThreshold: (value: number) => void;
	setNegThreshold: (value: number) => void;
	setSignalType: (value: SignalType) => void;
	setSelectedTicker: (value: string) => void;
	setSelectedBranch: (value: string) => void;
	setSelectionMode: (value: "ticker" | "all") => void;
	setShowYearlyBreakdown: (value: boolean) => void;
	setActiveTab: (
		value: "individual" | "overview" | "reports" | "branches",
	) => void;
	setSidebarCollapsed: (value: boolean) => void;
	setSidebarWidth: (value: number) => void;
	setTheme: (value: Theme) => void;
	setChartTimeRange: (value: string) => void;
	setOverviewCache: (params: OverviewParams, branches: BranchOverview[]) => void;
	clearOverviewCache: () => void;
	setOverviewLoading: (isLoading: boolean) => void;
	setOverviewProgress: (progress: OverviewProgress | null) => void;
	setOverviewError: (error: string | null) => void;
	resetParameters: () => void;
}

// Default values for easy reset
const defaultParameters = {
	slopeWindow: 15,
	posThreshold: 5.0,
	negThreshold: 0.0,
	signalType: "RSI" as SignalType,
};

export const useParametersStore = create<ParametersState>()(
	persist(
		(set) => ({
			// Default values - Analysis parameters
			...defaultParameters,

			// Selection state
			selectedTicker: "",
			selectedBranch: "",
			selectionMode: "all",

			// UI state
			showYearlyBreakdown: false,
			activeTab: "individual",
			sidebarCollapsed: false,
			sidebarWidth: 260,

			// Theme - defaults to dark
			theme: "dark",

			// Chart state
			chartTimeRange: "ALL",

			// Cached overview results
			overviewCache: { params: null, branches: null },

			// Overview loading state
			overviewLoading: { isLoading: false, progress: null, error: null },

			// Actions
			setSlopeWindow: (value) => set({ slopeWindow: value }),
			setPosThreshold: (value) => set({ posThreshold: value }),
			setNegThreshold: (value) => set({ negThreshold: value }),
			setSignalType: (value) => set({ signalType: value }),
			setSelectedTicker: (value) => set({ selectedTicker: value }),
			setSelectedBranch: (value) => set({ selectedBranch: value }),
			setSelectionMode: (value) => set({ selectionMode: value }),
			setShowYearlyBreakdown: (value) => set({ showYearlyBreakdown: value }),
			setActiveTab: (value) => set({ activeTab: value }),
			setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),
			setSidebarWidth: (value) => set({ sidebarWidth: value }),
			setTheme: (value) => set({ theme: value }),
			setChartTimeRange: (value) => set({ chartTimeRange: value }),
			setOverviewCache: (params, branches) =>
				set({ overviewCache: { params, branches } }),
			clearOverviewCache: () =>
				set({ overviewCache: { params: null, branches: null } }),
			setOverviewLoading: (isLoading) =>
				set((state) => ({ overviewLoading: { ...state.overviewLoading, isLoading } })),
			setOverviewProgress: (progress) =>
				set((state) => ({ overviewLoading: { ...state.overviewLoading, progress } })),
			setOverviewError: (error) =>
				set((state) => ({ overviewLoading: { ...state.overviewLoading, error, isLoading: false } })),
			resetParameters: () => set(defaultParameters),
		}),
		{
			name: "trading-app-state",
			storage: createJSONStorage(() => localStorage),
			// Only persist specific keys (not actions)
			partialize: (state) => ({
				slopeWindow: state.slopeWindow,
				posThreshold: state.posThreshold,
				negThreshold: state.negThreshold,
				signalType: state.signalType,
				selectedTicker: state.selectedTicker,
				selectedBranch: state.selectedBranch,
				selectionMode: state.selectionMode,
				showYearlyBreakdown: state.showYearlyBreakdown,
				activeTab: state.activeTab,
				sidebarCollapsed: state.sidebarCollapsed,
				sidebarWidth: state.sidebarWidth,
				theme: state.theme,
				chartTimeRange: state.chartTimeRange,
			}),
			// Version for migrations if schema changes
			version: 1,
		},
	),
);

// Helper to get resolved theme (handles "system" preference)
export function getResolvedTheme(theme: Theme): "light" | "dark" {
	if (theme === "system") {
		if (typeof window !== "undefined") {
			return window.matchMedia("(prefers-color-scheme: dark)").matches
				? "dark"
				: "light";
		}
		return "light";
	}
	return theme;
}
