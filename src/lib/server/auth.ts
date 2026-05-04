import { createHmac, timingSafeEqual } from "node:crypto"
import type { Cookies } from "@sveltejs/kit"
import { motionConfig } from "$lib/server/config"

const COOKIE = "motion_session"
const TTL = 60 * 60 * 24 * 7

const sign = (value: string) =>
	createHmac("sha256", motionConfig.authToken).update(value).digest("base64url")

function safeEqual(left: string, right: string) {
	const a = Buffer.from(left)
	const b = Buffer.from(right)
	return a.length === b.length && timingSafeEqual(a, b)
}

export const isValidToken = (token: unknown) =>
	typeof token === "string" && safeEqual(token, motionConfig.authToken)

export function setSessionCookie(cookies: Cookies) {
	const exp = String(Math.floor(Date.now() / 1000) + TTL)
	cookies.set(COOKIE, `${exp}.${sign(exp)}`, {
		path: "/",
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		maxAge: TTL,
	})
}

export function isValidSession(cookies: Cookies) {
	const session = cookies.get(COOKIE)
	if (!session) return false

	const [exp, signature, extra] = session.split(".")
	const expiresAt = Number(exp)

	return (
		!extra &&
		Number.isSafeInteger(expiresAt) &&
		expiresAt > Date.now() / 1000 &&
		!!signature &&
		safeEqual(signature, sign(exp))
	)
}
