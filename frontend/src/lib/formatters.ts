import numeral from "numeral";
import { format } from "date-fns";

export function formatPercent(value: number, decimals = 2): string {
	return numeral(value).format(`0,0.${"0".repeat(decimals)}`) + "%";
}

export function formatNumber(value: number, decimals = 2): string {
	return numeral(value).format(`0,0.${"0".repeat(decimals)}`);
}

export function formatCurrency(value: number): string {
	return numeral(value).format("$0,0.00");
}

export function formatDate(date: string | Date): string {
	const d = typeof date === "string" ? new Date(date) : date;
	return format(d, "MMM d, yyyy");
}

export function formatShortDate(date: string | Date): string {
	const d = typeof date === "string" ? new Date(date) : date;
	return format(d, "MM/dd/yy");
}

export function getReturnColor(value: number): string {
	if (value > 0) return "text-green-600 dark:text-green-400";
	if (value < 0) return "text-red-600 dark:text-red-400";
	return "text-muted-foreground";
}

export function getReturnBgColor(value: number): string {
	if (value > 0) return "bg-green-100 dark:bg-green-900/30";
	if (value < 0) return "bg-red-100 dark:bg-red-900/30";
	return "bg-muted";
}
