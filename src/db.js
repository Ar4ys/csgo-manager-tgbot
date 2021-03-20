import Datastore from "nedb-promises"
export const db = Datastore.create({ filename: "./db.db", autoload: true })
