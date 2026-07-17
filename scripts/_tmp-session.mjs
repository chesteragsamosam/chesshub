import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(
	'mysql://root:mysecretpassword@localhost:3306/local'
);

const [sessions] = await conn.query(
	`SELECT s.token, u.id, u.role, u.email
	 FROM session s
	 JOIN user u ON u.id = s.user_id
	 WHERE s.expires_at > NOW()
	 ORDER BY s.expires_at DESC
	 LIMIT 5`
);
console.log(JSON.stringify(sessions, null, 2));
await conn.end();
