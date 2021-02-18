import Datastore from "nedb-promises"
// TODO: fix db path
export const db = Datastore.create({ filename: "../db.db", autoload: true })
