import TelegramBot from "node-telegram-bot-api"
import { logError, generateAuthCode, logBotStarted } from "./utils.js"
import { db } from "./db.js"
import * as locals from "./i18n.js"
import uuidImport from "uuid" // CommonJS module, doesnt support named exports

const { v4: uuid } = uuidImport
const token = process.env.TOKEN
export const bot = new TelegramBot(token)

const langCommandRegex = /^\/lang (..)*/

bot.startPolling()
	.then(logBotStarted)
	.catch(async err => {
		await logError(err)
		throw err
	})

bot.on("polling_error", async err => {
	// await bot.stopPolling()
	throw err
})


bot.on("text", async msg => {
	const { text, chat, from } = msg
	
	if (/^\/start$/.test(text))
		return await startCommand(msg)
	else if (/^\/login$/.test(text)) {
		return await login(from.id)
			.then(code => bot.sendMessage(
				chat.id,
				`\`${code}\`\n`
				+ "Enter this code in CSGO Pinger app."
				+ " It will work for 5 minutes"
			)).catch(err => {
				logError(err)
				bot.sendMessage(chat.id, "Oops, smth got wrong, try a bit later")
			})
	} else if (langCommandRegex.test(text)) {
		let [ , lang ] = text.match(langCommandRegex)
		const languages = ["en", "ru"]
		if (!lang || !languages.includes(lang.toLowerCase()))
			return bot.sendMessage(
				chat.id,
				"/lang [lang]- change language\n"
				+ "Avaliable languages: en, ru\n"
				+ "WARNING: This bot is not fully translated (main language - en)"
			)
		lang = lang.toLowerCase()
		db.update({ tgId: from.id }, { $set: { local: lang }})
			.then(() => bot.sendMessage(chat.id, `Language has been changed to ${lang}`))
			.catch(err => {
				logError(err)
				bot.sendMessage(chat.id, "Can't change language, smth has broken 0_o")
			})
	}
})

async function startCommand({ chat, from }) {
	return await createUser(from.id)
		.then(() => login(from.id))
		.then(code => helloMsg(chat.id, code))
		.catch(logError)
}

async function helloMsg(chatId, authCode) {
	return bot.sendMessage(
		chatId,
		"I'm your CSGO manager bot.\n"
		+ "Commands:\n"
		+ "/help - list of all commands\n"
		+ "/login - get auth code\n"
		+ "/lang [en|ru]- change language\n\n"
		+ `Your auth code: \`${authCode}\`\n`
		+ "Enter this code in CSGO Pinger app. It will work for 5 minutes"
	)
}

async function createUser(tgId) {
	return db.insert({
		tgId,
		token: uuid(),
		local: "en",
		authCode: {
			value: null,
			timestamp: null
		}
	})
}

async function login(tgId) {
	return db.find({ tgId })
		.then(async user => {
			if (!user)
				throw new Error({ code: 0, reason: "User is not found in db" })

			const code = generateAuthCode()
			await db.update(
				{ tgId },
				{
					$set: {
						authCode: {
							value: code,
							timestamp: Date.now()
						}
					}
				},
				{}
			)

			return code
		})
}

export async function sendMessage(token, type) {
	return db.findOne({
			token,
			tgId: { $exists: true }
		}).then(user => {
			if (!user) {
				const error = new Error("User is not logined")
				error.code = 1
				throw error
			}


			const { local, tgId } = user
			const msg = locals[local][type]

			if (!msg) {
				const error = new Error("Incorrect message type")
				error.code = 2
				throw error
			}

			return bot.sendMessage(tgId, msg)
		})
}

process.on("uncaughtException", async () => await bot.stopPolling())
process.on("SIGTERM", async () => await bot.stopPolling())
process.on("SIGINT", async () => await bot.stopPolling())
