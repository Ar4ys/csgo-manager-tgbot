import Datastore from "nedb"

export const db = new Datastore({ filename: "../db.db", autoload: true })
