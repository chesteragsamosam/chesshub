import { describe, expect, it } from 'vitest';
import {
	maskPhilippineMobile,
	normalizePhilippineMobile,
	parseTransferWebhookEvent,
	PaymongoApiError,
	checkoutNoticeForOutcome,
	checkoutOutcomeMarker,
	interpretCheckoutSession,
	readCheckoutOutcomeMarker,
	toPayerFacingMessage,
	verifyWebhookSignature
} from './paymongo';
import { createHmac } from 'node:crypto';

describe('PayMongo prize payout helpers', () => {
	it('normalizes and masks Philippine mobile numbers', () => {
		expect(normalizePhilippineMobile('+63 917 123 4567')).toBe('09171234567');
		expect(normalizePhilippineMobile('0917-123-4567')).toBe('09171234567');
		expect(normalizePhilippineMobile('12345')).toBe(null);
		expect(maskPhilippineMobile('09171234567')).toBe('0917•••4567');
	});

	it('parses successful outward transfer events', () => {
		expect(
			parseTransferWebhookEvent({
				data: {
					type: 'event',
					attributes: {
						type: 'transfer.outward.successful',
						data: {
							id: 'tr_123',
							type: 'transfer',
							attributes: {
								status: 'succeeded',
								reference_number: 'reference-1',
								wallet_transaction_id: 'wallet_tr_123',
								metadata: { claimId: 'claim-1' }
							}
						}
					}
				}
			})
		).toEqual({
			id: 'tr_123',
			walletTransactionId: 'wallet_tr_123',
			status: 'succeeded',
			referenceNumber: 'reference-1',
			failureCode: null,
			failureReason: null,
			claimId: 'claim-1'
		});
	});

	it('parses failed callback payloads without exposing receiver details', () => {
		expect(
			parseTransferWebhookEvent({
				data: {
					id: 'tr_failed',
					attributes: {
						status: 'failed',
						provider_error_code: 'AC01',
						provider_error: 'Invalid account'
					}
				}
			})
		).toMatchObject({
			id: 'tr_failed',
			status: 'failed',
			failureCode: 'AC01',
			failureReason: 'Invalid account'
		});
	});

	it('verifies webhook signatures', () => {
		const payload = '{"data":{"id":"event_1"}}';
		const timestamp = '1720000000';
		const secret = 'webhook-secret';
		const signature = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
		expect(verifyWebhookSignature(payload, `t=${timestamp},te=${signature}`, secret)).toBe(true);
		expect(verifyWebhookSignature(payload, `t=${timestamp},te=invalid`, secret)).toBe(false);
	});
});

describe('toPayerFacingMessage', () => {
	it('maps checkout API errors to plain language', () => {
		expect(
			toPayerFacingMessage(
				new PaymongoApiError({
					status: 400,
					codes: ['payment_method_not_allowed'],
					detail: 'The payment method is not allowed.'
				}),
				'checkout'
			)
		).toMatch(/GCash and QR Ph are not available/i);

		expect(
			toPayerFacingMessage(
				new PaymongoApiError({ status: 503, detail: 'Service Unavailable' }),
				'checkout'
			)
		).toMatch(/could not reach the payment service/i);

		expect(toPayerFacingMessage(new Error('unexpected boom'), 'checkout')).toMatch(
			/could not start your payment/i
		);
		expect(toPayerFacingMessage(new Error('unexpected boom'), 'checkout')).not.toMatch(
			/boom|PayMongo/i
		);
	});

	it('maps payout errors without leaking technical detail', () => {
		expect(
			toPayerFacingMessage(
				new PaymongoApiError({
					status: 400,
					codes: ['AC01'],
					detail: 'Invalid account'
				}),
				'payout'
			)
		).toMatch(/GCash account could not be reached/i);

		expect(
			toPayerFacingMessage(
				new Error('GCash is not available in PayMongo receiving institutions'),
				'payout'
			)
		).toMatch(/temporarily unavailable/i);

		expect(
			toPayerFacingMessage(
				new Error('PayMongo API error (422): insufficient wallet balance'),
				'payout'
			)
		).not.toMatch(/PayMongo|422/i);
	});
});

describe('interpretCheckoutSession', () => {
	it('detects paid, failed, and expired sessions', () => {
		expect(
			interpretCheckoutSession({
				attributes: { payments: [{ id: 'pay_1', attributes: { status: 'paid' } }] }
			})
		).toBe('paid');

		expect(
			interpretCheckoutSession({
				attributes: { status: 'expired', payments: [] }
			})
		).toBe('expired');

		expect(
			interpretCheckoutSession({
				attributes: {
					payment_method_types: ['gcash'],
					payments: [{ id: 'pay_2', attributes: { status: 'failed', source: { type: 'gcash' } } }]
				}
			})
		).toBe('failed');

		expect(
			interpretCheckoutSession({
				attributes: {
					payment_method_types: ['qrph'],
					payments: [
						{
							id: 'pay_3',
							attributes: { status: 'failed', source: { type: 'qrph' }, failed_code: 'CLOSED' }
						}
					]
				}
			})
		).toBe('expired');

		expect(
			interpretCheckoutSession({
				attributes: {
					payment_intent: {
						attributes: {
							status: 'awaiting_payment_method',
							last_payment_error: {
								failed_code: 'CLOSED',
								failed_message: 'Checkout has expired'
							}
						}
					}
				}
			})
		).toBe('expired');
	});
});
describe('checkoutOutcomeMarker', () => {
	it('round-trips failed and expired markers', () => {
		expect(readCheckoutOutcomeMarker(checkoutOutcomeMarker('failed'))).toBe('failed');
		expect(readCheckoutOutcomeMarker(checkoutOutcomeMarker('expired'))).toBe('expired');
		expect(readCheckoutOutcomeMarker('pay_123')).toBe(null);
	});
});

describe('checkoutNoticeForOutcome', () => {
	it('labels failed and expired with next steps', () => {
		const failed = checkoutNoticeForOutcome('failed');
		expect(failed?.title).toMatch(/failed/i);
		expect(failed?.body).toMatch(/try again/i);

		const expired = checkoutNoticeForOutcome('expired');
		expect(expired?.title).toMatch(/expired/i);
		expect(expired?.body).toMatch(/fresh payment|try again|Pay with GCash/i);
	});
});
