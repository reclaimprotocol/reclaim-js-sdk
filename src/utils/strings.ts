import canonicalize from "canonicalize"

/**
 * Canonically stringifies an object, so that the same object will always
 * produce the same string despite the order of keys
 */
export function canonicalStringify(params: { [key: string]: any } | undefined) {
	if(!params) {
		return ''
	}

	// have to cast as ESM isn't correctly typing this
	return (canonicalize as unknown as ((p: unknown) => string))(params) || ''
}