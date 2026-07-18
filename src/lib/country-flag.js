/**
 * Country / FIDE federation → flag emoji helpers.
 * Profile countries use ISO 3166-1 alpha-2; FIDE uses 3-letter federation codes.
 */

/** Common FIDE/IOC federation codes → ISO 3166-1 alpha-2 */
const FIDE_TO_ISO = {
	AFG: 'AF',
	ALB: 'AL',
	ALG: 'DZ',
	AND: 'AD',
	ANG: 'AO',
	ARG: 'AR',
	ARM: 'AM',
	AUS: 'AU',
	AUT: 'AT',
	AZE: 'AZ',
	BAH: 'BS',
	BAN: 'BD',
	BAR: 'BB',
	BEL: 'BE',
	BER: 'BM',
	BIH: 'BA',
	BLR: 'BY',
	BOL: 'BO',
	BOT: 'BW',
	BRA: 'BR',
	BRN: 'BH',
	BRU: 'BN',
	BUL: 'BG',
	CAN: 'CA',
	CHI: 'CL',
	CHN: 'CN',
	COL: 'CO',
	CRC: 'CR',
	CRO: 'HR',
	CUB: 'CU',
	CYP: 'CY',
	CZE: 'CZ',
	DEN: 'DK',
	DOM: 'DO',
	ECU: 'EC',
	EGY: 'EG',
	ENG: 'GB',
	ESA: 'SV',
	ESP: 'ES',
	EST: 'EE',
	ETH: 'ET',
	FAI: 'FO',
	FID: null,
	FIN: 'FI',
	FRA: 'FR',
	GCI: 'GG',
	GEO: 'GE',
	GER: 'DE',
	GHA: 'GH',
	GRE: 'GR',
	GUA: 'GT',
	GUM: 'GU',
	GUY: 'GY',
	HAI: 'HT',
	HKG: 'HK',
	HON: 'HN',
	HUN: 'HU',
	INA: 'ID',
	IND: 'IN',
	IRI: 'IR',
	IRL: 'IE',
	IRQ: 'IQ',
	ISL: 'IS',
	ISR: 'IL',
	ISV: 'VI',
	ITA: 'IT',
	IVB: 'VG',
	JAM: 'JM',
	JCI: 'JE',
	JOR: 'JO',
	JPN: 'JP',
	KAZ: 'KZ',
	KEN: 'KE',
	KGZ: 'KG',
	KOR: 'KR',
	KOS: 'XK',
	KSA: 'SA',
	KUW: 'KW',
	LAO: 'LA',
	LAT: 'LV',
	LBA: 'LY',
	LBN: 'LB',
	LIB: 'LB',
	LIE: 'LI',
	LTU: 'LT',
	LUX: 'LU',
	MAC: 'MO',
	MAD: 'MG',
	MAR: 'MA',
	MAS: 'MY',
	MDA: 'MD',
	MDV: 'MV',
	MEX: 'MX',
	MGL: 'MN',
	MKD: 'MK',
	MLI: 'ML',
	MLT: 'MT',
	MNC: 'MC',
	MNE: 'ME',
	MON: 'MC',
	MOZ: 'MZ',
	MRI: 'MU',
	MTN: 'MR',
	MYA: 'MM',
	NAM: 'NA',
	NCA: 'NI',
	NED: 'NL',
	NEP: 'NP',
	NGR: 'NG',
	NIG: 'NE',
	NOR: 'NO',
	NZL: 'NZ',
	OMA: 'OM',
	PAK: 'PK',
	PAN: 'PA',
	PAR: 'PY',
	PER: 'PE',
	PHI: 'PH',
	PLE: 'PS',
	PNG: 'PG',
	POL: 'PL',
	POR: 'PT',
	PUR: 'PR',
	QAT: 'QA',
	ROU: 'RO',
	RSA: 'ZA',
	RUS: 'RU',
	RWA: 'RW',
	SCO: 'GB',
	SEN: 'SN',
	SGP: 'SG',
	SKN: 'KN',
	SLO: 'SI',
	SMR: 'SM',
	SOL: 'SB',
	SOM: 'SO',
	SRB: 'RS',
	SRI: 'LK',
	SSD: 'SS',
	SUD: 'SD',
	SUI: 'CH',
	SUR: 'SR',
	SVK: 'SK',
	SWE: 'SE',
	SYR: 'SY',
	TAN: 'TZ',
	THA: 'TH',
	TJK: 'TJ',
	TKM: 'TM',
	TLS: 'TL',
	TOG: 'TG',
	TPE: 'TW',
	TRI: 'TT',
	TUN: 'TN',
	TUR: 'TR',
	UAE: 'AE',
	UGA: 'UG',
	UKR: 'UA',
	URU: 'UY',
	USA: 'US',
	UZB: 'UZ',
	VEN: 'VE',
	VIE: 'VN',
	VIN: 'VC',
	WLS: 'WS',
	YEM: 'YE',
	ZAM: 'ZM',
	ZIM: 'ZW'
};

/**
 * @param {string | null | undefined} iso2
 * @returns {string | null}
 */
export function flagEmojiFromIso(iso2) {
	const code = iso2?.trim().toUpperCase();
	if (!code || code.length !== 2 || !/^[A-Z]{2}$/.test(code)) return null;
	// Kosovo has no regional-indicator pair in Unicode; skip rather than invent one.
	if (code === 'XK') return null;
	return String.fromCodePoint(
		...[...code].map((char) => 0x1f1e6 - 65 + char.charCodeAt(0))
	);
}

/**
 * @param {string | null | undefined} federation
 * @returns {string | null} ISO alpha-2 when known
 */
export function fideFederationToIso(federation) {
	const code = federation?.trim().toUpperCase();
	if (!code) return null;
	if (code.length === 2) return code;
	if (Object.prototype.hasOwnProperty.call(FIDE_TO_ISO, code)) {
		return FIDE_TO_ISO[/** @type {keyof typeof FIDE_TO_ISO} */ (code)];
	}
	return null;
}

/**
 * Flag emoji from a profile ISO country or FIDE federation code.
 * @param {string | null | undefined} countryOrFederation
 * @returns {string | null}
 */
export function countryFlag(countryOrFederation) {
	const raw = countryOrFederation?.trim().toUpperCase();
	if (!raw) return null;
	if (raw.length === 2) return flagEmojiFromIso(raw);
	return flagEmojiFromIso(fideFederationToIso(raw));
}
