import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is required');
	process.exit(1);
}

const sql = `
CREATE TABLE IF NOT EXISTS facebook_data_deletion_request (
  id varchar(36) NOT NULL,
  confirmation_code varchar(64) NOT NULL,
  facebook_user_id varchar(255) NOT NULL,
  chesshub_user_id varchar(36),
  status enum('received','completed','not_found','failed') NOT NULL DEFAULT 'received',
  details text,
  created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  completed_at timestamp(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY facebook_data_deletion_request_confirmation_code_unique (confirmation_code),
  KEY facebook_deletion_code_idx (confirmation_code),
  KEY facebook_deletion_fb_user_idx (facebook_user_id)
)`;

const connection = await mysql.createConnection(url);
await connection.query(sql);
await connection.end();
console.log('facebook_data_deletion_request ready');
