import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sidebar } from "@/components/sidebar/sidebar";
import { IndividualPage } from "@/pages/individual";
import { OverviewPage } from "@/pages/overview";
import { ReportsPage } from "@/pages/reports";
import { BranchOverviewsPage } from "@/pages/branch-overviews";
import { AlpacaVixEquityPage } from "@/pages/alpaca-vix-equity";
import { useParametersStore } from "@/stores/parameters-store";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
		},
	},
});

function AppContent() {
	const { activeTab, setActiveTab } = useParametersStore();

	return (
		<div className="flex h-screen overflow-hidden">
			<Sidebar />

			<main className="flex-1 flex flex-col overflow-hidden">
				<div className="flex-1 overflow-y-auto p-6">
					<Tabs
						value={activeTab}
						onValueChange={(value) =>
							setActiveTab(
								value as
									| "individual"
									| "overview"
									| "reports"
									| "branches"
									| "alpaca-vix-equity",
							)
						}
					>
						<TabsList className="mb-3">
							<TabsTrigger value="individual">Individual Analysis</TabsTrigger>
							<TabsTrigger value="overview">Overall Results</TabsTrigger>
							<TabsTrigger value="reports">Detailed Reports</TabsTrigger>
							<TabsTrigger value="branches">Branch Overviews</TabsTrigger>
							<TabsTrigger value="alpaca-vix-equity">Equity Slope</TabsTrigger>
						</TabsList>

						<TabsContent value="individual" className="mt-0">
							<IndividualPage />
						</TabsContent>

						<TabsContent value="overview" className="mt-0">
							<OverviewPage />
						</TabsContent>

						<TabsContent value="reports" className="mt-0">
							<ReportsPage />
						</TabsContent>

						<TabsContent value="branches" className="mt-0">
							<BranchOverviewsPage />
						</TabsContent>

						<TabsContent value="alpaca-vix-equity" className="mt-0">
							<AlpacaVixEquityPage />
						</TabsContent>
					</Tabs>
				</div>
			</main>
		</div>
	);
}

function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<AppContent />
		</QueryClientProvider>
	);
}

export default App;
