import type { User, Session } from 'better-auth';

declare global {
	namespace App {
		interface Locals {
			user?: User & { role?: string; username?: string | null };
			session?: Session;
		}
	}

	interface Window {
		google?: {
			accounts: {
				id: {
					initialize: (config: Record<string, unknown>) => void;
					renderButton: (parent: HTMLElement, config: Record<string, unknown>) => void;
				};
			};
			// Loaded dynamically; shape is validated at runtime in google-maps.js
			maps?: any;
		};
		__chesshubGoogleMapsReady?: () => void;
	}
}

export {};
