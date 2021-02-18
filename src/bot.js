import TelegramBot from "node-telegram-bot-api"
import { uuidRegex, error, generateAuthCode } from "./utils.js"
import { db } from "./db.js"
import locals from "./i18n.js"
import { v4 as uuid } from 'uuid'

const token = process.env.TOKEN
const bot = new TelegramBot(token)

const langCommandRegex = /^\/lang (..)*/

bot.startPolling()
	.then(logBotStarted)
	.catch(logError)


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
				error(err)
				bot.sendMessage(chat.id, "Oops, smth got wrong, try a bit later")
			})
	} else if (langCommandRegex.test(text)) {
		let [ , lang ] = text.match(langCommandRegex)
		const languages = ["en", "ru"]
		if (!lang || !languages.include(lang.toLowerCase()))
			return bot.sendMessage(
				chat.id,
				"/lang [lang]- change language\n"
				+ "Avaliable languages: en, ru\n"
				+ "WARNING: This bot is not fully translated (main language - en)"
			)
		lang = lang.toLowerCase()
		db.update({ tgId: from.id }, { $set: { local: lang }})
			.then(() => bot.sendMessage(`Language has been changed to ${lang}`))
			.catch(err => {
				error(err)
				bot.sendMessage(chat.id, "Can't change language, smth has broken 0_o")
			})
	}
})

async function startCommand({ chat, from }) {
	return await createUser(from.id)
		.then(() => login(from.id))
		.then(code => helloMsg(chat.id, code))
		.catch(error)
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

			const { authCode } = user
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

export bot

export async function sendMessage(token, type) {
	return db.find({
			token,
			tgId: { $exists: true }
		}).then(user => {
			if (!user)
				throw new Error({ code: 1, reason: "User is not logined" })

			const { local, tgId } = user
			const msg = locals[local][type]

			if (!msg)
				throw new Error({ code: 2, reason: "Incorrect message type" })

			return bot.sendMessage(tgId, msg)
		})
}
