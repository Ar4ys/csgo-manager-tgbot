import { logError, logClosing } from "./utils.js"
import { bot } from "./bot.js"

process.on("uncaughtException", async e => {
	await logError(e)
	const isClosed = await bot.close()
	if (isClosed)
		return await logClosing()

	await logError(new Error("Cannot stop bot"))
	await logClosing()
})
