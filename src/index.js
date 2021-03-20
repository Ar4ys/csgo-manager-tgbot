import { logError, logClosing } from "./utils.js"
import "./bot.js"
import "./http.js"

process.on("SIGTERM", async () => await logClosing())
process.on("SIGINT", async () => await logClosing())
process.on("uncaughtException", async err => {
	await logError(err)
	await logClosing(err)
})
