import 'dotenv/config'
import { createApp } from './app.js'

const port = Number(process.env.PORT) || 3001
const app = createApp()

if (!process.env.VERCEL) app.listen(port, () => console.info(`SpendWise API listening on port ${port}.`))

export default app
