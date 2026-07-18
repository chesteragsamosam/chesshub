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
		};
		FB?: {
			init: (config: Record<string, unknown>) => void;
			XFBML: { parse: (element?: HTMLElement) => void };
			login: (...args: unknown[]) => void;
		};
		fbAsyncInit?: () => void;
		__chesshubOnFbLogin?:
			| ((response: { authResponse?: { accessToken?: string } | null }) => void | Promise<void>)
			| undefined;
	}
}

export {};
