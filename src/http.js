import { log, logError } from "./utils.js"
import { db } from "./db.js"
import { sendMessage } from "./bot.js"
import express from "express"

const app = express()
const port = process.env.PORT ?? 6860

app.use(express.json())

app.get("/token/:code", (req, res) => {
	const authCode = Number(req.params.code)
	if (isNaN(authCode) || authCode < 100000 || authCode > 999999)
		return res.status(400).send({ reason: "Incorrect auth code" })

	db.findOne({ "authCode.value": authCode })
		.then(user => {
			if (!user)
				return res.status(404).send({ reason: "User not found" })
			
			const { token } = user
			db.update(
				{ "authCode.value": authCode },
				{ $set: { authCode: {} } },
				{}
			)

			return res.send({ token })
		})
		.catch(err => {
			logError(err)
			res.status(500).send({ reason: err })
		})
})

app.post("/message", (req, res) => {
	const { type, token } = req.body

	sendMessage(token, type)
		.then(() => res.send())
		.catch(err => {
			logError(err)
			if (err.code)
				res.status(400).send(err)
			else
				res.status(500).send()
			})
})

const server = app.listen(port, () => {
	log(`HTTP server is started at port ${port}`)
})

process.on("uncaughtException", async err => await server.close())
process.on("SIGTERM", async () => await server.close())
process.on("SIGINT", async () => await server.close())
