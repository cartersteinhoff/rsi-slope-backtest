import { Moon, Sun, Monitor } from "lucide-react";
import { useEffect } from "react";
import { useParametersStore, getResolvedTheme } from "@/stores/parameters-store";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

type Theme = "light" | "dark" | "system";

export function ThemeToggle() {
	const theme = useParametersStore((state) => state.theme);
	const setTheme = useParametersStore((state) => state.setTheme);

	// Apply theme to document
	useEffect(() => {
		const resolved = getResolvedTheme(theme);
		const root = document.documentElement;
		if (resolved === "dark") {
			root.classList.add("dark");
		} else {
			root.classList.remove("dark");
		}
	}, [theme]);

	// Listen for system theme changes when in "system" mode
	useEffect(() => {
		if (theme !== "system") return;

		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const handleChange = () => {
			const root = document.documentElement;
			if (mediaQuery.matches) {
				root.classList.add("dark");
			} else {
				root.classList.remove("dark");
			}
		};

		mediaQuery.addEventListener("change", handleChange);
		return () => mediaQuery.removeEventListener("change", handleChange);
	}, [theme]);

	return (
		<Select value={theme} onValueChange={(value: Theme) => setTheme(value)}>
			<SelectTrigger size="sm" className="w-[130px]">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="light">
					<Sun className="h-4 w-4" />
					Light
				</SelectItem>
				<SelectItem value="dark">
					<Moon className="h-4 w-4" />
					Dark
				</SelectItem>
				<SelectItem value="system">
					<Monitor className="h-4 w-4" />
					System
				</SelectItem>
			</SelectContent>
		</Select>
	);
}
