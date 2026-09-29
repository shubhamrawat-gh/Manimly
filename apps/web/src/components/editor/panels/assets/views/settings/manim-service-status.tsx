"use client";

import { useEffect, useState, useCallback } from "react";
import {
	Section,
	SectionHeader,
	SectionTitle,
	SectionContent,
} from "@/components/section";
import { Button } from "@/components/ui/button";
import { manimServiceClient } from "@/services/manim";
import { RefreshIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function ManimServiceStatusSection() {
	const [status, setStatus] = useState<"connected" | "not found" | "checking">("checking");
	const [lastChecked, setLastChecked] = useState<Date | null>(null);

	const pingService = useCallback(async () => {
		setStatus("checking");
		try {
			const isAlive = await manimServiceClient.checkHealth();
			setStatus(isAlive ? "connected" : "not found");
		} catch {
			setStatus("not found");
		} finally {
			setLastChecked(new Date());
		}
	}, []);

	useEffect(() => {
		pingService();
		const interval = setInterval(pingService, 10000);
		return () => clearInterval(interval);
	}, [pingService]);

	return (
		<Section showTopBorder={false}>
			<SectionHeader className="justify-between items-center">
				<SectionTitle className="flex-1">Manim Service</SectionTitle>
				<Button
					variant="ghost"
					size="icon"
					className="size-6 p-0 hover:bg-accent"
					onClick={pingService}
					title="Refresh connection status"
					aria-label="Refresh connection status"
				>
					<HugeiconsIcon
						icon={RefreshIcon}
						className={`size-3.5 ${status === "checking" ? "animate-spin" : ""}`}
					/>
				</Button>
			</SectionHeader>
			<SectionContent className="px-2 pb-2 flex flex-col gap-2">
				<div className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/40 border">
					<div className="flex items-center gap-2">
						<span
							className={`inline-block size-2 rounded-full ${
								status === "connected"
									? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
									: status === "checking"
										? "bg-amber-500 animate-pulse"
										: "bg-rose-500"
							}`}
						/>
						<span className="font-medium text-foreground">
							Manim render service:{" "}
							<span
								className={
									status === "connected"
										? "text-emerald-500 font-semibold"
										: status === "checking"
											? "text-amber-500"
											: "text-muted-foreground"
								}
							>
								{status === "connected" ? "connected" : "not found"}
							</span>
						</span>
					</div>
				</div>
				<div className="flex justify-between items-center text-[11px] text-muted-foreground px-1">
					<span>Endpoint: {manimServiceClient.getBaseUrl()}</span>
					{lastChecked && (
						<span>
							Checked: {lastChecked.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
						</span>
					)}
				</div>
			</SectionContent>
		</Section>
	);
}
