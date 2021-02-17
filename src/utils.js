import fs from "fs/promises"
import "colors"

export const uuidRegex = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i

export async function logBotStarted() {
	// console.log("Bot Started".blue)
	log("Bot Started")
}

export async function logClosing() {
	// console.log("Closing...".blue)
	log("Closing...")
}

export async function logError(error) {
	// console.error("[ERROR]".red, "\n", error)
	log(console.error, "[ERROR]", "\n", error)
}

export async function log(type, ...args) {
	let logFunc

	if (typeof type === "function")
		logFunc = type
	else
		args = [type, ...args]

	const msg = args.join(" ")
	const currentTime = new Date().toTimeString().split(" ")[0]
	const logDate = new Date().toISOString().split(".")[0].split("T")[0]
	logFunc(...args)
	await fs.appendFile(
		`./logs/log-${logDate}.txt`,
		`[${currentTime}] ${msg}\n\n`
	)
}
