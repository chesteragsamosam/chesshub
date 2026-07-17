import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(
	'mysql://root:mysecretpassword@localhost:3306/local'
);

const [rows] = await conn.query(
	'select id from stripe_connect_account where user_id = ? limit 1',
	['9ce883f9-061e-4744-9e7d-3d80388f347f']
);
console.log('query ok rows=', rows.length);

const [tables] = await conn.query(
	"SHOW TABLES LIKE 'stripe_connect_account'"
);
console.log('table present=', tables.length === 1);

await conn.end();
