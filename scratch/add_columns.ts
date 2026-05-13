import { Database } from 'bun:sqlite'
const db = new Database('sqlite.db')
db.run('ALTER TABLE users ADD COLUMN address TEXT')
db.run('ALTER TABLE users ADD COLUMN contact TEXT')
db.run('ALTER TABLE users ADD COLUMN profile_complete INTEGER DEFAULT 0')
console.log('Columns added successfully')
db.close()
