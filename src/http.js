import { v4 as uuid } from 'uuid'
import { log, error } from "./utils.js"
import { db } from "./db.js"
import { sendMessage } from "./bot.js"
import express from "express"

const app = express()
const port = process.env.PORT ?? 6860

app.use(express.json())

app.get("/token", (req, res) => {
	const token = uuid()
	db.insert({
		id: undefined,
		token,
		local: "en"
	})
	res.send({ token })
})

app.post("/message", (req, res) => {
	const { type, token } = req.body

	sendMessage(token, type)
		.then(() => res.send())
		.catch(err => {
			if (err.code === 0) {
				error(err)
				res.status(500).send()
			} else {
				res.status(400).send(err)
			}
		})
})

app.listen(port, () => {
	log(`HTTP server is started at port ${port}`)
})

