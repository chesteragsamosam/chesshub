import type { User, Session } from 'better-auth';

declare global {
	namespace App {
		interface Locals {
			user?: User & { role?: string; username?: string | null };
			session?: Session;
		}
	}
}

export {};
