import { commitSession, getSession } from '~/session'
import { ACCESS_AUTHENTICATED_USER_EMAIL_HEADER } from './constants'
import { safeRedirect } from './safeReturnUrl'

export async function setUsername(
	username: string,
	request: Request,
	returnUrl: string = '/'
) {
	const session = await getSession(request.headers.get('Cookie'))
	session.set('username', username)
	throw safeRedirect(returnUrl, {
		headers: {
			'Set-Cookie': await commitSession(session),
		},
	})
}

/**
 * Utility for getting the username. In prod, this basically
 * just consists of getting the Cf-Access-Authenticated-User-Email
 * header, but in dev we allow manually setting this via the
 * username query param.
 */
export default async function getUsername(request: Request) {
	const accessUsername = request.headers.get(
		ACCESS_AUTHENTICATED_USER_EMAIL_HEADER
	)
	if (accessUsername) return accessUsername

	const session = await getSession(request.headers.get('Cookie'))
	const sessionUsername = session.get('username')
	if (typeof sessionUsername === 'string') return sessionUsername

	return null
}

export async function getOrCreateViewerUsername(request: Request) {
	const existingUsername = await getUsername(request)
	if (existingUsername) {
		return { username: existingUsername, setCookie: undefined as string | undefined }
	}

	const url = new URL(request.url)
	const viewerMode = url.searchParams.get('viewer') === '1'
	if (!viewerMode) {
		return { username: null, setCookie: undefined as string | undefined }
	}

	const session = await getSession(request.headers.get('Cookie'))
	const generatedUsername = `viewer-${Math.random().toString(36).slice(2, 8)}`
	session.set('username', generatedUsername)

	return {
		username: generatedUsername,
		setCookie: await commitSession(session),
	}
}
