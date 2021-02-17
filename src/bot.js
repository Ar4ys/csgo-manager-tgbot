import TelegramBot from "node-telegram-bot-api"
import { uuidRegex, error } from "./utils.js"
import { db } from "./db.js"
import locals from "./i18n.js"

const token = process.env.TOKEN
const bot = new TelegramBot(token)

const langCommandRegex = /^\/lang (..)*/

bot.startPolling()
	.then(logBotStarted)
	.catch(logError)


bot.on("text", async msg => {
	const { text, chat, from } = msg
	
	if (/^\/start$/.test(text)) {
		return bot.sendMessage(chat.id, "To start - send me token from pinger app")
	} else if (uuidRegex.test(text)) {
		db.find({ id: from.id }, async (err, user) => {
			if (err)
				throw err

			if (!user)
				await login(text, from.id)
					.then(() => {
						bot.sendMessage(
							chat.id,
							"You are successfuly logined. If you want to change language "
							+ "use command `/lang [lang]`\n"
							+ "Avaliable languages: en, ru"
						)
					}).catch(({ code, reason }) => {
						error(reason)
						if (code === 0)
							bot.sendMessage(chat.id, "Oops, smth got wrong, try a bit later")
						if (code === 3)
							bot.sendMessage(chat.id, reason)
					})
		})
	} else if (langCommandRegex.test(text)) {
		const [ , lang ] = text.match(langCommandRegex)
		const languages = ["en", "ru"]
		if (!lang || !languages.include(lang))
			bot.sendMessage(
				chat.id,
				"/lang [lang]- change language\n"
				+ "Avaliable languages: en, ru"
			)

		bot.update({ id: from.id }, { $set: { local: lang }})
	}
})

function login(token, id) {
	return new Promise((res, rej) => {
		db.update({
			token,
			id: { $exists: false }
		}, { $set: { id } }, (err, updateCount) => {
			if (err)
				rej({ code: 0, reason: err })
			if (updateCount === 0)
				rej({ code: 3, reason: "Token is invalid or already used" })

			res()
		})
	})
}

export bot

export async function sendMessage(token, type) {
	return new Promise((res, rej) => {
		db.find({
			token,
			id: { $exists: true }
		}, (err, user) => {
			if (err)
				rej( code: 0, reason: err)
			if (user === null || user === undefined)
				rej({ code: 1, reason: "User is not logined" })

			const { local, id } = user
			const msg = locals[local][type]

			if (!msg)
				rej({ code: 2, reason: "Incorrect message type" })

			bot.sendMessage(id, msg)
			res()
		}
	})
}
