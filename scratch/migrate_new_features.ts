import { Database } from 'bun:sqlite';

const sqlite = new Database('sqlite.db');

try {
    sqlite.run("ALTER TABLE prompts ADD COLUMN tags TEXT");
    console.log("Added tags column");
} catch (e) {}

try {
    sqlite.run("ALTER TABLE prompts ADD COLUMN folder_id INTEGER");
    console.log("Added folder_id column");
} catch (e) {}

try {
    sqlite.run("ALTER TABLE prompts ADD COLUMN suggested_palette TEXT");
    console.log("Added suggested_palette column");
} catch (e) {}

try {
    sqlite.run("ALTER TABLE prompts ADD COLUMN suggested_icons TEXT");
    console.log("Added suggested_icons column");
} catch (e) {}

sqlite.run(`
    CREATE TABLE IF NOT EXISTS folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
`);
console.log("Created folders table");

sqlite.close();
